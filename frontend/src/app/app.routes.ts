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
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

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
    loadComponent: () =>
      import('./pages/account/account-security/account-security.component').then(
        (m) => m.AccountSecurityComponent,
      ),
  },
  {
    path: 'account/locker',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/account/locker/locker.component').then((m) => m.LockerComponent),
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
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'topics/:slug',
    loadComponent: () =>
      import('./pages/topic/topic-page.component').then((m) => m.TopicPageComponent),
  },
  {
    path: 'content/:slug',
    loadComponent: () =>
      import('./pages/content-viewer/content-viewer.component').then(
        (m) => m.ContentViewerComponent,
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/content-viewer/content-viewer.component').then(
        (m) => m.ContentViewerComponent,
      ),
    data: { slug: 'my-mission', forceSimpleLayout: true },
  },
  {
    path: '**',
    redirectTo: ''
  }
];
