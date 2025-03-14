import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], { 
    queryParams: { returnUrl: state.url }
  });
};


export const adminAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  if (authService.isAuthenticated() && authService.hasAdminRole()) {
    // Logged in as admin, so return true
    return true;
  }

  return router.createUrlTree(['/auth/admin/login'], { 
    queryParams: { returnUrl: state.url }
  });
};