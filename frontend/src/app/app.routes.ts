import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { InfographicViewerComponent } from './pages/infographic-viewer/infographic-viewer.component';
import { YoutubeViewerComponent } from './pages/youtube-viewer/youtube-viewer.component';
import { AuthShellComponent } from './pages/auth/auth-shell/auth-shell.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { SignupComponent } from './pages/auth/signup/signup.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { VerifyEmailComponent } from './pages/auth/verify-email/verify-email.component';
import { AccountSecurityComponent } from './pages/account/account-security/account-security.component';
import { DashboardComponent } from './pages/account/dashboard/dashboard.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent
  },
  {
    path: 'auth',
    component: AuthShellComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'signup', component: SignupComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'reset-password', component: ResetPasswordComponent },
      { path: 'verify-email', component: VerifyEmailComponent },
      { path: '', pathMatch: 'full', redirectTo: 'login' }
    ]
  },
  {
    path: 'account/security',
    canActivate: [authGuard],
    component: AccountSecurityComponent
  },
  {
    path: 'account/dashboard',
    canActivate: [authGuard],
    component: DashboardComponent
  },
  {
    path: 'infographics/:slug',
    component: InfographicViewerComponent
  },
  {
    path: 'videos/:slug',
    component: YoutubeViewerComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
