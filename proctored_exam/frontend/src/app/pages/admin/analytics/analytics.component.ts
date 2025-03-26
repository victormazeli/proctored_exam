// analytics.component.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';
import { finalize } from 'rxjs/operators';

interface ExamPerformance {
  _id: string;
  examName: string;
  totalAttempts: number;
  passCount: number;
  passRate: number;
  avgScore: number;
  avgDurationMinutes: number;
}

interface Attempt {
  _id: string;
  userId: {
    username: string;
    email: string;
  };
  examId: {
    name: string;
  };
  certificationId: {
    name: string;
  };
  startTime: Date;
  endTime: Date;
  score: {
    overall: number;
  };
  passed: boolean;
}

interface CertPassRate {
  _id: string;
  name: string;
  passRate: number;
  totalAttempts: number;
  passCount: number;
}

interface Certification {
  _id: string;
  name: string;
}

interface TimeTrendData {
  period: string;
  count: number;
  passCount: number;
  passRate: number;
  avgScore: number;
}

interface OverviewStats {
  totalAttempts: number;
  passCount: number;
  passRate: number;
  averageScore: number;
  averageDurationMin: number;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit {
  // Filter controls
  dateRange = '30'; // Default to 30 days
  groupBy = 'day';
  selectedCertification = 'all';
  
  // Search and pagination
  examSearch = '';
  userSearch = '';
  currentPage = 1;
  pageSize = 10;
  totalAttempts = 0;
  
  // Data
  certifications: Certification[] = [];
  examPerformance: ExamPerformance[] = [];
  filteredExamPerformance: ExamPerformance[] = [];
  recentAttempts: Attempt[] = [];
  filteredRecentAttempts: Attempt[] = [];
  certPassRates: CertPassRate[] = [];
  timeTrendData: TimeTrendData[] = [];
  
  // Stats
  overviewStats: OverviewStats = {
    totalAttempts: 0,
    passCount: 0,
    passRate: 0,
    averageScore: 0,
    averageDurationMin: 0
  };
  
  // UI states
  isLoading = false;
  hasError = false;
  errorMessage = '';
  
  // For template use
  Math = Math;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadAnalyticsData();
  }

  loadAnalyticsData(): void {
    this.isLoading = true;
    this.hasError = false;
    
    // Load exam performance data
    let params = {
      dateRange: parseInt(this.dateRange),
      certificationId: this.selectedCertification,
      groupBy: this.groupBy
    }
    this.adminService.getAnalytics(params)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
       next: (response) => {
          this.examPerformance = response.data.examPerformance;
          this.filteredExamPerformance = [...this.examPerformance];
          this.overviewStats = response.data.overviewStats;
          this.certPassRates = response.data.certPassRates;
          this.timeTrendData = response.data.timeTrendData;
          this.recentAttempts = response.data.recentAttempts;
          this.filteredRecentAttempts = [...this.recentAttempts];
          this.totalAttempts = response.data.pagination.total;
          this.certifications = response.data.certifications;
        },
       error: (error) => {
          this.hasError = true;
          this.errorMessage = 'Failed to load analytics data. Please try again later.';
          console.error('Error loading analytics data:', error);
        }
  });
    
  }


  filterExamPerformance(): void {
    if (!this.examSearch.trim()) {
      this.filteredExamPerformance = [...this.examPerformance];
      return;
    }
    
    const searchTerm = this.examSearch.toLowerCase().trim();
    this.filteredExamPerformance = this.examPerformance.filter(exam => 
      exam.examName.toLowerCase().includes(searchTerm)
    );
  }

  filterRecentAttempts(): void {
    if (!this.userSearch.trim()) {
      this.filteredRecentAttempts = [...this.recentAttempts];
      return;
    }
    
    const searchTerm = this.userSearch.toLowerCase().trim();
    this.filteredRecentAttempts = this.recentAttempts.filter(attempt => 
      attempt.userId.username.toLowerCase().includes(searchTerm) ||
      attempt.examId.name.toLowerCase().includes(searchTerm) ||
      (attempt.certificationId && attempt.certificationId.name.toLowerCase().includes(searchTerm))
    );
  }


  changePage(page: number): void {
    this.currentPage = page;
    this.loadAnalyticsData()
  }

  refreshData(): void {
    this.loadAnalyticsData();
  }

  exportToCsv(): void {
    // A simple implementation for CSV export
    if (!this.examPerformance || this.examPerformance.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Exam Name', 'Total Attempts', 'Pass Rate (%)', 'Avg Score (%)', 'Avg Duration (min)'];
    const csvContent = [
      headers.join(','),
      ...this.examPerformance.map(exam => [
        `"${exam.examName}"`,
        exam.totalAttempts,
        exam.passRate.toFixed(1),
        exam.avgScore.toFixed(1),
        exam.avgDurationMinutes.toFixed(0)
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `exam-performance-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}