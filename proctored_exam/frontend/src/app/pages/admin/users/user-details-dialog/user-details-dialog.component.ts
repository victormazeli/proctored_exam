// admin/users/components/user-details-dialog/user-details-dialog.component.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../../services/admin.service';
import { AvatarService } from '../../../../services/avatar.service';
import { NotificationService } from '../../../../services/notification.service';
import { DialogRef } from '../../../../services/dialog.service';

@Component({
  selector: 'app-user-details-dialog',
  templateUrl: './user-details-dialog.component.html',
  styleUrls: ['./user-details-dialog.component.css']
})
export class UserDetailsDialogComponent implements OnInit {
  data: any; // This will be injected by the dialog service
  dialogRef!: DialogRef;
  
  selectedUser: any = null;
  userLoading = false;
  showAvatarDialog = false;
  isCurrentUserAdmin = true; // This would typically be determined by auth service
  
  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    public avatarService: AvatarService
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.userId) {
      this.loadUserDetails(this.data.userId);
    }
  }

  loadUserDetails(userId: string): void {
    this.userLoading = true;
    
    this.adminService.getUserDetails(userId).subscribe({
      next: (response) => {
        this.selectedUser = response.data;
        this.userLoading = false;
      },
      error: (error) => {
        console.error('Error loading user details:', error);
        this.notificationService.showError('Failed to load user details');
        this.userLoading = false;
        this.dialogRef.close();
      }
  });
  }

  close(): void {
    this.dialogRef.close();
  }

  roundNumber(value: any): number {
    return Math.round(value);
  }

  showAvatarUploadDialog(): void {
    this.showAvatarDialog = true;
  }
  
  closeAvatarUploadDialog(): void {
    this.showAvatarDialog = false;
  }
  
  uploadAvatar(file: File): void {
    if (this.selectedUser && this.selectedUser._id) {
      this.avatarService.uploadAvatar(this.selectedUser._id, file).subscribe(
        (response) => {
          if (response.success !== false) {
            this.notificationService.showSuccess('Avatar uploaded successfully');
            
            // Update user avatar URL with timestamp to force reload
            if (this.selectedUser.profile) {
              this.selectedUser.profile.avatarUrl = this.avatarService.getAvatarUrl(this.selectedUser._id) + '&refresh=' + new Date().getTime();
            }
          } else {
            this.notificationService.showError(response.error || 'Failed to upload avatar');
          }
        },
        (error) => {
          console.error('Error uploading avatar:', error);
          this.notificationService.showError('Failed to upload avatar');
        }
      );
    }
  }
  
  removeAvatar(): void {
    if (this.selectedUser && this.selectedUser._id) {
      this.avatarService.removeAvatar(this.selectedUser._id).subscribe(
        (response) => {
          if (response.success !== false) {
            this.notificationService.showSuccess('Avatar removed successfully');
            
            // Update user avatar URL
            if (this.selectedUser.profile) {
              this.selectedUser.profile.avatarUrl = null;
            }
          } else {
            this.notificationService.showError(response.error || 'Failed to remove avatar');
          }
        },
        (error) => {
          console.error('Error removing avatar:', error);
          this.notificationService.showError('Failed to remove avatar');
        }
      );
    }
  }

  // Helper methods for displaying user data
  formatTime(seconds: number): string {
    if (!seconds) return '0h';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  formatTimeAgo(timestamp: string): string {
    if (!timestamp) return '';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
      return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`;
    } else if (diffHour > 0) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffMin > 0) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }
  
  getActivityIcon(type: string, passed?: boolean): string {
    switch (type) {
      case 'exam':
        return passed ? 'fa-check-circle' : 'fa-times-circle';
      case 'login':
        return 'fa-sign-in-alt';
      case 'practice':
        return 'fa-book';
      default:
        return 'fa-circle';
    }
  }
  
  getActivityIconClass(type: string, passed?: boolean): string {
    switch (type) {
      case 'exam':
        return passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
      case 'login':
        return 'bg-blue-100 text-blue-600';
      case 'practice':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }
}