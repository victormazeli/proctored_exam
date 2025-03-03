// admin/users/components/role-change-dialog/role-change-dialog.component.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../../services/admin.service';
import { NotificationService } from '../../../../services/notification.service';
import { DialogRef } from '../../../../services/dialog.service';

@Component({
  selector: 'app-role-change-dialog',
  templateUrl: './role-change-dialog.component.html',
  styleUrls: ['./role-change-dialog.component.css']
})
export class RoleChangeDialogComponent implements OnInit {
  dialogRef!: DialogRef;
  data: any; // Injected by dialog service
  
  userId!: string;
  userName!: string;
  newRole!: string;
  isSubmitting = false;
  
  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.userId = this.data.userId;
      this.userName = this.data.userName;
      this.newRole = this.data.newRole;
    }
  }

  changeRole(): void {
    if (!this.userId || !this.newRole) {
      return;
    }
    
    this.isSubmitting = true;
    
    this.adminService.changeUserRole(this.userId, this.newRole).subscribe({
     next: (response) => {
      console.log(response)
        this.isSubmitting = false;
        this.notificationService.showSuccess(`User ${this.userName} role updated successfully`);
        this.dialogRef.close(true); // Return true to indicate successful update
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error changing user role:', error);
        this.notificationService.showError('Failed to update user role');
        this.dialogRef.close(false); 
      }
  });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}