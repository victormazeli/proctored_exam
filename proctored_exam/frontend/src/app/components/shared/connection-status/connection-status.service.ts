import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConnectionStatusType } from './connection-status.component';

interface ConnectionStatusState {
  visible: boolean;
  statusType: ConnectionStatusType;
  message: string;
  dismissible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionStatusService {
  private defaultState: ConnectionStatusState = {
    visible: false,
    statusType: 'offline',
    message: '',
    dismissible: false
  };
  
  private statusState = new BehaviorSubject<ConnectionStatusState>(this.defaultState);
  private autoHideTimeout: any = null;
  
  constructor() { }
  
  /**
   * Get the current connection status state as an Observable
   */
  getState(): Observable<ConnectionStatusState> {
    return this.statusState.asObservable();
  }
  
  /**
   * Show offline status
   * @param message Message to display
   * @param dismissible Whether the status can be dismissed by the user
   */
  showOffline(message: string, dismissible: boolean = false): void {
    this.clearTimeout();
    
    this.statusState.next({
      visible: true,
      statusType: 'offline',
      message,
      dismissible
    });
  }
  
  /**
   * Show warning status
   * @param message Message to display
   * @param dismissible Whether the status can be dismissed by the user
   * @param autoHideMs Auto-hide after specified milliseconds (0 to disable)
   */
  showWarning(message: string, dismissible: boolean = true, autoHideMs: number = 0): void {
    this.clearTimeout();
    
    this.statusState.next({
      visible: true,
      statusType: 'warning',
      message,
      dismissible
    });
    
    if (autoHideMs > 0) {
      this.autoHideTimeout = setTimeout(() => {
        this.hide();
      }, autoHideMs);
    }
  }
  
  /**
   * Show success status
   * @param message Message to display
   * @param dismissible Whether the status can be dismissed by the user
   * @param autoHideMs Auto-hide after specified milliseconds (0 to disable)
   */
  showSuccess(message: string, dismissible: boolean = false, autoHideMs: number = 5000): void {
    this.clearTimeout();
    
    this.statusState.next({
      visible: true,
      statusType: 'success',
      message,
      dismissible
    });
    
    if (autoHideMs > 0) {
      this.autoHideTimeout = setTimeout(() => {
        this.hide();
      }, autoHideMs);
    }
  }
  
  /**
   * Hide the status banner
   */
  hide(): void {
    this.clearTimeout();
    this.statusState.next({
      ...this.statusState.value,
      visible: false
    });
  }
  
  /**
   * Clear any existing timeout
   */
  private clearTimeout(): void {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
  }
}