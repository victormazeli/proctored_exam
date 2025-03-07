import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  rememberMe: boolean = false;
  studentId: string = '';
  showPassword: boolean = false;

  onSubmit() {
    console.log('Logging in with:', { username: this.username, password: this.password, rememberMe: this.rememberMe });
  }
}
