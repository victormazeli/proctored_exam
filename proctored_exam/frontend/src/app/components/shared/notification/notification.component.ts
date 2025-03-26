// shared/components/notification/notification.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NotificationService, Notification, NotificationType } from 'src/app/services/notification.service';


@Component({
  selector: 'app-notification',
  template: `
    <div class="notifications-container">
      <div 
        *ngFor="let notification of notifications"
        [@notificationState]
        class="notification-toast"
        [ngClass]="getNotificationClass(notification.type)"
      >
        <div class="notification-content">
          <div class="notification-icon">
            <i class="fas" [ngClass]="getIconClass(notification.type)"></i>
          </div>
          <div class="notification-message">
            {{ notification.message }}
          </div>
          <button class="notification-close" (click)="remove(notification.id)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 1050;
      max-width: 24rem;
      padding: 0.5rem;
    }
    
    .notification-toast {
      margin-bottom: 0.75rem;
      padding: 1rem;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      width: 100%;
    }
    
    .notification-content {
      display: flex;
      align-items: flex-start;
    }
    
    .notification-icon {
      flex-shrink: 0;
      margin-right: 0.75rem;
    }
    
    .notification-message {
      flex-grow: 1;
      font-size: 0.875rem;
    }
    
    .notification-close {
      flex-shrink: 0;
      margin-left: 0.75rem;
      cursor: pointer;
      background: transparent;
      border: none;
      font-size: 0.875rem;
      opacity: 0.7;
    }
    
    .notification-close:hover {
      opacity: 1;
    }
    
    /* Type-specific styles */
    .notification-success {
      background-color: #d1fae5;
      color: #065f46;
    }
    
    .notification-error {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    
    .notification-warning {
      background-color: #fef3c7;
      color: #92400e;
    }
    
    .notification-info {
      background-color: #dbeafe;
      color: #1e40af;
    }
  `],
  animations: [
    trigger('notificationState', [
      state('void', style({
        transform: 'translateX(100%)',
        opacity: 0
      })),
      transition('void => *', [
        animate('300ms ease-out', style({
          transform: 'translateX(0)',
          opacity: 1
        }))
      ]),
      transition('* => void', [
        animate('200ms ease-in', style({
          transform: 'translateX(100%)',
          opacity: 0
        }))
      ])
    ])
  ]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();
  
  constructor(private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.subscription = this.notificationService.getNotifications()
      .subscribe(notification => {
        // Check if it's a remove action
        if ((notification as any).remove) {
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          return;
        }
        
        // Add new notification
        this.notifications.push(notification);
        
        // Auto-close if enabled
        if (notification.autoClose) {
          setTimeout(() => {
            this.remove(notification.id);
          }, notification.timeout || 5000);
        }
      });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  remove(id: number): void {
    this.notifications = this.notifications.filter(notification => notification.id !== id);
  }

  getNotificationClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS:
        return 'notification-success';
      case NotificationType.ERROR:
        return 'notification-error';
      case NotificationType.WARNING:
        return 'notification-warning';
      case NotificationType.INFO:
        return 'notification-info';
      default:
        return '';
    }
  }

  getIconClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS:
        return 'fa-check-circle';
      case NotificationType.ERROR:
        return 'fa-exclamation-circle';
      case NotificationType.WARNING:
        return 'fa-exclamation-triangle';
      case NotificationType.INFO:
        return 'fa-info-circle';
      default:
        return '';
    }
  }
}