// admin-login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-admin-login',
  templateUrl:  './auth.component.html'
})
export class AdminLoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  errorMessage: string = '';
  returnUrl: string = '/admin/dashboard';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit() {
    console.log('AdminLoginComponent initialized');
    this.route.queryParams.subscribe(params => {
      console.log('Query params updated:', params);
      this.returnUrl = params['returnUrl'] || this.returnUrl;
      console.log('Updated returnUrl to:', this.returnUrl);
    });

    console.log(this.authService.isAuthenticated())
      
    // If already logged in, redirect to return URL
    if (this.authService.isAuthenticated() && this.authService.hasAdminRole()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  // Convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit() {
    console.log('Login form submitted');
    this.submitted = true;
    this.errorMessage = '';

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.f['email'].value, this.f['password'].value)
      .subscribe({
        next: (response) => {
          // Check if user has admin role
          if (this.authService.hasAdminRole()) {
            this.router.navigate([this.returnUrl]);
          } else {
            this.errorMessage = response.message || 'You don\'t have permission to access the admin area';
            // this.authService.logout(true);
            this.loading = false;
          }
        }
      });
  }
}