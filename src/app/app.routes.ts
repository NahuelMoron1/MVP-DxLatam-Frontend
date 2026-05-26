import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./pages/campaigns/campaigns.component').then(
            (m) => m.CampaignsComponent,
          ),
      },
      {
        path: 'campaigns/:id',
        loadComponent: () =>
          import('./pages/canvas/canvas.component').then(
            (m) => m.CanvasComponent,
          ),
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./pages/contacts/contacts.component').then(
            (m) => m.ContactsComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'campaigns' },
];
