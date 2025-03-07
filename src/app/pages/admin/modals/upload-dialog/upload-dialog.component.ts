import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-avatar-upload-dialog',
  template: `
    <div *ngIf="isOpen" class="avatar-upload-dialog">
      <div class="dialog-overlay" (click)="cancel()"></div>
      <div class="dialog-container">
        <div class="dialog-header">
          <h2 class="dialog-title">Change Avatar</h2>
          <button type="button" class="dialog-close" (click)="cancel()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="dialog-body">
          <div class="avatar-preview-container">
            <div *ngIf="!previewUrl" class="avatar-upload-placeholder">
              <i class="fas fa-user text-gray-400 text-4xl"></i>
              <p class="text-gray-500 mt-2">No image selected</p>
            </div>
            <img *ngIf="previewUrl" [src]="previewUrl" alt="Avatar preview" class="avatar-preview">
          </div>
          
          <div class="avatar-actions">
            <div class="upload-btn-wrapper">
              <button type="button" class="btn btn-outline">
                <i class="fas fa-upload mr-2"></i> Select Image
              </button>
              <input type="file" #fileInput accept="image/jpeg,image/png,image/gif" (change)="onFileSelected($event)">
            </div>
            
            <button 
              *ngIf="existingAvatarUrl" 
              type="button" 
              class="btn btn-danger"
              (click)="removeAvatar.emit()">
              <i class="fas fa-trash-alt mr-2"></i> Remove Avatar
            </button>
          </div>
          
          <div class="upload-guidelines">
            <h4 class="guidelines-title">Guidelines:</h4>
            <ul class="guidelines-list">
              <li>Image must be JPG, PNG, or GIF format</li>
              <li>Maximum file size is 2MB</li>
              <li>Square images work best</li>
            </ul>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button 
            type="button" 
            class="btn btn-primary" 
            [disabled]="!selectedFile" 
            (click)="upload()">
            Upload
          </button>
          <button type="button" class="btn btn-outline" (click)="cancel()">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .avatar-upload-dialog {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    .dialog-container {
      position: relative;
      z-index: 10;
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 32rem;
      margin: 1rem;
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .dialog-title {
      font-size: 1.125rem;
      font-weight: 500;
    }
    
    .dialog-close {
      color: #9ca3af;
    }
    
    .dialog-close:hover {
      color: #6b7280;
    }
    
    .dialog-body {
      padding: 1.5rem;
    }
    
    .dialog-footer {
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }
    
    .avatar-preview-container {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    
    .avatar-upload-placeholder {
      width: 8rem;
      height: 8rem;
      border-radius: 9999px;
      background-color: #f3f4f6;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .avatar-preview {
      width: 8rem;
      height: 8rem;
      border-radius: 9999px;
      object-fit: cover;
      border: 2px solid #e5e7eb;
    }
    
    .avatar-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .upload-btn-wrapper {
      position: relative;
      overflow: hidden;
      display: inline-block;
    }
    
    .upload-btn-wrapper input[type=file] {
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    
    .upload-guidelines {
      background-color: #f3f4f6;
      border-radius: 0.375rem;
      padding: 1rem;
    }
    
    .guidelines-title {
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    
    .guidelines-list {
      padding-left: 1.5rem;
      font-size: 0.875rem;
      color: #4b5563;
    }
    
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .btn-primary {
      background-color: #2563eb;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #1d4ed8;
    }
    
    .btn-primary:disabled {
      background-color: #93c5fd;
      cursor: not-allowed;
    }
    
    .btn-outline {
      border: 1px solid #d1d5db;
      color: #4b5563;
    }
    
    .btn-outline:hover {
      background-color: #f9fafb;
    }
    
    .btn-danger {
      background-color: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    
    .btn-danger:hover {
      background-color: #fecaca;
    }
  `]
})
export class UploadDialogComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() existingAvatarUrl: string | null = null;
  
  @Output() uploadAvatar = new EventEmitter<File>();
  @Output() removeAvatar = new EventEmitter<void>();
  @Output() closeDialog = new EventEmitter<void>();
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
  ngOnInit(): void {
    // Show existing avatar if available
    this.previewUrl = this.existingAvatarUrl;
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }
  
  upload(): void {
    if (this.selectedFile) {
      this.uploadAvatar.emit(this.selectedFile);
      this.closeDialog.emit();
      this.reset();
    }
  }
  
  cancel(): void {
    this.closeDialog.emit();
    this.reset();
  }
  
  reset(): void {
    this.selectedFile = null;
    this.previewUrl = this.existingAvatarUrl;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}