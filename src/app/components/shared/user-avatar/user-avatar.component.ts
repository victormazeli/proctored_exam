// user-avatar.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  template: `
    <div class="avatar" [ngClass]="sizeClass" [ngStyle]="{ 'background-color': backgroundColor }">
      <ng-container *ngIf="imageUrl && !imageError; else initialsTemplate">
        <img 
          [src]="imageUrl" 
          [alt]="name || username" 
          (error)="handleImageError()" 
          class="avatar-image"
        >
      </ng-container>
      <ng-template #initialsTemplate>
        <span class="avatar-text" [ngStyle]="{ 'color': textColor }">
          {{ initials }}
        </span>
      </ng-template>
    </div>
  `,
  styles: [`
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      overflow: hidden;
    }
    
    .avatar-small {
      width: 32px;
      height: 32px;
    }
    
    .avatar-medium {
      width: 40px;
      height: 40px;
    }
    
    .avatar-large {
      width: 64px;
      height: 64px;
    }
    
    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .avatar-text {
      font-weight: 600;
      text-transform: uppercase;
    }
  `]
})
export class UserAvatarComponent implements OnChanges {
  @Input() username: string = '';
  @Input() name: string = '';
  @Input() imageUrl: string | null = null;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  
  initials: string = '';
  imageError: boolean = false;
  backgroundColor: string = '#dbeafe';
  textColor: string = '#1d4ed8';
  sizeClass: string = 'avatar-medium';
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['username'] || changes['name']) {
      this.generateInitials();
    }
    
    if (changes['size']) {
      this.sizeClass = `avatar-${this.size}`;
    }
    
    // Generate consistent color based on username
    if (changes['username']) {
      this.generateColors();
    }
  }
  
  generateInitials(): void {
    if (this.name && this.name.trim() !== '') {
      // Try to get initials from full name (first letter of first name and last name)
      const nameParts = this.name.split(' ').filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        this.initials = nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0);
      } else {
        this.initials = this.name.substring(0, 2);
      }
    } else if (this.username) {
      // Fallback to first two letters of username
      this.initials = this.username.substring(0, 2);
    } else {
      this.initials = '??';
    }
    
    this.initials = this.initials.toUpperCase();
  }
  
  generateColors(): void {
    // Generate a deterministic color based on the username
    // This ensures the same user always gets the same color
    if (!this.username) return;
    
    // Create a simple hash from the username
    let hash = 0;
    for (let i = 0; i < this.username.length; i++) {
      hash = this.username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Set of background colors and their corresponding text colors
    const colorPairs = [
      { bg: '#dbeafe', text: '#1d4ed8' }, // Blue
      { bg: '#dcfce7', text: '#166534' }, // Green
      { bg: '#fee2e2', text: '#b91c1c' }, // Red
      { bg: '#fef3c7', text: '#92400e' }, // Amber
      { bg: '#f3e8ff', text: '#6b21a8' }, // Purple
      { bg: '#ffedd5', text: '#c2410c' }, // Orange
      { bg: '#dbeafe', text: '#1e40af' }, // Indigo
      { bg: '#f5f5f4', text: '#44403c' }, // Stone
    ];
    
    // Use the hash to select a color pair
    const colorIndex = Math.abs(hash) % colorPairs.length;
    this.backgroundColor = colorPairs[colorIndex].bg;
    this.textColor = colorPairs[colorIndex].text;
  }
  
  handleImageError(): void {
    this.imageError = true;
  }
}