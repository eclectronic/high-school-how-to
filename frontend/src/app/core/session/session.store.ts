import { Injectable, computed, signal } from '@angular/core';
import { AuthenticationResponse } from '../models/auth.models';

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  avatarUrl: string | null;
  firstName: string | null;
  role: string | null;
}

const STORAGE_KEY = 'hsht.session';

@Injectable({
  providedIn: 'root'
})
export class SessionStore {
  private readonly state = signal<SessionState>({
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    avatarUrl: null,
    firstName: null,
    role: null,
  });

  readonly isAuthenticated = computed(() => {
    const snapshot = this.state();
    if (snapshot.accessToken && !this.isExpired(snapshot)) return true;
    // Refresh token present means the server still considers the user authenticated;
    // the interceptor will transparently obtain a new access token on the next request.
    return Boolean(snapshot.refreshToken);
  });

  readonly avatarUrl = computed(() => this.state().avatarUrl);
  readonly firstName = computed(() => this.state().firstName);

  readonly isAdmin = computed(() => {
    const snapshot = this.state();
    const hasLiveToken = Boolean(snapshot.accessToken && !this.isExpired(snapshot));
    const hasSession = hasLiveToken || Boolean(snapshot.refreshToken);
    if (!hasSession) return false;
    // Prefer role decoded from the live JWT; fall back to the cached role for
    // remember-me sessions that haven't refreshed yet on this page load.
    const role = hasLiveToken ? this.decodeRole(snapshot.accessToken!) : snapshot.role;
    return role === 'ADMIN';
  });

  constructor() {
    this.hydrate();
  }

  setSession(response: AuthenticationResponse) {
    const expiresAt = Date.now() + response.expiresIn * 1000;
    const next: SessionState = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken ?? null,
      expiresAt,
      avatarUrl: response.avatarUrl ?? null,
      firstName: response.firstName ?? null,
      role: this.decodeRole(response.accessToken),
    };
    this.state.set(next);

    if (typeof window === 'undefined') return;

    if (next.refreshToken) {
      // Remember-Me: persist in localStorage, clear sessionStorage
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      // Session-only: persist in sessionStorage, clear localStorage
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }

  clearSession() {
    this.state.set({ accessToken: null, refreshToken: null, expiresAt: null, avatarUrl: null, firstName: null, role: null });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  getAccessToken(): string | null {
    const snapshot = this.state();
    if (!snapshot.accessToken) {
      return null;
    }
    if (this.isExpired(snapshot)) {
      // Keep refresh token so we can recover the session via refresh flow.
      this.state.update(current => ({ ...current, accessToken: null, expiresAt: null }));
      this.persistCurrent();
      return null;
    }
    return snapshot.accessToken;
  }

  getRefreshToken(): string | null {
    return this.state().refreshToken;
  }

  private hydrate() {
    if (typeof window === 'undefined') {
      return;
    }
    // localStorage takes priority (Remember-Me session)
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as SessionState;
      if (parsed.accessToken && !this.isExpired(parsed)) {
        this.state.set(parsed);
      } else if (parsed.refreshToken) {
        this.state.set({ accessToken: null, refreshToken: parsed.refreshToken, expiresAt: null, avatarUrl: parsed.avatarUrl ?? null, firstName: parsed.firstName ?? null, role: parsed.role ?? null });
        this.persistCurrent();
      } else {
        this.clearSession();
      }
    } catch {
      this.clearSession();
    }
  }

  private persistCurrent() {
    if (typeof window === 'undefined') return;
    const current = this.state();
    if (current.refreshToken) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  }

  private isExpired(state: SessionState) {
    return typeof state.expiresAt === 'number' && state.expiresAt <= Date.now();
  }

  private decodeRole(token: string): string | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded['role'] ?? null;
    } catch {
      return null;
    }
  }
}
