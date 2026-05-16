import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'topics', pathMatch: 'full' },
      { path: 'tags', redirectTo: 'topics', pathMatch: 'full' },
      {
        path: 'topics',
        loadComponent: () =>
          import('./topics/topic-manager.component').then((m) => m.TopicManagerComponent),
      },
      {
        path: 'quotes',
        loadComponent: () =>
          import('./quote-library/quote-library.component').then(
            (m) => m.QuoteLibraryComponent,
          ),
      },
      {
        path: 'badges',
        loadComponent: () =>
          import('./badges/badge-manager.component').then((m) => m.BadgeManagerComponent),
      },
      {
        path: 'color-palette',
        loadComponent: () =>
          import('./color-palette/color-palette-editor.component').then(
            (m) => m.ColorPaletteEditorComponent,
          ),
      },
      {
        path: 'recommended-pins',
        loadComponent: () =>
          import('./recommended-pins/recommended-pins.component').then(
            (m) => m.RecommendedPinsComponent,
          ),
      },
      { path: 'media', redirectTo: 'images', pathMatch: 'full' },
      {
        path: 'images',
        loadComponent: () =>
          import('./images/image-library.component').then((m) => m.ImageLibraryComponent),
      },
    ],
  },
];
