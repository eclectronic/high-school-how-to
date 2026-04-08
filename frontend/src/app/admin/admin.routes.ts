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
        path: 'badges',
        loadComponent: () =>
          import('./badges/badge-manager.component').then((m) => m.BadgeManagerComponent),
      },
    ],
  },
];
