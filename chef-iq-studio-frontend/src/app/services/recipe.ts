// src/app/services/recipe.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

// Define interfaces for recipe data structure (matching your backend schema)
export interface Ingredient {
  _id?: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface ApplianceIntegration {
  _id?: string;
  type: string;
  settings?: { [key: string]: any };
  notes?: string;
}

export interface Step {
  _id?: string;
  stepNumber: number;
  description: string;
  photoUrl?: string;
  videoUrl?: string;
  applianceIntegration?: ApplianceIntegration;
}

export interface RecipeMetadata {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  yield: string;
  prepTime?: number;
  cookTime?: number;
  tags?: string[];
}

export interface Recipe {
  _id?: string;
  user: { _id: string; name: string; profileImage?: string; followers?: string[] };
  title: string;
  description: string;
  mainImage?: string;
  metadata: RecipeMetadata;
  ingredients: Ingredient[];
  steps: Step[];
  likes: string[];
  // REMOVE THIS LINE: saves: string[]; // <-- Already removed based on your comment
  comments: any[];
  status: 'published';
  privacy: 'public' | 'friends' | 'followers' | 'private';
  createdAt?: string;
  updatedAt?: string;
  _hasLiked?: boolean;
  _isSaved?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private recipesUrl = `${environment.apiUrl}/recipes`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders() {
    const user = this.authService.currentUserValue;
    if (!user || !user.token) {
      throw new Error('Not authenticated: No token found.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`
    };
  }

  createRecipe(recipeData: Omit<Recipe, '_id' | 'user' | 'likes' | 'comments' | 'status' | 'createdAt' | 'updatedAt' | '_hasLiked' | '_isSaved'>): Observable<Recipe> {
    return this.http.post<Recipe>(this.recipesUrl, recipeData, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<Recipe>('createRecipe'))
    );
  }

  getUserRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.recipesUrl, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<Recipe[]>('getUserRecipes'))
    );
  }

  getPublicRecipes(): Observable<Recipe[]> {
    let headers = {};
    try {
      // Attempt to get headers, but if not authenticated, proceed without them
      headers = this.getAuthHeaders();
    } catch (e) {
      console.warn("Attempting to fetch public recipes without authentication. (This is expected for unauthenticated users)");
      // If not authenticated, still try to fetch public recipes (backend should allow this)
      // Remove Authorization header if not authenticated or if it's invalid.
      // This is a simplified approach, actual backend might need no header for public.
      headers = { 'Content-Type': 'application/json' };
    }

    return this.http.get<Recipe[]>(`${this.recipesUrl}/public`, { headers }).pipe(
      catchError(this.handleError<Recipe[]>('getPublicRecipes'))
    );
  }

  // NEW: Search for recipes by title, ingredients, or chef
  searchRecipes(query: string): Observable<Recipe[]> {
    let headers = {};
    try {
      headers = this.getAuthHeaders();
    } catch (e) {
      console.warn("Attempting to search recipes without authentication. (This is expected for unauthenticated users)");
      headers = { 'Content-Type': 'application/json' };
    }
    // Assuming your backend has an endpoint like /recipes/search?q=
    return this.http.get<Recipe[]>(`${this.recipesUrl}/search?q=${query}`, { headers }).pipe(
      catchError(this.handleError<Recipe[]>('searchRecipes'))
    );
  }

  getRecipeById(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.recipesUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<Recipe>('getRecipeById'))
    );
  }

  updateRecipe(id: string, recipeData: Partial<Omit<Recipe, 'user' | 'likes' | 'comments' | 'status' | 'createdAt' | 'updatedAt' | '_hasLiked' | '_isSaved'>>): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.recipesUrl}/${id}`, recipeData, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<Recipe>('updateRecipe'))
    );
  }

  deleteRecipe(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.recipesUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<{ message: string }>('deleteRecipe'))
    );
  }

  toggleLike(recipeId: string): Observable<{ message: string, likesCount: number }> {
    return this.http.patch<{ message: string, likesCount: number }>(
      `${this.recipesUrl}/${recipeId}/like`, {}, { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError<{ message: string, likesCount: number }>('toggleLike'))
    );
  }

  toggleSave(recipeId: string): Observable<{ message: string, saved: boolean }> {
    return this.http.patch<{ message: string, saved: boolean }>(
      `${this.recipesUrl}/${recipeId}/save`, {}, { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError<{ message: string, saved: boolean }>('toggleSave'))
    );
  }

  // NEW: Get recipes saved by the current user
  getSavedRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${this.recipesUrl}/saved`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<Recipe[]>('getSavedRecipes'))
    );
  }

  // NEW: Get recipes liked by the current user
  getLikedRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${this.recipesUrl}/liked`, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<Recipe[]>('getLikedRecipes'))
    );
  }


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