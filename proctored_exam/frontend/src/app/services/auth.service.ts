// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthResponse, User } from '../models/auth.interface';
import { environment } from 'src/environment/environment';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = `${environment.api}/api` || 'http://localhost:3000/api';

  authResponse: AuthResponse = {
      success: false,
      token: '',
      user: {
          id: '',
          email: '',
          role: '',
          profile: {
              name: '',
              avatar: ''
          },
          settings: undefined
      },
      message: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        map(response => {
          if (response && response.token) {
            const user: User = {
              id: response.user.id,
              email: response.user.email,
              role: response.user.role,
              name: response.user.profile.name,
              token: response.token,
              avatar: response.user.profile.avatar
            };
            
            // Store user details and JWT token in local storage
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSubject.next(user);
          }
          return response;
        }),
        catchError(error => {
          console.error('Login error:', error);
        //   return throwError(() => error);
        this.authResponse.message = error.error.message
        return of(this.authResponse);
        })
      );
  }

  logout(isAdmin: boolean = false): void {
    // Remove user from local storage and set current user to null
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
   if(isAdmin){
    this.router.navigate(['/auth/admin/login']);
   }else {
    this.router.navigate(['/auth/login']);
   }
  }

  isAuthenticated(): boolean {
    const currentUser = this.currentUserValue;
    if (!currentUser) {
      return false;
    }
    
    // Check if token exists
    return !!currentUser.token;
  }

  hasAdminRole(): boolean {
    const currentUser = this.currentUserValue;
    if (!currentUser) {
      return false;
    }
    
    // Check if user has admin role
    return currentUser.role === 'admin';
  }

  getToken(): string | null {
    const currentUser = this.currentUserValue;
    return currentUser ? currentUser.token : null;
  }

  // Method for updating user profile
  updateProfile(userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/profile`, userData)
      .pipe(
        tap((response: any) => {
          if (response.success && this.currentUserValue) {
            // Update stored user data if necessary
            const user = { ...this.currentUserValue };
            if (userData.name) {
              user.name = userData.name;
            }
            if (userData.email) {
              user.email = userData.email;
            }
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSubject.next(user);
          }
          return response;
        })
      );
  }

  // Password reset request
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  // Reset password with token
  resetPassword(token: string, password: string, confirmPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password/${token}`, { 
      password, 
      confirmPassword 
    });
  }
}