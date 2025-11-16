// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\frontend\src\app\app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';
import { PublicGuard } from './guards/public-guard';

// This import needs the matching export name
import { tabChildrenRoutes } from './tabs/tabs.routes';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.page').then( m => m.LoginPage),
    canActivate: [PublicGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register.page').then( m => m.RegisterPage),
    canActivate: [PublicGuard]
  },
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: tabChildrenRoutes, // Uses the imported tabChildrenRoutes
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    redirectTo: 'tabs/tab1',
    pathMatch: 'full'
  },
  {
    path: 'recipe-form', // For creating new recipes
    loadComponent: () => import('./pages/recipe-form/recipe-form.page').then( m => m.RecipeFormPage),
    canActivate: [AuthGuard] // Added AuthGuard for recipe creation
  },
  {
    path: 'recipe-form/:id', // For editing existing recipes
    loadComponent: () => import('./pages/recipe-form/recipe-form.page').then( m => m.RecipeFormPage),
    canActivate: [AuthGuard] // Already had AuthGuard
  },
  {
    path: 'recipe-detail/:id',
    loadComponent: () => import('./pages/recipe-detail/recipe-detail.page').then( m => m.RecipeDetailPage),
    canActivate: [AuthGuard] // ADDED: Protect this route
  },
  {
    path: 'user-profile/:id',
    loadComponent: () => import('./pages/user-profile/user-profile.page').then( m => m.UserProfilePage),
    canActivate: [AuthGuard] // Already had AuthGuard
  },
  { // NEW: Cook Mode Route - placed before wildcard
    path: 'cook-recipe/:id',
    loadComponent: () => import('./pages/cook-mode/cook-mode.page').then( m => m.CookModePage),
    canActivate: [AuthGuard] // ADDED: Protect this route
  },
  // Removed 'path: cook-mode' without :id as it seems unintended for the current flow.
  // If you need a /cook-mode route without an ID, you'd add it here with its specific logic.

  { // THIS IS THE WILDCARD ROUTE, IT MUST BE LAST
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];