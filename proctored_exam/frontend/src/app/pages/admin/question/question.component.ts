// admin-questions.component.ts
import { Component, OnInit, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { NgIfContext } from '@angular/common';
import { NotificationService } from 'src/app/services/notification.service';

interface Certification {
  _id: string;
  name: string;
  code: string;
}

interface Question {
  _id: string;
  text: string;
  certificationId: any;
  domain: string;
  options: Option[];
  correctAnswers: string[];
  explanation: string;
  difficulty: number;
  active: boolean;
  analytics: {
    timesAnswered: number;
    timesCorrect: number;
  };
}

interface Option {
  id: string;
  text: string;
}

interface QuestionFilters {
  certification?: string;
  domain?: string;
  search?: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalQuestions: number;
  totalPages: number;
}

interface Domain {
  _id: string;
  name: string;
  weight: number;
}

@Component({
  selector: 'app-admin-questions',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class AdminQuestionsComponent implements OnInit {
getPaginationPageNum(_t143: number) {
throw new Error('Method not implemented.');
}
  questions: Question[] = [];
  certifications: Certification[] = [];
  domains: Domain[] = [];
  filters: QuestionFilters = {};
  pagination: Pagination = {
    page: 1,
    limit: 10,
    totalQuestions: 0,
    totalPages: 0
  };
  
  showQuestionModal = false;
  showStatsModal = false;
  showDeleteModal = false;
  showImportModal = false;
  showExportModal = false;
  
  modalTitle = 'Add New Question';
  questionForm: any = {
    id: '',
    certificationId: '',
    domain: '',
    text: '',
    options: [],
    correctAnswers: [],
    explanation: '',
    difficulty: 3,
    tags: ''
  };
  
  selectedQuestionId = '';
  questionStats: any = null;
  deleteWarning = false;
  noStats = '';
  
  constructor(
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.filters = {
        certification: params['certification'] || '',
        domain: params['domain'] || '',
        search: params['search'] || ''
      };
      this.pagination.page = parseInt(params['page']) || 1;
      this.pagination.limit = parseInt(params['limit']) || 10;
      
      this.loadQuestions();
    });
    
    this.loadCertifications();
    this.loadDomains();
  }

  loadQuestions(): void {
    this.adminService.getQuestions(this.filters, this.pagination).subscribe({
     next: (data) => {
        this.questions = data.data.questions;
        this.pagination = data.data.pagination;
      },
     error: (error) => this.notificationService.showError(error)
  });
  }

  loadCertifications(): void {
    this.adminService.getCertifications().subscribe({
      next: (data) => {
        this.certifications = data.data.certifications;
      },
      error: (error) => this.notificationService.showError(error)
  });
  }

  loadDomains(): void {
    this.adminService.getAllDomains().subscribe({
     next: (data) => {
      console.log(data.data)
        this.domains = data.data;
      },
     error: (error) => this.notificationService.showError(error)
  });
  }

  applyFilters(filters: QuestionFilters): void {
    this.filters = filters;
    this.pagination.page = 1;
    
    const queryParams: any = { ...filters, page: 1, limit: this.pagination.limit };
    Object.keys(queryParams).forEach(key => {
      if (!queryParams[key]) delete queryParams[key];
    });
    
    this.router.navigate(['/admin/questions'], { queryParams });
  }

  onPageChange(page: number): void {
    this.pagination.page = page;
    
    const queryParams: any = { 
      ...this.filters, 
      page, 
      limit: this.pagination.limit 
    };
    Object.keys(queryParams).forEach(key => {
      if (!queryParams[key]) delete queryParams[key];
    });
    
    this.router.navigate(['/admin/questions'], { queryParams });
  }

  openAddQuestionModal(): void {
    this.resetQuestionForm();
    this.modalTitle = 'Add New Question';
    this.showQuestionModal = true;
    this.addOption();
    this.addOption();
  }
roundNumber(value: number): number {
  return Math.round(value);
}

  openEditQuestionModal(questionId: string): void {
    this.modalTitle = 'Edit Question';
    
    this.adminService.getQuestion(questionId).subscribe(
      data => {
        if (data.success) {
          const question = data.question;
          
          this.questionForm = {
            id: question._id,
            certificationId: question.certificationId,
            domain: question.domain,
            text: question.text,
            options: [],
            correctAnswers: question.correctAnswers,
            explanation: question.explanation || '',
            difficulty: question.difficulty || 3,
            tags: question.tags ? question.tags.join(', ') : ''
          };
          
          this.loadDomainsForCertification(question.certificationId);
          
          // Set options after a slight delay to ensure DOM is ready
          setTimeout(() => {
            question.options.forEach((option: { id: string | undefined; text: string | undefined; }) => {
              this.addOption(option.id, option.text);
            });
          }, 100);
          
          this.showQuestionModal = true;
        }
      },
      error => console.error('Error loading question:', error)
    );
  }

  resetQuestionForm(): void {
    this.questionForm = {
      id: '',
      certificationId: '',
      domain: '',
      text: '',
      options: [],
      correctAnswers: [],
      explanation: '',
      difficulty: 3,
      tags: ''
    };
  }

  loadDomainsForCertification(certId: string): void {
    if (!certId) return;
    
    this.adminService.getCertificationDomains(certId).subscribe({
     next: (data) => {
        if (data.success) {
          // this.domains = data.domains.map((d: any) => d.name);
          this.domains = data.data;
        }
      },
     error: (error) => this.notificationService.showError(error)
  });
  }

  addOption(id?: string, text?: string): void {
    const optionId = id || String.fromCharCode(65 + this.questionForm.options.length);
    this.questionForm.options.push({ id: optionId, text: text || '' });
  }

  removeOption(index: number): void {
    if (this.questionForm.options.length > 2) {
      const removedOption = this.questionForm.options[index];
      this.questionForm.options.splice(index, 1);
      
      // Remove from correct answers if present
      const correctIndex = this.questionForm.correctAnswers.indexOf(removedOption.id);
      if (correctIndex > -1) {
        this.questionForm.correctAnswers.splice(correctIndex, 1);
      }
    }
  }

  toggleCorrectAnswer(optionId: string): void {
    const index = this.questionForm.correctAnswers.indexOf(optionId);
    if (index > -1) {
      this.questionForm.correctAnswers.splice(index, 1);
    } else {
      this.questionForm.correctAnswers.push(optionId);
    }
  }

  isCorrectAnswer(optionId: string): boolean {
    return this.questionForm.correctAnswers.includes(optionId);
  }

  saveQuestion(): void {
    if (!this.validateQuestionForm()) {
      return;
    }
    
    // Process tags
    const tagsInput = this.questionForm.tags;
    const tags = tagsInput ? tagsInput.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [];
    
    const requestData = {
      id: this.questionForm.id || undefined,
      certificationId: this.questionForm.certificationId,
      domain: this.questionForm.domain,
      text: this.questionForm.text,
      options: this.questionForm.options,
      correctAnswers: this.questionForm.correctAnswers,
      explanation: this.questionForm.explanation,
      difficulty: this.questionForm.difficulty,
      tags: tags
    };
    
    this.adminService.saveQuestion(requestData).subscribe(
      data => {
        if (data.success) {
          this.closeQuestionModal();
          this.loadQuestions();
        }
      },
      error => console.error('Error saving question:', error)
    );
  }

  validateQuestionForm(): boolean {
    // Basic validation
    if (!this.questionForm.certificationId || !this.questionForm.domain || !this.questionForm.text) {
      return false;
    }
    
    // Options validation
    if (this.questionForm.options.length < 2) {
      return false;
    }
    
    const hasEmptyOption = this.questionForm.options.some((option: Option) => !option.text.trim());
    if (hasEmptyOption) {
      return false;
    }
    
    // Correct answers validation
    if (this.questionForm.correctAnswers.length === 0) {
      return false;
    }
    
    return true;
  }

  viewQuestionStats(questionId: string): void {
    this.selectedQuestionId = questionId;
    this.showStatsModal = true;
    this.questionStats = null;
    
    this.adminService.getQuestionStats(questionId).subscribe(
      data => {
        if (data.success) {
          this.questionStats = {
            question: data.question,
            stats: data.stats
          };
        }
      },
      error => console.error('Error loading question stats:', error)
    );
  }

  confirmDeleteQuestion(questionId: string): void {
    this.selectedQuestionId = questionId;
    this.deleteWarning = false;
    this.showDeleteModal = true;
    
    this.adminService.getQuestionStats(questionId).subscribe(
      data => {
        if (data.success && data.stats.totalAttempts > 0) {
          this.deleteWarning = true;
        }
      },
      error => console.error('Error checking question usage:', error)
    );
  }

  deleteQuestion(): void {
    this.adminService.deleteQuestion(this.selectedQuestionId).subscribe(
      data => {
        this.closeDeleteModal();
        
        if (data.success) {
          this.loadQuestions();
        }
      },
      error => console.error('Error deleting question:', error)
    );
  }

  openImportModal(): void {
    this.showImportModal = true;
  }

  openExportModal(): void {
    this.showExportModal = true;
  }

  handleImport(data: any): void {
    this.adminService.importQuestions(data).subscribe(
      response => {
        if (response.success) {
          this.closeImportModal();
          this.loadQuestions();
        }
      },
      error => console.error('Error importing questions:', error)
    );
  }

  handleExport(data: any): void {
    const params = {
      format: data.format,
      certificationId: data.certificationId,
      domain: data.domain
    };
    
    this.adminService.exportQuestions(params);
    this.closeExportModal();
  }

  closeQuestionModal(): void {
    this.showQuestionModal = false;
  }

  closeStatsModal(): void {
    this.showStatsModal = false;
    this.questionStats = null;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  closeImportModal(): void {
    this.showImportModal = false;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }
}