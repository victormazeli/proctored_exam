import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  showPassword: boolean = false;
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  returnUrl: string = '/portal/exams/select';
  

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
        this.loginForm = this.formBuilder.group({
          email: ['', [Validators.required, Validators.email]],
          password: ['', Validators.required],
          rememberMe: [false]
        });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl']  || this.returnUrl
    });

    // If already logged in, redirect to return URL
    if (this.authService.isAuthenticated()) {
      console.log(this.authService.isAuthenticated())
      this.router.navigate([this.returnUrl]);
    }
  }

  // Convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.f['email'].value, this.f['password'].value)
      .subscribe({
        next: (response) => {
          if (response.success == true) {
            this.router.navigate([this.returnUrl]);
            // this.notificationService.showSuccess('Login Successful');
          } else {
            this.notificationService.showError(String(response.message));
            this.loading = false;
          }
        }
      });
  }
}
