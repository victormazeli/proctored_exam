// resume-exam-dialog.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export interface ExistingAttempt {
  id: string;
  startTime: Date;
  lastUpdated: Date;
  questionsAnswered: number;
  totalQuestions: number;
  timeSpent: number;
}

@Component({
  selector: 'app-resume-exam-dialog',
  templateUrl: './resume-exam-dialog.component.html'
})
export class ResumeExamDialogComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() existingAttempt: ExistingAttempt | null = null;
  @Input() examName: string = '';
  
  @Output() resume = new EventEmitter<string>();
  @Output() startNew = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  
  timeAgo: string = '';
  progressPercent: number = 0;
  
  constructor() { }

  ngOnInit(): void {
    this.calculateTimeAgo();
    this.calculateProgress();
  }
  
  ngOnChanges(): void {
    if (this.existingAttempt) {
      this.calculateTimeAgo();
      this.calculateProgress();
    }
  }
  
  private calculateTimeAgo(): void {
    if (!this.existingAttempt) return;
    
    const now = new Date();
    const lastUpdated = new Date(this.existingAttempt.lastUpdated);
    const diffMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) {
      this.timeAgo = 'Just now';
    } else if (diffMinutes < 60) {
      this.timeAgo = `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        this.timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        this.timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      }
    }
  }
  
  private calculateProgress(): void {
    if (!this.existingAttempt) return;
    
    this.progressPercent = Math.round(
      (this.existingAttempt.questionsAnswered / this.existingAttempt.totalQuestions) * 100
    );
  }
  
  onResumeClicked(): void {
    if (this.existingAttempt) {
      this.resume.emit(this.existingAttempt.id);
    }
  }
  
  onStartNewClicked(): void {
    this.startNew.emit();
  }
  
  onCancelClicked(): void {
    this.cancel.emit();
  }

formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes} minutes`;
  }
}
}