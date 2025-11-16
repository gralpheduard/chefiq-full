// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Define interfaces for better type safety
export interface AuthResponse { // Renamed from interface AuthResponse to export interface AuthResponse
  _id: string;
  name: string;
  email: string;
  token: string;
  profileImage?: string; // <-- ADDED: Profile Image URL
}

export  interface UserProfile {
  _id: string;
  name: string;
  email: string;
  profileImage?: string; // <-- ADDED: Profile Image URL
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = `${environment.apiUrl}/auth`;
  private userSubject: BehaviorSubject<AuthResponse | null>;
  public user: Observable<AuthResponse | null>;

  constructor(private http: HttpClient) {
    // Initialize user from local storage if available
    const storedUser = localStorage.getItem('user');
    this.userSubject = new BehaviorSubject<AuthResponse | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.user = this.userSubject.asObservable();
  }

  public get currentUserValue(): AuthResponse | null {
    return this.userSubject.value;
  }

  // NEW: Method to update the current user's state manually
  public updateCurrentUser(user: AuthResponse | null): void {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
    } else {
      this.logout(); // If null is passed, effectively log out
    }
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/register`, userData).pipe(
      tap(response => {
        // If you want to automatically log in after registration and store token
        // if (response.token) {
        //   localStorage.setItem('user', JSON.stringify(response));
        //   this.userSubject.next(response);
        // }
      }),
      catchError(this.handleError<AuthResponse>('register'))
    );
  }

  login(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, userData).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('user', JSON.stringify(response));
          this.userSubject.next(response);
        }
      }),
      catchError(this.handleError<AuthResponse>('login'))
    );
  }

  logout(): void {
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  getMe(): Observable<UserProfile> {
    const user = this.currentUserValue;
    if (!user || !user.token) {
      // If no token, immediately return an error observable
      return throwError(() => new Error('Not authenticated: No token found.'));
    }
    const headers = { 'Authorization': `Bearer ${user.token}` };
    // The backend `getMe` endpoint currently only returns _id, name, email.
    // If you want profileImage here, you'd need to modify the backend authController.js `getMe` to include it.
    // For now, we'll assume the `profileImage` is handled by `userService.getUserProfile`
    return this.http.get<UserProfile>(`${this.authUrl}/me`, { headers }).pipe(
        catchError(this.handleError<UserProfile>('getMe'))
    );
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);

      let errorMessage = 'An unknown error occurred.';
      if (error.error instanceof ErrorEvent) {
        // Client-side errors
        errorMessage = `Error: ${error.error.message}`;
      } else if (error.error && typeof error.error === 'object' && error.error.message) {
        // Backend-sent error message (e.g., from your Express app)
        errorMessage = error.error.message;
      } else if (error.status) {
        // Server-side errors with status code
        errorMessage = `Server Error (${error.status}): ${error.message}`;
      }

      // Re-throw the error as a new Error object to be caught by component
      return throwError(() => new Error(errorMessage));
    };
  }
}