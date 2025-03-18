// certification-analytics.component.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';
import { finalize } from 'rxjs/operators';

interface Certification {
  _id: string;
  name: string;
}

interface CertPassRate {
  _id: string;
  name: string;
  passRate: number;
  totalAttempts: number;
  passCount: number;
}

interface MonthlyTrend {
  month: string;
  passRate: number;
  attempts: number;
  passes: number;
}

interface QuestionPerformance {
  _id: string;
  text: string;
  category: string;
  difficulty: string;
  attempts: number;
  successCount: number;
  successRate: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface DurationDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface TopPerformer {
  userId: string;
  username: string;
  email: string;
  attempts: number;
  passCount: number;
  avgScore: number;
  bestScore: number;
  lastAttempt: Date;
}

@Component({
  selector: 'app-certification-analytics',
  templateUrl: './certification-analytics.component.html',
})
export class CertificationAnalyticsComponent implements OnInit {
  // Filter controls
  dateRange = '30';
  selectedCertification = 'all';
  
  // Data
  certifications: Certification[] = [];
  certPassRates: CertPassRate[] = [];
  monthlyTrends: MonthlyTrend[] = [];
  questionPerformance: QuestionPerformance[] = [];
  scoreDistribution: ScoreDistribution[] = [];
  durationDistribution: DurationDistribution[] = [];
  topPerformers: TopPerformer[] = [];
  
  // UI states
  isLoading = false;
  hasError = false;
  errorMessage = '';

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadCertificationData();
  }

  loadCertificationData(): void {
    this.isLoading = true;
    this.hasError = false;
    
    // Load certification pass rates
    let params = {
      dateRange: parseInt(this.dateRange),
      certificationId: this.selectedCertification,
    }
    this.adminService.getCertificationAnalytics(params)
    .pipe(
      finalize(() => {
        this.isLoading = false;
      })
    )
      .subscribe({
       next: (response) => {
        this.certPassRates = response.data.certPassRates;
        this.monthlyTrends = response.data.monthlyTrends;
        this.scoreDistribution = response.data.scoreDistribution;
        this.durationDistribution = response.data.durationDistribution;
        this.certifications = response.data.certifications;
        this.topPerformers = response.data.topPerformers;
        this.questionPerformance = response.data.questionPerformance;
        
        // Sort by success rate ascending (most problematic questions first)
        this.questionPerformance.sort((a, b) => a.successRate - b.successRate);

        },
       error: (error) => {
          this.hasError = true;
          this.errorMessage = 'Failed to load certification data. Please try again later.';
          console.error('Error loading certification data:', error);
        }
      });
  }

  refreshData(): void {
    this.loadCertificationData();
  }

  exportToCsv(): void {
    // Implementation for CSV export
    if (!this.questionPerformance || this.questionPerformance.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Create CSV content
    const headers = ['Question', 'Category', 'Difficulty', 'Attempts', 'Success Rate (%)'];
    const csvContent = [
      headers.join(','),
      ...this.questionPerformance.map(question => [
        `"${question.text.replace(/"/g, '""')}"`,
        `"${question.category}"`,
        question.difficulty,
        question.attempts,
        question.successRate.toFixed(1)
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `question-performance-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}