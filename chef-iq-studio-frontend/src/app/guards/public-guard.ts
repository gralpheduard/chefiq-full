// src/app/guards/public.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class PublicGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    // If user is already logged in, redirect them to the dashboard
    if (this.authService.currentUserValue) {
      this.router.navigate(['/dashboard']);
      return false; // Prevent access to the current (login/register) route
    }
    return true; // Allow access to the route (user is not logged in)
  }
}