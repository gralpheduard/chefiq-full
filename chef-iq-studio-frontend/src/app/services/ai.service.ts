// src/app/services/ai.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth'; // Assuming authService is needed for protected routes

// --- Interfaces for AI Backend Data ---

export interface ChefIQCooker {
  _id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// *** MODIFICATION START ***
// Updated IngredientInput to reflect backend's strict requirements: quantity as number, unit as required string
export interface IngredientInput {
  name: string;
  quantity: number; // Now a number
  unit: string;     // Now a required string
}

export interface ValidatedIngredientResponse {
  name: string;
  isFood: boolean;
  source: 'database_canonical' | 'database_synonym' | 'ai_new_entry' | 'unknown';
  reason?: string; // Provided if not food, from AI
}

// Updated AIRecipeIngredient to reflect backend's strict requirements
export interface AIRecipeIngredient {
  name: string;
  quantity: number; // Now a number
  unit: string;     // Now a required string
}
// *** MODIFICATION END ***


export interface AIRecipeStep {
  stepNumber: number;
  description: string;
}

export interface AIRecipeMetadata {
  prepTime?: string;
  cookTime?: string;
  yield?: string;
  difficulty?: string;
  cuisine?: string;
  tags?: string[];
  aiGenerated?: boolean; // Custom flag from backend
  aiSourceId?: string;   // Custom flag from backend
}

export interface AIRecipe {
  _id: string;
  generated_by_user?: string;
  chef_iq_cooker: ChefIQCooker; // Populated cooker object
  cooking_intent: 'Only These Ingredients' | 'Including These Ingredients';
  user_provided_ingredients: IngredientInput[]; // This also needs to be updated to new IngredientInput interface
  title: string;
  description: string;
  mainImage: string; // Will be empty string
  metadata: AIRecipeMetadata;
  ingredients: AIRecipeIngredient[]; // Full list of recipe ingredients
  steps: AIRecipeStep[];
  why_this_recipe?: string;
  shopping_list_suggestions?: AIRecipeIngredient[]; // Only for "Including These" intent
  createdAt: string;
  updatedAt: string;
}

export interface AIRecipeFeedback {
  _id?: string;
  ai_recipe: string; // ID of the AI recipe
  user?: string;      // ID of the user (if authenticated)
  rating: number;     // 0-5 scale, or 0/1 for thumbs
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}

// --- AI Service Definition ---

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private aiUrl = `${environment.apiUrl}/ai`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(contentType: string = 'application/json') {
    const user = this.authService.currentUserValue;
    if (!user || !user.token) {
      throw new Error('Not authenticated: No token found. Please log in.');
    }
    return {
      'Content-Type': contentType,
      'Authorization': `Bearer ${user.token}`
    };
  }

  private getPublicHeaders(contentType: string = 'application/json') {
    return { 'Content-Type': contentType };
  }

  getChefIQCookers(): Observable<ChefIQCooker[]> {
    return this.http.get<ChefIQCooker[]>(`${this.aiUrl}/cookers`, { headers: this.getPublicHeaders() }).pipe(
      catchError(this.handleError<ChefIQCooker[]>('getChefIQCookers'))
    );
  }

  validateIngredient(name: string): Observable<ValidatedIngredientResponse> {
    return this.http.post<ValidatedIngredientResponse>(`${this.aiUrl}/ingredients/validate`, { name }, { headers: this.getPublicHeaders() }).pipe(
      catchError(this.handleError<ValidatedIngredientResponse>('validateIngredient'))
    );
  }

  generateAIRecipe(cookerId: string, ingredients: IngredientInput[], cookingIntent: 'Only These Ingredients' | 'Including These Ingredients', optionalTime?: string): Observable<AIRecipe> {
    const payload = { cookerId, ingredients, cookingIntent, optionalTime };
    return this.http.post<AIRecipe>(`${this.aiUrl}/recipes/generate`, payload, { headers: this.getPublicHeaders() }).pipe(
      catchError(this.handleError<AIRecipe>('generateAIRecipe'))
    );
  }

  getAIRecipeById(id: string): Observable<AIRecipe> {
    return this.http.get<AIRecipe>(`${this.aiUrl}/recipes/${id}`, { headers: this.getPublicHeaders() }).pipe(
      catchError(this.handleError<AIRecipe>('getAIRecipeById'))
    );
  }

  saveAIRecipeToUserCollection(aiRecipeId: string): Observable<{ message: string, recipe: any }> {
    return this.http.post<{ message: string, recipe: any }>(`${this.aiUrl}/recipes/${aiRecipeId}/save`, {}, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<{ message: string, recipe: any }>('saveAIRecipeToUserCollection'))
    );
  }

  submitAIRecipeFeedback(aiRecipeId: string, rating: number, comments?: string): Observable<{ message: string, feedback: AIRecipeFeedback }> {
    const payload = { rating, comments };
    // This endpoint can be public or private, adjust headers as per backend config
    return this.http.post<{ message: string, feedback: AIRecipeFeedback }>(`${this.aiUrl}/recipes/${aiRecipeId}/feedback`, payload, { headers: this.getPublicHeaders() }).pipe(
      catchError(this.handleError<{ message: string, feedback: AIRecipeFeedback }>('submitAIRecipeFeedback'))
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

      // Re-throw the error as a new Error object to be caught by component
      return throwError(() => new Error(errorMessage));
    };
  }
}