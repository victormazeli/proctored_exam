// auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get the auth token from the service
    const token = this.authService.getToken();

    // Clone the request and add the authorization header
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: token
        }
      });
    }

    // Handle the request and check for 401 Unauthorized responses
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Auto logout if 401 response returned from api
          const isAdminRoute = this.router.url.startsWith('/admin');
          this.authService.logout();
          
          const loginRoute = isAdminRoute ? '/auth/admin/login' : '/auth/login';
          this.router.navigate([loginRoute], {
            queryParams: { returnUrl: this.router.url }
          });
        }
        return throwError(() => error);
      })
    );
  }
}