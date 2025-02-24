import { Component } from '@angular/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  termsAccepted: boolean = false;

  onSubmit() {
    console.log('Registering with:', { username: this.username, email: this.email, password: this.password, confirmPassword: this.confirmPassword, termsAccepted: this.termsAccepted });
  }
}
