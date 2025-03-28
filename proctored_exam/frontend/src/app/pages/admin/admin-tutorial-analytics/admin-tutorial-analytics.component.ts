// admin-tutorial-analytics.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TutorialService } from 'src/app/services/tutorial.service';
import { AnalyticService } from 'src/app/services/analytic.service';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-admin-tutorial-analytics',
  templateUrl: './admin-tutorial-analytics.component.html'
})
export class AdminTutorialAnalyticsComponent implements OnInit {
  tutorialId: string = '';
  tutorial: any = null;
  dateRange: string = '30'; // Default to 30 days
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // Analytics data
  overallStats: any = {};
  lessonStats: any[] = [];
  exerciseStats: any[] = [];
  userProgress: any[] = [];
  userSearch: string = '';
  avgCompletionRate: number = 0;
  totalHoursSpent: number = 0;
  
  constructor(
    private route: ActivatedRoute,
    private tutorialService: TutorialService,
    private analyticsService: AnalyticService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tutorialId = params['id'];
      this.loadTutorial();
      this.loadAnalytics();
    });
  }
  
  loadTutorial(): void {
    this.tutorialService.getTutorial(this.tutorialId).subscribe(
      response => {
        if (response.success) {
          this.tutorial = response.data;
        } else {
          this.notificationService.showError('Failed to load tutorial details');
        }
      },
      error => {
        console.error('Error loading tutorial details:', error);
        this.notificationService.showError('Failed to load tutorial details');
      }
    );
  }
  
  loadAnalytics(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.analyticsService.getTutorialAnalytics(this.tutorialId, this.dateRange).subscribe(
      response => {
        if (response.success) {
          const data = response.data;
          this.overallStats = data.overallStats || {};
          this.lessonStats = data.lessonStats || [];
          this.exerciseStats = data.exerciseStats || [];
          this.userProgress = data.userProgress || [];
          
          // Calculate average completion rate
          this.calculateAverageCompletion();
          
          // Calculate total hours spent
          this.calculateTotalHoursSpent();
        } else {
          this.hasError = true;
          this.errorMessage = response.message || 'Failed to load analytics data';
        }
        this.isLoading = false;
      },
      error => {
        console.error('Error loading analytics:', error);
        this.hasError = true;
        this.errorMessage = 'Failed to load analytics data';
        this.isLoading = false;
      }
    );
  }
  
  refreshData(): void {
    this.loadAnalytics();
  }
  
  calculateAverageCompletion(): void {
    if (this.userProgress.length > 0) {
      const totalCompletion = this.userProgress.reduce(
        (sum, user) => sum + user.completionPercentage, 0
      );
      this.avgCompletionRate = totalCompletion / this.userProgress.length;
    } else {
      this.avgCompletionRate = 0;
    }
  }
  
 // admin-tutorial-analytics.component.ts (continued)
 calculateTotalHoursSpent(): void {
  if (this.userProgress.length > 0) {
    const totalSeconds = this.userProgress.reduce(
      (sum, user) => sum + user.timeSpent, 0
    );
    this.totalHoursSpent = totalSeconds / 3600; // Convert seconds to hours
  } else {
    this.totalHoursSpent = 0;
  }
}

formatTime(seconds: number): string {
  if (!seconds) return '0 min';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes} min`;
  }
}

formatTotalHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  } else {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours} hours`;
  }
}

getEfficiencyLabel(ratio: number): string {
  if (!ratio) return 'N/A';
  
  if (ratio > 1.2) {
    return 'Takes longer';
  } else if (ratio > 0.8) {
    return 'As expected';
  } else {
    return 'Faster than expected';
  }
}

searchUsers(): void {
  if (!this.userSearch) {
    this.refreshData();
    return;
  }
  
  this.isLoading = true;
  this.analyticsService.searchTutorialUsers(
    this.tutorialId, 
    this.userSearch, 
    this.dateRange
  ).subscribe(
    response => {
      if (response.success) {
        this.userProgress = response.data.userProgress || [];
        this.calculateAverageCompletion();
      } else {
        this.notificationService.showError('Failed to search users');
      }
      this.isLoading = false;
    },
    error => {
      console.error('Error searching users:', error);
      this.notificationService.showError('Failed to search users');
      this.isLoading = false;
    }
  );
}
}