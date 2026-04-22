import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AuthenticationResponse,
  ForgotPasswordRequest,
  GoogleSignInRequest,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegistrationRequest,
  ResetPasswordRequest,
  UpdatePasswordRequest,
  UserProfile,
  VerificationResponse
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(payload: LoginRequest) {
    return this.http.post<AuthenticationResponse>('/api/auth/login', payload);
  }

  refresh(payload: RefreshRequest) {
    return this.http.post<AuthenticationResponse>('/api/auth/refresh', payload);
  }

  register(payload: RegistrationRequest) {
    return this.http.post<void>('/api/auth/register', payload, {
      observe: 'response'
    });
  }

  forgotPassword(payload: ForgotPasswordRequest) {
    return this.http.post<void>('/api/auth/forgot-password', payload, {
      observe: 'response'
    });
  }

  resetPassword(payload: ResetPasswordRequest) {
    return this.http.post<void>('/api/auth/reset-password', payload, {
      observe: 'response'
    });
  }

  verifyEmail(token: string) {
    const params = new HttpParams().set('token', token);
    return this.http.get<VerificationResponse>('/api/auth/verify-email', { params });
  }

  googleSignIn(payload: GoogleSignInRequest) {
    return this.http.post<AuthenticationResponse>('/api/auth/google', payload);
  }

  logout(payload: LogoutRequest) {
    return this.http.post<void>('/api/auth/logout', payload, { observe: 'response' });
  }

  getProfile() {
    return this.http.get<UserProfile>('/api/users/me');
  }

  updatePassword(payload: UpdatePasswordRequest) {
    return this.http.put<void>('/api/users/me/password', payload, {
      observe: 'response'
    });
  }
}
