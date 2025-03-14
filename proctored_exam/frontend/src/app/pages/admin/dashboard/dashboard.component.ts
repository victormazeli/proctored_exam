// Updated admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/models/auth.interface';
import { AdminService } from 'src/app/services/admin.service';
import { AuthService } from 'src/app/services/auth.service';
import { finalize } from 'rxjs/operators';

interface StatCard {
  icon: string;
  iconClass: string;
  title: string;
  value: number | string;
  link: string;
  linkText: string;
  hoverClass: string;
}

interface CertPassRate {
  name: string;
  passRate: number;
  totalAttempts: number;
  passCount: number;
}

interface ExamAttempt {
  _id: string;
  userId: {
    username: string;
  };
  examId: {
    name: string;
  };
  certificationId: {
    name: string;
  };
  endTime: Date;
  score: {
    overall: number;
  };
  passed: boolean;
}

interface QuickAction {
  icon: string;
  title: string;
  description: string;
  link: string;
  bgClass: string;
  hoverClass: string;
  iconBgClass: string;
  iconTextClass: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats = {
    userCount: 0,
    certificationCount: 0,
    examCount: 0,
    questionCount: 0,
    attemptCount: 0,
    lastWeekAttempts: 0
  };

  recentAttempts: ExamAttempt[] = [];
  certPassRates: CertPassRate[] = [];
  activeExamCount = 0;
  
  // Loading and error states
  isLoading = false;
  hasError = false;
  errorMessage = '';
  
  statCards: StatCard[] = [
    {
      icon: 'fas fa-users',
      iconClass: 'bg-blue-100 text-blue-600',
      title: 'Total Users',
      value: 0,
      link: '/admin/users',
      linkText: 'View all users',
      hoverClass: 'hover:text-blue-600'
    },
    {
      icon: 'fas fa-certificate',
      iconClass: 'bg-green-100 text-green-600',
      title: 'Certifications',
      value: 0,
      link: '/admin/certifications',
      linkText: 'Manage certifications',
      hoverClass: 'hover:text-green-600'
    },
    {
      icon: 'fas fa-edit',
      iconClass: 'bg-purple-100 text-purple-600',
      title: 'Practice Exams',
      value: 0,
      link: '/admin/exams',
      linkText: 'Manage exams',
      hoverClass: 'hover:text-purple-600'
    },
    {
      icon: 'fas fa-tasks',
      iconClass: 'bg-yellow-100 text-yellow-600',
      title: 'Total Attempts',
      value: 0,
      link: '/admin/analytics',
      linkText: 'View analytics',
      hoverClass: 'hover:text-yellow-600'
    },
    {
      icon: 'fas fa-question-circle',
      iconClass: 'bg-red-100 text-red-600',
      title: 'Total Questions',
      value: 0,
      link: '/admin/questions',
      linkText: 'Manage questions',
      hoverClass: 'hover:text-red-600'
    }
  ];

  quickActions: QuickAction[] = [
    {
      icon: 'fas fa-plus',
      title: 'Add New Question',
      description: 'Create a new question for any certification',
      link: '/admin/questions/create',
      bgClass: 'bg-blue-50',
      hoverClass: 'hover:bg-blue-100',
      iconBgClass: 'bg-blue-100',
      iconTextClass: 'text-blue-600'
    },
    {
      icon: 'fas fa-file-alt',
      title: 'Create Practice Exam',
      description: 'Set up a new practice exam',
      link: '/admin/exams/create',
      bgClass: 'bg-green-50',
      hoverClass: 'hover:bg-green-100',
      iconBgClass: 'bg-green-100',
      iconTextClass: 'text-green-600'
    },
    {
      icon: 'fas fa-file-import',
      title: 'Import Questions',
      description: 'Bulk import questions from CSV',
      link: '/admin/questions/import',
      bgClass: 'bg-purple-50',
      hoverClass: 'hover:bg-purple-100',
      iconBgClass: 'bg-purple-100',
      iconTextClass: 'text-purple-600'
    },
    {
      icon: 'fas fa-video',
      title: 'Active Proctored Exams',
      description: '0 exams in progress',
      link: '/admin/active-exams',
      bgClass: 'bg-yellow-50',
      hoverClass: 'hover:bg-yellow-100',
      iconBgClass: 'bg-yellow-100',
      iconTextClass: 'text-yellow-600'
    }
  ];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalAttempts = 0;

  // Search
  searchTerm = '';

  constructor(private adminService: AdminService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.getActiveExamCount();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.adminService.getDashboardStats()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(
        data => {
          this.stats = data.stats;
          this.recentAttempts = data.recentAttempts;
          this.certPassRates = data.certPassRates;
          this.totalAttempts = data.totalAttemptsCount || 0;
          
          // Update stat cards with actual values
          this.statCards[0].value = this.stats.userCount;
          this.statCards[1].value = this.stats.certificationCount;
          this.statCards[2].value = this.stats.examCount;
          this.statCards[3].value = this.stats.attemptCount;
          this.statCards[4].value = this.stats.questionCount;
        },
        error => {
          this.hasError = true;
          this.errorMessage = 'Failed to load dashboard data. Please try again later.';
          console.error('Error loading dashboard data:', error);
        }
      );
  }

  getActiveExamCount(): void {
    this.adminService.getActiveExamCount().subscribe(
      data => {
        this.activeExamCount = data.count;
        this.quickActions[3].description = `${this.activeExamCount} exams in progress`;
      },
      error => {
        console.error('Error fetching active exam count:', error);
      }
    );
  }

  searchAttempts(): void {
    this.currentPage = 1;
    this.loadAttemptsWithFilters();
  }

  loadAttemptsWithFilters(): void {
    this.isLoading = true;
    this.adminService.getFilteredAttempts(this.searchTerm, this.currentPage, this.pageSize)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(
        data => {
          this.recentAttempts = data.attempts;
          this.totalAttempts = data.total;
        },
        error => {
          console.error('Error loading filtered attempts:', error);
        }
      );
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadAttemptsWithFilters();
  }

  refreshData(): void {
    this.loadDashboardData();
    this.getActiveExamCount();
  }

  currentPageCalculation(totalAttempts: number, pageSize: number): number {
    return Math.ceil(totalAttempts / pageSize)
  }
}