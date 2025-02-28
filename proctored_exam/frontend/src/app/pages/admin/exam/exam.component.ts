// admin-exams.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../services/admin.service'

interface Certification {
  _id: string;
  name: string;
  code: string;
  timeLimit: number;
  domains: any[];
  // Other certification properties
}

interface Exam {
  _id: string;
  name: string;
  certificationId: any;
  questionCount: number;
  timeLimit: number | null;
  randomize: boolean;
  showResults: boolean;
  active: boolean;
  createdAt: Date;
  createdBy: any;
}

@Component({
  selector: 'app-admin-exams',
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.css']
})
export class AdminExamsComponent implements OnInit {
  exams: Exam[] = [];
  certifications: Certification[] = [];
  selectedCertification: string = '';
  showExamModal = false;
  showDeleteModal = false;
  modalTitle = 'Create New Exam';
  examForm: any = {
    id: '',
    name: '',
    certificationId: '',
    description: '',
    questionCount: 65,
    timeLimit: '',
    randomize: true,
    showResults: true
  };
  certificationInfo: {
    timeLimit?: number;
    questionCount?: number;
  } = {};
  questionCountWarning = false;
  examToDelete: string = '';
  deleteWarning = false;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.selectedCertification = params['certification'] || '';
      this.loadExams();
    });
    this.loadCertifications();
  }

  loadExams(): void {
    const params = this.selectedCertification ? { certification: this.selectedCertification } : {};
    this.adminService.getExams(params).subscribe(
      data => {
        this.exams = data.exams;
      },
      error => console.error('Error loading exams:', error)
    );
  }

  loadCertifications(): void {
    this.adminService.getCertifications().subscribe(
      data => {
        this.certifications = data.certifications;
      },
      error => console.error('Error loading certifications:', error)
    );
  }

  onCertificationFilterChange(): void {
    if (this.selectedCertification) {
      this.router.navigate(['/admin/exams'], { 
        queryParams: { certification: this.selectedCertification } 
      });
    } else {
      this.router.navigate(['/admin/exams']);
    }
  }

  openAddExamModal(): void {
    this.resetForm();
    this.modalTitle = 'Create New Exam';
    this.showExamModal = true;
    
    // Initialize with certification if filter is active
    if (this.selectedCertification) {
      this.examForm.certificationId = this.selectedCertification;
      this.loadCertificationInfo();
    }
  }

  openEditExamModal(examId: string): void {
    this.modalTitle = 'Edit Exam';
    
    this.adminService.getExam(examId).subscribe(
      data => {
        if (data.success) {
          const exam = data.exam;
          
          this.examForm = {
            id: exam._id,
            name: exam.name,
            certificationId: exam.certificationId,
            description: exam.description || '',
            questionCount: exam.questionCount,
            timeLimit: exam.timeLimit || '',
            randomize: exam.randomize,
            showResults: exam.showResults
          };
          
          this.loadCertificationInfo();
          this.showExamModal = true;
        }
      },
      error => console.error('Error fetching exam:', error)
    );
  }

  duplicateExam(examId: string): void {
    this.adminService.getExam(examId).subscribe(
      data => {
        if (data.success) {
          const exam = data.exam;
          
          this.examForm = {
            id: '',
            name: `${exam.name} (Copy)`,
            certificationId: exam.certificationId,
            description: exam.description || '',
            questionCount: exam.questionCount,
            timeLimit: exam.timeLimit || '',
            randomize: exam.randomize,
            showResults: exam.showResults
          };
          
          this.modalTitle = 'Create New Exam';
          this.loadCertificationInfo();
          this.showExamModal = true;
        }
      },
      error => console.error('Error fetching exam for duplication:', error)
    );
  }

  resetForm(): void {
    this.examForm = {
      id: '',
      name: '',
      certificationId: '',
      description: '',
      questionCount: 65,
      timeLimit: '',
      randomize: true,
      showResults: true
    };
    this.certificationInfo = {};
    this.questionCountWarning = false;
  }

  loadCertificationInfo(): void {
    const certId = this.examForm.certificationId;
    if (!certId) {
      this.certificationInfo = {};
      return;
    }
    
    this.adminService.getCertification(certId).subscribe(
      data => {
        if (data.success) {
          const cert = data.certification;
          this.certificationInfo.timeLimit = cert.timeLimit;
          
          this.adminService.getQuestionCount(certId).subscribe(
            countData => {
              if (countData.success) {
                this.certificationInfo.questionCount = countData.count;
                
                // Update default question count based on what's available
                const defaultCount = Math.min(65, countData.count);
                this.examForm.questionCount = defaultCount > 0 ? defaultCount : 1;
                
                this.validateQuestionCount();
              }
            },
            error => console.error('Error checking question count:', error)
          );
        }
      },
      error => console.error('Error loading certification info:', error)
    );
  }

  validateQuestionCount(): void {
    const certId = this.examForm.certificationId;
    const requestedCount = parseInt(this.examForm.questionCount);
    
    if (!certId || isNaN(requestedCount)) {
      this.questionCountWarning = false;
      return;
    }
    
    this.adminService.getQuestionCount(certId).subscribe(
      data => {
        if (data.success) {
          const availableCount = data.count;
          this.questionCountWarning = requestedCount > availableCount;
        }
      },
      error => console.error('Error checking question count:', error)
    );
  }

  saveExam(): void {
    if (!this.validateExamForm()) {
      return;
    }
    
    const requestData = {
      id: this.examForm.id || undefined,
      name: this.examForm.name,
      certificationId: this.examForm.certificationId,
      description: this.examForm.description,
      questionCount: parseInt(this.examForm.questionCount),
      timeLimit: this.examForm.timeLimit ? parseInt(this.examForm.timeLimit) : null,
      randomize: this.examForm.randomize,
      showResults: this.examForm.showResults
    };
    
    const isUpdate = !!requestData.id;
    
    this.adminService.saveExam(requestData, isUpdate).subscribe(
      data => {
        if (data.success) {
          this.closeExamModal();
          this.loadExams();
        }
      },
      error => console.error(`Error ${isUpdate ? 'updating' : 'creating'} exam:`, error)
    );
  }

  validateExamForm(): boolean {
    // Check required fields
    if (!this.examForm.certificationId) {
      return false;
    }
    
    if (!this.examForm.name) {
      return false;
    }
    
    const questionCount = parseInt(this.examForm.questionCount);
    if (isNaN(questionCount) || questionCount < 1) {
      return false;
    }
    
    // Check time limit if provided
    const timeLimit = this.examForm.timeLimit;
    if (timeLimit && (isNaN(parseInt(timeLimit)) || parseInt(timeLimit) < 1)) {
      return false;
    }
    
    return true;
  }

  confirmDeleteExam(examId: string): void {
    this.examToDelete = examId;
    this.deleteWarning = false;
    this.showDeleteModal = true;
    
    this.adminService.getExamAttemptsCount(examId).subscribe(
      data => {
        if (data.success && data.count > 0) {
          this.deleteWarning = true;
        }
      },
      error => console.error('Error checking exam usage:', error)
    );
  }

  deleteExam(): void {
    this.adminService.deleteExam(this.examToDelete).subscribe(
      data => {
        this.closeDeleteModal();
        
        if (data.success) {
          this.loadExams();
        }
      },
      error => console.error('Error deleting exam:', error)
    );
  }

  toggleExamStatus(exam: Exam): void {
    const newStatus = !exam.active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this exam?`)) {
      return;
    }
    
    this.adminService.updateExamStatus(exam._id, newStatus).subscribe(
      data => {
        if (data.success) {
          exam.active = newStatus;
        }
      },
      error => console.error(`Error ${action}ing exam:`, error)
    );
  }

  closeExamModal(): void {
    this.showExamModal = false;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.examToDelete = '';
  }
}