// admin/users/components/create-user-dialog/create-user-dialog.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { NotificationService } from '../../../../services/notification.service';
import { DialogRef } from '../../../../services/dialog.service';

@Component({
  selector: 'app-create-user-dialog',
  templateUrl: './create-user-dialog.component.html',
  styleUrls: ['./create-user-dialog.component.css']
})
export class CreateUserDialogComponent implements OnInit {
  createUserForm!: FormGroup;
  showPassword = false;
  isSubmitting = false;
  dialogRef!: DialogRef;
  
  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.createUserForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8)]],
      fullName: [''],
      role: ['user', Validators.required],
      proctorEnabled: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  submitForm(): void {
    if (this.createUserForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.createUserForm.controls).forEach(key => {
        this.createUserForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;

    const userData = {
      username: this.createUserForm.value.username,
      email: this.createUserForm.value.email,
      password: this.createUserForm.value.password,
      name: this.createUserForm.value.fullName || '',
      role: this.createUserForm.value.role,
      // settings: {
      //   proctorEnabled: this.createUserForm.value.proctorEnabled
      // }
    };

    this.adminService.createUser(userData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.notificationService.showSuccess('User created successfully!');
        this.dialogRef.close(response); 
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error creating user:', error);
        let errorMsg = 'Failed to create user: ';
        
        if (error && error.error.message) {
          errorMsg += error.error.message;
        }
        
        this.notificationService.showError(errorMsg);
      }
  });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}