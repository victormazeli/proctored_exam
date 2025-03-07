import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Notification type definition
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'

}

/**
 * Notification interface
 */
export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  autoClose: boolean;
  timeout?: number;
}

/**
 * Notification service for displaying toast notifications
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new Subject<Notification>();
  private idCounter = 0;
  
  constructor() { }

  /**
   * Get notifications observable
   */
  getNotifications(): Observable<Notification> {
    return this.notifications$.asObservable();
  }

  /**
   * Show a success notification
   */
  showSuccess(message: string, autoClose: boolean = true, timeout: number = 5000): void {
    this.show({
      id: ++this.idCounter,
      type: NotificationType.SUCCESS,
      message,
      autoClose,
      timeout
    });
  }


  /**
   * Show an error notification
   */
  showError(message: string, autoClose: boolean = true, timeout: number = 5000): void {
    this.show({
      id: ++this.idCounter,
      type: NotificationType.ERROR,
      message,
      autoClose,
      timeout
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(message: string, autoClose: boolean = true, timeout: number = 5000): void {
    this.show({
      id: ++this.idCounter,
      type: NotificationType.WARNING,
      message,
      autoClose,
      timeout
    });
  }

  /**
   * Show an info notification
   */
  showInfo(message: string, autoClose: boolean = true, timeout: number = 5000): void {
    this.show({
      id: ++this.idCounter,
      type: NotificationType.INFO,
      message,
      autoClose,
      timeout
    });
  }

  /**
   * Remove a notification by id
   */
  remove(id: number): void {
    this.notifications$.next({ id, type: null, message: null, autoClose: null, remove: true } as any);
  }

  /**
   * Private method to show notification
   */
  private show(notification: Notification): void {
    this.notifications$.next(notification);
  }
}