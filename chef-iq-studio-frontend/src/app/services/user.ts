// src/app/services/user.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';
import { Recipe } from './recipe'; // <-- Import Recipe interface

// Interface for a simplified user object for lists (updated)
export interface SimpleUser {
  _id: string;
  name: string;
  email?: string; // Optional, might not be returned by some endpoints
  profileImage?: string; // Profile image URL
  followersCount?: number;
  followingCount?: number;
  recipeCount?: number;
  isFollowing?: boolean; // Crucial property for UI state
}

// Interface for the response when updating profile image
interface ProfileImageUpdateResponse {
  _id: string;
  name: string;
  email: string;
  profileImage: string; // The new profile image URL
  message: string;
}

// Interface for the toggleFollow response (to ensure type safety)
interface ToggleFollowResponse {
  message: string;
  status: 'followed' | 'unfollowed';
  targetUserFollowersCount: number;
  isFollowing: boolean; // Indicates the new following status
}


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersUrl = `${environment.apiUrl}/users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(contentType: string | null = 'application/json') {
    const user = this.authService.currentUserValue;
    if (!user || !user.token) {
      throw new Error('Not authenticated: No token found. Please log in.');
    }
    const headers: { [key: string]: string } = {
      'Authorization': `Bearer ${user.token}`
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  // Get a specific user's profile (including counts)
  getUserProfile(userId: string): Observable<SimpleUser> {
    const headers = this.getAuthHeaders();
    return this.http.get<SimpleUser>(`${this.usersUrl}/${userId}`, { headers }).pipe(
      catchError(this.handleError<SimpleUser>('getUserProfile'))
    );
  }

  // Get users that a specific user is following
  getUserFollowing(userId: string): Observable<SimpleUser[]> {
    return this.http.get<SimpleUser[]>(`${this.usersUrl}/${userId}/following`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<SimpleUser[]>('getUserFollowing'))
    );
  }

  // Get users who are following a specific user
  getUserFollowers(userId: string): Observable<SimpleUser[]> {
    return this.http.get<SimpleUser[]>(`${this.usersUrl}/${userId}/followers`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<SimpleUser[]>('getUserFollowers'))
    );
  }

  // Toggle follow/unfollow for a user
  toggleFollow(targetUserId: string): Observable<ToggleFollowResponse> { // Using the new interface for clarity
    return this.http.patch<ToggleFollowResponse>( // Ensure this matches the expected backend response
      `${this.usersUrl}/${targetUserId}/follow`, {}, { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError<ToggleFollowResponse>('toggleFollow'))
    );
  }

  // Search for users by name or email
  searchUsers(query: string): Observable<SimpleUser[]> {
    return this.http.get<SimpleUser[]>(`${this.usersUrl}/search?q=${query}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<SimpleUser[]>('searchUsers'))
    );
  }

  // Get users sorted by follower count (most following first)
  getTopFollowedUsers(): Observable<SimpleUser[]> {
    return this.http.get<SimpleUser[]>(`${this.usersUrl}/top-followed`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<SimpleUser[]>('getTopFollowedUsers'))
    );
  }

  // Get recipes for a specific user, filtered by privacy
  getRecipesForUser(userId: string): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${this.usersUrl}/${userId}/recipes`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<Recipe[]>('getRecipesForUser'))
    );
  }

  // Method to update the user's profile image
  updateProfileImage(file: File): Observable<ProfileImageUpdateResponse> {
    const formData = new FormData();
    formData.append('image', file, file.name);

    return this.http.put<ProfileImageUpdateResponse>(
      `${this.usersUrl}/profile/image`,
      formData,
      { headers: this.getAuthHeaders(null) }
    ).pipe(
      catchError(this.handleError<ProfileImageUpdateResponse>('updateProfileImage'))
    );
  }

  // Helper for error handling
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);
      let errorMessage = 'An unknown error occurred.';
      if (error.error instanceof ErrorEvent) {
        errorMessage = `Client-side Error: ${error.error.message}`;
      } else if (error.error && typeof error.error === 'object' && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.status) {
        errorMessage = `Server Error (${error.status}): ${error.message}`;
      }
      return throwError(() => new Error(errorMessage));
    };
  }
}