import { Injectable, computed, signal } from '@angular/core';
import { AuthenticationResponse } from '../models/auth.models';

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

const STORAGE_KEY = 'hsht.session';

@Injectable({
  providedIn: 'root'
})
export class SessionStore {
  private readonly state = signal<SessionState>({
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  });

  readonly isAuthenticated = computed(() => {
    const snapshot = this.state();
    return Boolean(snapshot.accessToken && !this.isExpired(snapshot));
  });

  constructor() {
    this.hydrate();
  }

  setSession(response: AuthenticationResponse) {
    const expiresAt = Date.now() + response.expiresIn * 1000;
    const next: SessionState = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt
    };
    this.state.set(next);
    this.persist(next);
  }

  clearSession() {
    this.state.set({ accessToken: null, refreshToken: null, expiresAt: null });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  getAccessToken(): string | null {
    const snapshot = this.state();
    if (!snapshot.accessToken || this.isExpired(snapshot)) {
      if (snapshot.accessToken) {
        this.clearSession();
      }
      return null;
    }
    return snapshot.accessToken;
  }

  private hydrate() {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as SessionState;
      if (parsed.accessToken && !this.isExpired(parsed)) {
        this.state.set(parsed);
      } else {
        this.clearSession();
      }
    } catch {
      this.clearSession();
    }
  }

  private persist(state: SessionState) {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private isExpired(state: SessionState) {
    return typeof state.expiresAt === 'number' && state.expiresAt <= Date.now();
  }
}
