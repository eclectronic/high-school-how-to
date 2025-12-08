import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AuthenticationResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegistrationRequest,
  ResetPasswordRequest,
  UpdatePasswordRequest,
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

  updatePassword(payload: UpdatePasswordRequest) {
    return this.http.put<void>('/api/users/me/password', payload, {
      observe: 'response'
    });
  }
}
