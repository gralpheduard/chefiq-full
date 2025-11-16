// src/app/services/upload.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

interface UploadResponse {
  message: string;
  imageUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private uploadUrl = `${environment.apiUrl}/upload`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getAuthHeaders() {
    const user = this.authService.currentUserValue;
    if (!user || !user.token) {
      throw new Error('Not authenticated: No token found.');
    }
    return {
      'Authorization': `Bearer ${user.token}`
    };
  }

  uploadImage(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('image', file, file.name); // 'image' is the field name expected by Multer

    // HttpClient will automatically set the 'Content-Type' header to 'multipart/form-data'
    // when a FormData object is provided as the body.
    return this.http.post<UploadResponse>(this.uploadUrl, formData, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError<UploadResponse>('uploadImage'))
    );
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);

      let errorMessage = 'An unknown error occurred.';
      if (error.error instanceof ErrorEvent) {
        errorMessage = `Client-side Error: ${error.error.message}`;
      } else if (error.error && typeof error.error === 'object' && error.error.message) {
        errorMessage = error.error.message; // From backend's thrown error
      } else if (error.status) {
        errorMessage = `Server Error (${error.status}): ${error.message}`;
      }

      return throwError(() => new Error(errorMessage));
    };
  }
}