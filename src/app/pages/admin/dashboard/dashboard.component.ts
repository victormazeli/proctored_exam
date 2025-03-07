// admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';


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
    attemptCount: 0,
    lastWeekAttempts: 0
  };

  recentAttempts: ExamAttempt[] = [];
  certPassRates: CertPassRate[] = [];
  activeExamCount = 0;
  
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

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.getActiveExamCount();
  }

  loadDashboardData(): void {
    this.adminService.getDashboardStats().subscribe(data => {
      this.stats = data.stats;
      this.recentAttempts = data.recentAttempts;
      this.certPassRates = data.certPassRates;
      
      // Update stat cards with actual values
      this.statCards[0].value = this.stats.userCount;
      this.statCards[1].value = this.stats.certificationCount;
      this.statCards[2].value = this.stats.examCount;
      this.statCards[3].value = this.stats.attemptCount;
    });
  }

  getActiveExamCount(): void {
    this.adminService.getActiveExamCount().subscribe(data => {
      this.activeExamCount = data.count;
      this.quickActions[3].description = `${this.activeExamCount} exams in progress`;
    });
  }
}