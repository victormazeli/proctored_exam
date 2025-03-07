// admin-users.component.ts
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateUserDialogComponent } from './create-user-dialog/create-user-dialog.component';
import { RoleChangeDialogComponent } from './role-change-dialog/role-change-dialog.component';
import { UserDetailsDialogComponent } from './user-details-dialog/user-details-dialog.component';
import { AdminService } from 'src/app/services/admin.service';
import { AvatarService } from 'src/app/services/avatar.service';
import { DialogService } from 'src/app/services/dialog.service';
import { NotificationService } from 'src/app/services/notification.service';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
  lastLogin?: Date;
  metrics?: Metrics;
  profile?: {
    name: string;
    avatar: string;
  };
}


interface Metrics {
  totalAttempts: number;
  examsPassed: number;
  averageScore: number;
  totalTimeSpent: number;
}

interface Pagination {
  page: number;
  limit: number;
  totalUsers: number;
  totalPages: number;
}

@Component({
  selector: 'app-admin-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  search: string = '';
  pagination: Pagination = {
    page: 1,
    limit: 10,
    totalUsers: 0,
    totalPages: 0
  };
  
  showUserModal = false;
  showRoleModal = false;
  showCreateUserModal = false;
  selectedUser: any = null;
  newRole: string = '';
  userLoading = false;
  Math = Math;
  createUserForm!: FormGroup;
  showPassword = false;
  isSubmitting = false;
  isCurrentUserAdmin = true; // This would typically be determined by auth service
  showAvatarDialog = false;


 // File upload related
 @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private avatarService: AvatarService,
    private dialogService: DialogService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.search = params['search'] || '';
      this.pagination.page = parseInt(params['page']) || 1;
      this.pagination.limit = parseInt(params['limit']) || 10;
      
      this.loadUsers();
    });
  }
  

  loadUsers(): void {
    const params = {
      search: this.search,
      page: this.pagination.page,
      limit: this.pagination.limit
    };
    
    this.adminService.getUsers(params).subscribe({
      next: (data) => {
        this.users = data.data.users;
        this.pagination = data.data.pagination;
      },
      error: (error) => console.error('Error loading users:', error)
  });
  }

  onSearch(search: string): void {
    this.search = search;
    this.pagination.page = 1;
    
    this.router.navigate(['/admin/users'], { 
      queryParams: { 
        search: this.search,
        page: 1,
        limit: this.pagination.limit
      }
    });
  }

  roundNumber(value: any): number {
    return Math.round(value);
  }

  onPageChange(page: number): void {
    this.pagination.page = page;
    
    this.router.navigate(['/admin/users'], { 
      queryParams: { 
        search: this.search,
        page,
        limit: this.pagination.limit
      }
    });
  }



  handleRoleChange(): void {
    if (!this.selectedUser || !this.newRole) return;
    
    this.adminService.updateUserRole(this.selectedUser._id, this.newRole).subscribe(
      data => {
        if (data.success) {
          this.closeRoleModal();
          this.loadUsers();
        }
      },
      error => console.error('Error updating user role:', error)
    );
  }

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

  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
    this.newRole = '';
  }

  shouldShowPage(page: number): boolean {
    // Show page if:
    // 1. It is the first or last page
    // 2. It is within 2 positions of the current page
    // 3. Total pages are 7 or less (show all)
    if (page === 1 || page === this.pagination.totalPages) {
      return true;
    }
    
    if (Math.abs(page - this.pagination.page) <= 2) {
      return true;
    }
    
    return this.pagination.totalPages <= 7;
  }

  getActivityIcon(type: string, passed?: boolean): string {
    if (type === 'exam_attempt') {
      return passed ? 'fa-check-circle' : 'fa-times-circle';
    } else if (type === 'login') {
      return 'fa-sign-in-alt';
    } else {
      return 'fa-bell';
    }
  }
  
  getActivityIconClass(type: string, passed?: boolean): string {
    let bgClass = 'bg-gray-100';
    let textClass = 'text-gray-600';
    
    if (type === 'exam_attempt') {
      if (passed) {
        bgClass = 'bg-green-100';
        textClass = 'text-green-600';
      } else {
        bgClass = 'bg-red-100';
        textClass = 'text-red-600';
      }
    } else if (type === 'login') {
      bgClass = 'bg-blue-100';
      textClass = 'text-blue-600';
    }
    
    return `${bgClass} ${textClass}`;
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return 'Just now';
    }
  }



  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }



   /* Avatar Upload Dialog Functions */
   showAvatarUploadDialog(): void {
    this.showAvatarDialog = true;
  }
  
  closeAvatarUploadDialog(): void {
    this.showAvatarDialog = false;
  }
  
  uploadAvatar(file: File): void {
    // Check file type and size
    if (!file.type.match(/image\/(jpeg|jpg|png|gif)$/)) {
      this.notificationService.showError('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB max
      this.notificationService.showError('Avatar image must be less than 2MB');
      return;
    }
    
    if (this.selectedUser && this.selectedUser._id) {
      this.avatarService.uploadAvatar(this.selectedUser._id, file).subscribe(
        (response) => {
          if (response.success !== false) {
            this.notificationService.showSuccess('Avatar uploaded successfully');
            
            // Update user avatar URL with timestamp to force reload
            if (this.selectedUser.profile) {
              this.selectedUser.profile.avatarUrl = this.avatarService.getAvatarUrl(this.selectedUser._id) + '&refresh=' + new Date().getTime();
            }
            
            // Refresh the user list to show updated avatar
            this.loadUsers();
          } else {
          }
        },
        (error) => {
          console.error('Error uploading avatar:', error);
        }
      );
    }
  }
  
  removeAvatar(): void {
    if (this.selectedUser && this.selectedUser._id) {
      this.avatarService.removeAvatar(this.selectedUser._id).subscribe(
        (response) => {
          if (response.success !== false) {
            
            // Update user avatar URL
            if (this.selectedUser.profile) {
              this.selectedUser.profile.avatarUrl = null;
            }
            
            // Refresh the user list
            this.loadUsers();
          } else {
          }
        },
        (error) => {
          console.error('Error removing avatar:', error);
        }
      );
    }
  }


  getAvatarUrl(userId: any) {
    this.avatarService.getAvatarUrl(userId)
  }


  openCreateUserDialog(): void {
    const { dialogRef } = this.dialogService.open(CreateUserDialogComponent, {
      width: '600px'
    });
    
    dialogRef.afterClosed().then((result) => {
      if (result) {
        // User was created successfully
        this.loadUsers(); // Reload the users list
      }
    });
  }
  
  viewUserDetails(userId: string): void {
    const { dialogRef } = this.dialogService.open(UserDetailsDialogComponent, {
      width: '800px',
      data: { userId }
    });

    dialogRef.afterClosed().then((result) => {
      if (result) {
        this.loadUsers();
      }
    });
  }
  
  confirmRoleChange(userId: string, username: string, newRole: string): void {
    const { dialogRef } = this.dialogService.open(RoleChangeDialogComponent, {
      width: '500px',
      data: {
        userId,
        userName: username,
        newRole
      }
    });
    
    dialogRef.afterClosed().then((result) => {
      if (result === true) {
        // Role was changed successfully
        this.loadUsers(); // Reload the users list
      }
    });
  }
}