export interface AuthenticationResponse {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  avatarUrl?: string | null;
  firstName?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface GoogleSignInRequest {
  idToken: string;
  nonce: string;
  rememberMe: boolean;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RegistrationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerificationResponse {
  message: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  googleLinked: boolean;
  hasPassword: boolean;
}
