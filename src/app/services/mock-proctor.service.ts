// mock-proctor.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ProctorStatus {
  status: 'active' | 'warning' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockProctorService {
  private statusSubject = new BehaviorSubject<ProctorStatus>({
    status: 'active',
    message: 'Proctoring Active'
  });
  public status$ = this.statusSubject.asObservable();

  private warningSubject = new Subject<string>();
  public warning$ = this.warningSubject.asObservable();

  private mockWarnings = [
    'Please keep your face visible',
    'Multiple faces detected',
    'Please stay within the camera frame',
    'Looking away from screen'
  ];

  private warningInterval: any;

  initialize(attemptId: string, examId: string): void {
    console.log('Initializing mock proctor service');
    
    // Simulate random warnings every 30-60 seconds
    this.warningInterval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance of warning
        const randomWarning = this.mockWarnings[Math.floor(Math.random() * this.mockWarnings.length)];
        this.warningSubject.next(randomWarning);
      }
    }, Math.random() * 20000 + 20000);
  }

  logViolation(type: string, details: any = {}): void {
    console.log('Proctor violation logged:', { type, details });
  }

  cleanup(): void {
    if (this.warningInterval) {
      clearInterval(this.warningInterval);
    }
    this.statusSubject.next({
      status: 'error',
      message: 'Proctoring Stopped'
    });
  }
}