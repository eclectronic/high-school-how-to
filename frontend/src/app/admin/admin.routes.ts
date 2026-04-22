import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'content', pathMatch: 'full' },
      {
        path: 'content',
        loadComponent: () =>
          import('./content/content-list.component').then((m) => m.ContentListComponent),
      },
      {
        path: 'content/new',
        loadComponent: () =>
          import('./content/content-editor.component').then((m) => m.ContentEditorComponent),
      },
      {
        path: 'content/:id/edit',
        loadComponent: () =>
          import('./content/content-editor.component').then((m) => m.ContentEditorComponent),
      },
      {
        path: 'tags',
        loadComponent: () =>
          import('./tags/tag-manager.component').then((m) => m.TagManagerComponent),
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
    ],
  },
];
