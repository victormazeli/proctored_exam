import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExamService } from 'src/app/services/exam.service';
import { AuthService } from 'src/app/services/auth.service';
import { AnalyticService } from '../../services/analytic.service';
import { LeaderboardService } from 'src/app/services/leaderboard.service';


interface Badge {
  id: string;
  name: string;
  icon: string;
  bgColorClass: string;
  earned?: boolean;
  earnedDate?: Date;
}

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  // User info
  currentUser: any;
  
  // Performance data
  overallPerformance: any = {
    averageScore: 0,
    totalAttempts: 0,
    passCount: 0
  };
  
  weeklyStats: any = {
    attempts: 0,
    improvement: 0,
    averageScore: 0,
    studyTimeHours: 0
  };
  
  // Certification progress
  certificationProgress: any[] = [];
  certifications: any[] = [];
  
  // Leaderboard
  leaderboard: any[] = [];
  selectedLeaderboardCert: string = 'all';
  
  // Badges
  badges: any[] = [];
  
  // Recent attempts
  recentAttempts: any[] = [];
  
  // Study recommendations
  recommendations: any[] = [];

  constructor(
    private authService: AuthService,
    private analyticService: AnalyticService,
    private leaderboardService: LeaderboardService,
    private examService: ExamService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    
    // Load all dashboard data
    this.loadOverallPerformance();
    this.loadWeeklyStats();
    this.loadCertificationProgress();
    this.loadCertifications();
    this.loadLeaderboard();
    this.loadBadges();
    this.loadRecentAttempts();
    this.loadRecommendations();
  }

  loadOverallPerformance(): void {
    this.analyticService.getUserAttemptsSummary(this.currentUser.id).subscribe(
      response => {
        this.overallPerformance = response.data;
      },
      error => {
        console.error('Error loading overall performance:', error);
      }
    );
  }

  loadWeeklyStats(): void {
    this.analyticService.getWeeklyStats(this.currentUser.id).subscribe(
      response => {
        this.weeklyStats = response.data;
      },
      error => {
        console.error('Error loading weekly stats:', error);
      }
    );
  }

  loadCertificationProgress(): void {
    this.analyticService.getUserCertificationProgress(this.currentUser.id).subscribe(
      response => {
        // Sort by progress (descending)
        this.certificationProgress = response.data.sort((a: { progress: number; }, b: { progress: number; }) => b.progress - a.progress);
      },
      error => {
        console.error('Error loading certification progress:', error);
      }
    );
  }

  loadCertifications(): void {
    this.examService.getCertifications().subscribe(
      response => {
        this.certifications = response.data.filter((cert: { active: any; }) => cert.active);
      },
      error => {
        console.error('Error loading certifications:', error);
      }
    );
  }

  loadLeaderboard(): void {
    const params = {
      certificationId: this.selectedLeaderboardCert !== 'all' ? this.selectedLeaderboardCert : null,
      limit: 5
    };
    
    this.leaderboardService.getLeaderboard(params).subscribe(
      response => {
        // Mark current user in the leaderboard
        this.leaderboard = response.data.map((entry: { userId: any; }) => ({
          ...entry,
          isCurrentUser: entry.userId === this.currentUser.id
        }));
      },
      error => {
        console.error('Error loading leaderboard:', error);
      }
    );
  }

  loadBadges(): void {
    this.analyticService.getUserBadges(this.currentUser.id).subscribe(
      response => {
        this.badges = response.data;
        
        // Add missing badges as locked
        this.addMissingBadges();
      },
      error => {
        console.error('Error loading badges:', error);
      }
    );
  }



addMissingBadges(): void {
  // List of all possible badges
  const allBadges: Badge[] = [
    { 
      id: 'first_attempt', 
      name: 'First Attempt', 
      icon: '/assets/badges/first-attempt.svg',
      bgColorClass: 'bg-blue-100'
    },
    { 
      id: 'perfect_score', 
      name: 'Perfect Score', 
      icon: '/assets/badges/perfect-score.svg',
      bgColorClass: 'bg-yellow-100'
    },
    { 
      id: 'streak_3', 
      name: '3-Day Streak', 
      icon: '/assets/badges/streak.svg',
      bgColorClass: 'bg-green-100'
    },
    { 
      id: 'improvement_10', 
      name: '10% Improvement', 
      icon: '/assets/badges/improvement.svg',
      bgColorClass: 'bg-purple-100'
    },
    { 
      id: 'cert_ready', 
      name: 'Certification Ready', 
      icon: '/assets/badges/cert-ready.svg',
      bgColorClass: 'bg-indigo-100'
    },
    { 
      id: 'fast_finish', 
      name: 'Speed Demon', 
      icon: '/assets/badges/fast-finish.svg',
      bgColorClass: 'bg-red-100'
    }
  ];
  
  // Create a map of earned badges
  const earnedBadgeMap: {[key: string]: Badge} = {};
  this.badges.forEach(badge => {
    earnedBadgeMap[badge.id] = badge;
  });
  
  // Combine earned and unearned badges
  this.badges = allBadges.map(badge => {
    if (earnedBadgeMap[badge.id]) {
      return {
        ...badge,
        earned: true,
        earnedDate: earnedBadgeMap[badge.id].earnedDate
      };
    } else {
      return {
        ...badge,
        earned: false
      };
    }
  });
}

  loadRecentAttempts(): void {
    this.analyticService.getRecentAttempts(this.currentUser.id, 5).subscribe(
      response => {
        this.recentAttempts = response.data;
      },
      error => {
        console.error('Error loading recent attempts:', error);
      }
    );
  }

  loadRecommendations(): void {
    this.analyticService.getPersonalizedRecommendations(this.currentUser.id).subscribe(
      response => {
        this.recommendations = response.data;
      },
      error => {
        console.error('Error loading recommendations:', error);
      }
    );
  }

  logout(): void {
    this.authService.logout();
  }
}