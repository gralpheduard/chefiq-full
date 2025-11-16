// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const currentUser = this.authService.currentUserValue;

    if (currentUser && currentUser.token) {
      // User has a token, consider them logged in for now
      // (More robust checks would involve validating token expiration,
      // but for this challenge, simple token presence is sufficient).
      return true;
    }

    // If not logged in, redirect to the login page
    this.router.navigate(['/login']);
    return false;
  }
}