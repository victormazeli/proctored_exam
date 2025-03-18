// active-exams.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';
import { finalize } from 'rxjs/operators';
import { Subscription, interval } from 'rxjs';

interface ExamSession {
  _id: string;
  username: string;
  email: string;
  userPhoto?: string;
  isOnline: boolean;
  examName: string;
  certificationName: string;
  startTime: Date;
  elapsedTime: number; // in milliseconds
  totalTime: number; // in milliseconds
  completedQuestions: number;
  totalQuestions: number;
  progressPercentage: number;
  isFlagged: boolean;
}

interface FlaggedActivity {
  _id: string;
  username: string;
  examName: string;
  timestamp: Date;
  reason: string;
  severity: 'Low' | 'Medium' | 'High';
  details?: string;
  evidence?: string;
}

interface ActivityLog {
  timestamp: Date;
  message: string;
  isWarning: boolean;
}

interface ExamStats {
  activeTakers: number;
  activeExams: number;
  flaggedSessions: number;
}

@Component({
  selector: 'app-active-exams',
  templateUrl: './active-exams.component.html',
})
export class ActiveExamsComponent implements OnInit, OnDestroy {
  // Data
  sessions: ExamSession[] = [];
  filteredSessions: ExamSession[] = [];
  flaggedActivities: FlaggedActivity[] = [];
  activityLogs: ActivityLog[] = [];
  
  // Stats
  stats: ExamStats = {
    activeTakers: 0,
    activeExams: 0,
    flaggedSessions: 0
  };
  
  // Filters
  searchTerm = '';
  statusFilter = 'all'; // 'all', 'normal', 'flagged'
  
  // UI states
  isLoading = false;
  hasError = false;
  errorMessage = '';
  showProctorModal = false;
  currentSession: ExamSession | null = null;
  
  // Auto-refresh
  refreshSubscription?: Subscription;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadActiveExams();
    
    // Set up auto-refresh every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadActiveExams(false); // refresh without showing loader
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadActiveExams(showLoader = true): void {
    if (showLoader) {
      this.isLoading = true;
    }
    this.hasError = false;
    
    this.adminService.getActiveExams()
      .subscribe({
       next: (response) => {
          this.isLoading = false;
          this.sessions = response.data.sessions;
          this.stats = response.data.stats;
          this.flaggedActivities = response.data.flaggedActivities;
          this.filterSessions();
        },
       error: (error) => {
          this.hasError = true;
          this.errorMessage = 'Failed to load active exam data. Please try again later.';
          console.error('Error loading active exam data:', error);
        }
  });
  }

  filterSessions(): void {
    // First apply search filter
    if (this.searchTerm.trim()) {
      const searchTerm = this.searchTerm.toLowerCase().trim();
      this.filteredSessions = this.sessions.filter(session => 
        session.username.toLowerCase().includes(searchTerm) ||
        session.email.toLowerCase().includes(searchTerm) ||
        session.examName.toLowerCase().includes(searchTerm) ||
        session.certificationName.toLowerCase().includes(searchTerm)
      );
    } else {
      this.filteredSessions = [...this.sessions];
    }
    
    // Then apply status filter
    if (this.statusFilter !== 'all') {
      const isFlagged = this.statusFilter === 'flagged';
      this.filteredSessions = this.filteredSessions.filter(session => 
        session.isFlagged === isFlagged
      );
    }
  }

  formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  openProctorView(sessionId: string): void {
    const session = this.sessions.find(s => s._id === sessionId);
    if (session) {
      this.currentSession = session;
      this.showProctorModal = true;
      this.loadActivityLogs(sessionId);
    }
  }

  closeProctorView(): void {
    this.showProctorModal = false;
    this.currentSession = null;
  }

  loadActivityLogs(sessionId: string): void {
    this.adminService.getSessionActivityLogs(sessionId)
      .subscribe(
        data => {
          this.activityLogs = data;
        },
        error => {
          console.error('Error loading activity logs:', error);
        }
      );
  }

  terminateSession(sessionId: string | undefined): void {
    if (!sessionId) return;
    
    if (confirm('Are you sure you want to terminate this exam session? This action cannot be undone.')) {
      this.adminService.terminateExamSession(sessionId)
        .subscribe(
          () => {
            this.loadActiveExams();
            if (this.showProctorModal) {
              this.closeProctorView();
            }
          },
          error => {
            console.error('Error terminating session:', error);
            alert('Failed to terminate session. Please try again.');
          }
        );
    }
  }

  flagSession(sessionId: string | undefined): void {
    if (!sessionId) return;
    
    const reason = prompt('Please enter a reason for flagging this session:');
    if (reason) {
      this.adminService.flagSession(sessionId, reason, 'Medium')
        .subscribe(
          () => {
            this.loadActiveExams();
            alert('Session has been flagged.');
          },
          error => {
            console.error('Error flagging session:', error);
            alert('Failed to flag session. Please try again.');
          }
        );
    }
  }

  sendWarning(): void {
    if (!this.currentSession) return;
    
    const message = prompt('Enter warning message to send to the test taker:');
    if (message) {
      this.adminService.sendWarningToUser(this.currentSession._id, message)
        .subscribe(
          () => {
            alert('Warning has been sent to the test taker.');
            // Add to activity logs locally for immediate feedback
            this.activityLogs.unshift({
              timestamp: new Date(),
              message: `Warning sent: "${message}"`,
              isWarning: true
            });
          },
          error => {
            console.error('Error sending warning:', error);
            alert('Failed to send warning. Please try again.');
          }
        );
    }
  }

  viewFlaggedActivity(activityId: string): void {
    const activity = this.flaggedActivities.find(a => a._id === activityId);
    if (activity) {
      // Show details in a modal or alert for simplicity
      alert(`Flagged Activity Details:\n\nUser: ${activity.username}\nExam: ${activity.examName}\nTime: ${activity.timestamp}\nReason: ${activity.reason}\nSeverity: ${activity.severity}\n\nDetails: ${activity.details || 'No additional details'}`);
    }
  }

  dismissFlag(activityId: string): void {
    if (confirm('Are you sure you want to dismiss this flag? This action cannot be undone.')) {
      this.adminService.dismissFlaggedActivity(activityId)
        .subscribe(
          () => {
            // Remove the activity from the local array
            this.flaggedActivities = this.flaggedActivities.filter(a => a._id !== activityId);
            // Update stats
            this.stats.flaggedSessions = Math.max(0, this.stats.flaggedSessions - 1);
          },
          error => {
            console.error('Error dismissing flag:', error);
            alert('Failed to dismiss flag. Please try again.');
          }
        );
    }
  }

  refreshData(): void {
    this.loadActiveExams();
  }
}