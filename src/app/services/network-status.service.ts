import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

export interface NetworkStatus {
  isOnline: boolean;
  lastOnlineChange: Date;
  connectionQuality: 'good' | 'poor' | 'unknown';
}

@Injectable({
  providedIn: 'root'
})
export class NetworkStatusService {
  private networkStatus = new BehaviorSubject<NetworkStatus>({
    isOnline: navigator.onLine,
    lastOnlineChange: new Date(),
    connectionQuality: 'unknown'
  });

  private apiUrl = `${environment.api}/api`

  constructor() {
    this.setupNetworkListeners();
    
    // Check connection quality periodically
    this.checkConnectionQuality();
    setInterval(() => this.checkConnectionQuality(), 60000); // Check every minute
  }

  /**
   * Get current network status as observable
   */
  public getNetworkStatus(): Observable<NetworkStatus> {
    return this.networkStatus.asObservable();
  }

  /**
   * Get current online status
   */
  public isOnline(): boolean {
    return this.networkStatus.value.isOnline;
  }

  /**
   * Set up network status event listeners
   */
  private setupNetworkListeners(): void {
    // Listen for online event
    window.addEventListener('online', () => {
      const currentStatus = this.networkStatus.value;
      this.networkStatus.next({
        ...currentStatus,
        isOnline: true,
        lastOnlineChange: new Date()
      });
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
      const currentStatus = this.networkStatus.value;
      this.networkStatus.next({
        ...currentStatus,
        isOnline: false,
        lastOnlineChange: new Date()
      });
    });
  }

  /**
   * Check connection quality by measuring response time
   */
  private async checkConnectionQuality(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const startTime = performance.now();
      
      // Make a tiny request to measure latency
      const response = await fetch(`${this.apiUrl}/ping`, { 
        method: 'HEAD',
        cache: 'no-store'
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      let connectionQuality: 'good' | 'poor' | 'unknown' = 'unknown';
      
      if (response.ok) {
        // Determine quality based on response time
        connectionQuality = responseTime < 500 ? 'good' : 'poor';
      }
      
      // Update network status with connection quality
      const currentStatus = this.networkStatus.value;
      if (currentStatus.connectionQuality !== connectionQuality) {
        this.networkStatus.next({
          ...currentStatus,
          connectionQuality
        });
      }
    } catch (error) {
      console.error('Error checking connection quality:', error);
      
      // On error, mark connection as poor
      const currentStatus = this.networkStatus.value;
      this.networkStatus.next({
        ...currentStatus,
        connectionQuality: 'poor'
      });
    }
  }
}