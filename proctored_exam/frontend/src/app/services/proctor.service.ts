// proctor.service.ts

import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ProctorConfig, ProctorEvent } from '../models/exam.interface';

export interface ProctorStatus {
  status: 'active' | 'warning' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProctorService {
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectAttempts = 0;
  private queuedViolations: ProctorEvent[] = [];
  
  private statusSubject = new BehaviorSubject<ProctorStatus>({
    status: 'active',
    message: 'Proctoring Active'
  });
  public status$ = this.statusSubject.asObservable();
  
  private warningSubject = new Subject<string>();
  public warning$ = this.warningSubject.asObservable();

  constructor(private socket: Socket) {}

  /**
   * Initialize proctoring for an exam attempt
   */
  initialize(attemptId: string, examId: string): void {
    this.setupSocketConnection(attemptId, examId);
    this.initializeWebcamMonitoring();
  }

  /**
   * Set up socket connection for proctoring
   */
  private setupSocketConnection(attemptId: string, examId: string): void {
    // Connect to proctor namespace
    this.socket.connect();

    // Socket connection events
    this.socket.on('connect', () => {
      this.updateStatus('active', 'Proctoring Active');
      this.reconnectAttempts = 0;

      // Join exam room
      this.socket.emit('join_exam', { attemptId, examId });

      // Process queued violations
      if (this.queuedViolations.length > 0) {
        this.socket.emit('proctor:violations_batch', this.queuedViolations);
        this.queuedViolations = [];
      }
    });

    this.socket.on('joined_exam', (response: { success: boolean, message?: string }) => {
      if (!response.success) {
        console.error('Failed to join exam room:', response.message);
        this.updateStatus('error', 'Failed to join exam room');
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Proctor socket connection error:', error);
      this.updateStatus('error', 'Connection Error');
    });

    this.socket.on('disconnect', (reason: string) => {
      this.updateStatus('warning', 'Reconnecting...');
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.reconnectAttempts = attemptNumber;
      this.updateStatus('warning', `Reconnecting (${attemptNumber}/${this.MAX_RECONNECT_ATTEMPTS})...`);
    });

    this.socket.on('reconnect_failed', () => {
      this.updateStatus('error', 'Connection Failed');
      this.warningSubject.next('Proctor connection lost. Your exam session may be reviewed.');
    });

    this.socket.on('proctor_warning', (data: { message: string }) => {
      this.warningSubject.next(data.message);
    });

    // Handle monitoring configuration updates
    this.socket.on('monitoring_requested', () => {
      this.updateMonitoringConfig({ captureInterval: 2000 });
    });
  }

  /**
   * Initialize webcam monitoring
   */
  private initializeWebcamMonitoring(): void {
    // In a real implementation, this would use face-api.js or similar
    // This is a simplified version for demonstration
    setInterval(() => {
      if (this.socket.connected) {
        const frameData = this.simulateFrameAnalysis();
        this.socket.emit('proctor:process_frame', frameData);
      }
    }, 5000);
  }

  /**
   * Log a proctoring violation
   */
  logViolation(type: string, details: any = {}): void {
    const violation: ProctorEvent = {
      type,
      time: new Date(),
      details: {
        ...details,
        timestamp: new Date().toISOString()
      }
    };

    if (this.socket.connected) {
      this.socket.emit('proctor:violation', violation);
    } else {
      this.queuedViolations.push(violation);
    }
  }

  /**
   * Update proctor status
   */
  private updateStatus(status: 'active' | 'warning' | 'error', message: string): void {
    this.statusSubject.next({ status, message });
  }

  /**
   * Update monitoring configuration
   */
  private updateMonitoringConfig(config: Partial<ProctorConfig>): void {
    // Implementation would update monitoring parameters
    console.log('Updating monitoring config:', config);
  }

  /**
   * Simulate frame analysis (in real implementation, this would use face-api.js)
   */
  private simulateFrameAnalysis() {
    const randomValue = Math.random();
    
    return {
      timestamp: new Date().toISOString(),
      faceDetection: {
        facesDetected: randomValue < 0.1 ? 0 : randomValue > 0.98 ? 2 : 1,
        confidence: 0.95
      },
      attentionTracking: {
        isAttentive: randomValue > 0.15,
        gazeDirection: randomValue > 0.15 ? 'center' : 'outside',
        confidence: 0.8
      }
    };
  }

  /**
   * Clean up proctoring
   */
  cleanup(): void {
    this.socket.disconnect();
  }
}