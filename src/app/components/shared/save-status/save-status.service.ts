import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SaveStatusType } from './save-status.component';

interface SaveStatusState {
  visible: boolean;
  statusType: SaveStatusType;
  message: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

@Injectable({
  providedIn: 'root'
})
export class SaveStatusService {
  private defaultState: SaveStatusState = {
    visible: false,
    statusType: 'saving',
    message: '',
    position: 'bottom-right'
  };
  
  private statusState = new BehaviorSubject<SaveStatusState>(this.defaultState);
  private autoHideTimeout: any = null;
  
  constructor() { }
  
  /**
   * Get the current save status state as an Observable
   */
  getState(): Observable<SaveStatusState> {
    return this.statusState.asObservable();
  }
  
  /**
   * Show saving status
   * @param message Message to display
   * @param position Position to display the indicator
   */
  showSaving(message: string = 'Saving...', position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right'): void {
    this.clearTimeout();
    
    this.statusState.next({
      visible: true,
      statusType: 'saving',
      message,
      position
    });
  }
  
  /**
   * Show saved status
   * @param message Message to display
   * @param position Position to display the indicator
   * @param autoHideMs Auto-hide after specified milliseconds (0 to disable)
   */
  showSaved(message: string = 'Saved successfully', position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right', autoHideMs: number = 3000): void {
    this.clearTimeout();
    
    this.statusState.next({
      visible: true,
      statusType: 'saved',
      message,
      position
    });
    
    if (autoHideMs > 0) {
      this.autoHideTimeout = setTimeout(() => {
        this.hide();
      }, autoHideMs);
    }
  }
  
  /**
   * Show error status
   * @param message Message to display
   * @param position Position to display the indicator
   * @param autoHideMs Auto-hide after specified milliseconds (0 to disable)
   */
  showError(message: string = 'Unable to save', position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right', autoHideMs: number = 0): void {
    this.clearTimeout();
    
    this.statusState.next({
      visible: true,
      statusType: 'error',
      message,
      position
    });
    
    if (autoHideMs > 0) {
      this.autoHideTimeout = setTimeout(() => {
        this.hide();
      }, autoHideMs);
    }
  }
  
  /**
   * Show queued status
   * @param message Message to display
   * @param position Position to display the indicator
   * @param autoHideMs Auto-hide after specified milliseconds (0 to disable)
   */
  showQueued(message: string = 'Changes queued', position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right', autoHideMs: number = 3000): void {
    this.clearTimeout();
    
    this.statusState.next({
      visible: true,
      statusType: 'queued',
      message,
      position
    });
    
    if (autoHideMs > 0) {
      this.autoHideTimeout = setTimeout(() => {
        this.hide();
      }, autoHideMs);
    }
  }
  
  /**
   * Hide the status indicator
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