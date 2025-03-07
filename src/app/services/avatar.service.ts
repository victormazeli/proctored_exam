// shared/services/avatar.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
// import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private apiUrl = `localhost:3000/users`;

  constructor(private http: HttpClient) {}

  /**
   * Upload a user avatar
   */
  uploadAvatar(userId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post(`${this.apiUrl}/${userId}/avatar`, formData).pipe(
      catchError(error => {
        console.error('Error uploading avatar:', error);
        return of({ success: false, error: 'Failed to upload avatar' });
      })
    );
  }

  /**
   * Remove a user's avatar
   */
  removeAvatar(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${userId}/avatar`).pipe(
      catchError(error => {
        console.error('Error removing avatar:', error);
        return of({ success: false, error: 'Failed to remove avatar' });
      })
    );
  }

  /**
   * Get avatar URL for a user
   * This appends a timestamp to prevent caching when avatar is updated
   */
  getAvatarUrl(userId: string): string {
    if (!userId) return '';
    const timestamp = new Date().getTime();
    return `${this.apiUrl}/users/${userId}/avatar?t=${timestamp}`;
  }

  /**
   * Generate initials for a user based on their name or username
   */
  generateInitials(name: string | null | undefined, username: string | null | undefined): string {
    if (name && name.trim() !== '') {
      // Try to get initials from full name (first letter of first name and last name)
      const nameParts = name.split(' ').filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      } else {
        return name.substring(0, 2).toUpperCase();
      }
    } else if (username) {
      // Fallback to first two letters of username
      return username.substring(0, 2).toUpperCase();
    } else {
      return '??';
    }
  }
}