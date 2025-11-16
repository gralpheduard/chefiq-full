import { Routes } from '@angular/router';

export const tabChildrenRoutes: Routes = [ // <--- This line is critical
  {
    path: 'tab1',
    loadComponent: () =>
      import('../tab1/tab1.page').then((m) => m.Tab1Page),
  },
  {
    path: 'tab2',
    loadComponent: () =>
      import('../tab2/tab2.page').then((m) => m.Tab2Page),
  },
    {
    path: 'tabai',
    loadComponent: () =>
      import('../tab-ai/tab-ai.page').then((m) => m.tabAiPage),
  },
  {
    path: 'tab3',
    loadComponent: () =>
      import('../tab3/tab3.page').then((m) => m.Tab3Page),
  },
  {
    path: 'tab4',
    loadComponent: () =>
      import('../tab4/tab4.page').then((m) => m.Tab4Page),
  },
  {
    path: '',
    redirectTo: 'tab1',
    pathMatch: 'full',
  },
];