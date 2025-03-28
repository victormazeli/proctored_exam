import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { TutorialService } from 'src/app/services/tutorial.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ExamService } from 'src/app/services/exam.service';

@Component({
  selector: 'app-admin-tutorials',
  templateUrl: './admin-tutorials.component.html',
  styleUrls: ['./admin-tutorials.component.css']
})
export class AdminTutorialsComponent implements OnInit {
  tutorials: any[] = [];
  certifications: any[] = [];
  selectedCertification: string = '';
  showTutorialModal: boolean = false;
  showImportModal: boolean = false;
  showDeleteModal: boolean = false;
  modalTitle: string = '';
  tutorialForm: any = {
    id: null,
    title: '',
    description: '',
    certificationId: '',
    order: 0
  };
  importFile: File | null = null;
  isDragging: boolean = false;
  importResult: any = null;
  importError: string = '';
  isImporting: boolean = false;
  deleteId: string = '';
  deleteWarning: boolean = false;
  
  @ViewChild('tutorialFormEl') tutorialFormEl!: NgForm;
  
  constructor(
    private tutorialService: TutorialService,
    private examService: ExamService,
    private notificationService: NotificationService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadTutorials();
    this.loadCertifications();
  }
  
  loadTutorials(): void {
    this.tutorialService.getAdminTutorials(this.selectedCertification).subscribe(
      response => {
        if (response.success) {
          this.tutorials = response.data.tutorials;
        } else {
          this.notificationService.showError('Failed to load tutorials');
        }
      },
      error => {
        console.error('Error loading tutorials:', error);
        this.notificationService.showError('Failed to load tutorials');
      }
    );
  }
  
  loadCertifications(): void {
    this.examService.getCertifications().subscribe(
      response => {
        if (response.success) {
          this.certifications = response.data;
        } else {
          this.notificationService.showError('Failed to load certifications');
        }
      },
      error => {
        console.error('Error loading certifications:', error);
        this.notificationService.showError('Failed to load certifications');
      }
    );
  }
  
  onCertificationFilterChange(): void {
    this.loadTutorials();
  }
  
  openAddTutorialModal(): void {
    this.modalTitle = 'Create New Tutorial';
    this.tutorialForm = {
      id: null,
      title: '',
      description: '',
      certificationId: this.selectedCertification || '',
      order: 0
    };
    this.showTutorialModal = true;
    document.body.classList.add('modal-open');
  }
  
  openEditTutorialModal(id: string): void {
    this.modalTitle = 'Edit Tutorial';
    this.tutorialService.getTutorial(id).subscribe(
      response => {
        if (response.success) {
          const tutorial = response.data;
          this.tutorialForm = {
            id: tutorial._id,
            title: tutorial.title,
            description: tutorial.description,
            certificationId: tutorial.certificationId._id,
            order: tutorial.order
          };
          this.showTutorialModal = true;
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
  
  closeTutorialModal(): void {
    this.showTutorialModal = false;
  }
  
  saveTutorial(): void {
    if (this.tutorialFormEl.invalid) {
      this.notificationService.showError('Please fill all required fields');
      return;
    }
    
    const saveObservable = this.tutorialForm.id
      ? this.tutorialService.updateTutorial(this.tutorialForm.id, this.tutorialForm)
      : this.tutorialService.createTutorial(this.tutorialForm);
    
    saveObservable.subscribe(
      response => {
        if (response.success) {
          this.notificationService.showSuccess(
            this.tutorialForm.id ? 'Tutorial updated successfully' : 'Tutorial created successfully'
          );
          this.closeTutorialModal();
          this.loadTutorials();
        } else {
          this.notificationService.showError(response.message || 'Failed to save tutorial');
        }
      },
      error => {
        console.error('Error saving tutorial:', error);
        this.notificationService.showError('Failed to save tutorial');
      }
    );
  }
  
  confirmDeleteTutorial(id: string): void {
    this.deleteId = id;
    
    // Check if tutorial has user progress
    this.tutorialService.checkTutorialUsage(id).subscribe(
      response => {
        this.deleteWarning = response.data.hasProgress;
        this.showDeleteModal = true;
      },
      error => {
        console.error('Error checking tutorial usage:', error);
        // If error, just show the modal without warning
        this.deleteWarning = false;
        this.showDeleteModal = true;
      }
    );
  }
  
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteId = '';
    this.deleteWarning = false;
  }
  
  deleteTutorial(): void {
    if (!this.deleteId) {
      return;
    }
    
    this.tutorialService.deleteTutorial(this.deleteId).subscribe(
      response => {
        if (response.success) {
          this.notificationService.showSuccess('Tutorial deleted successfully');
          this.closeDeleteModal();
          this.loadTutorials();
        } else {
          this.notificationService.showError(response.message || 'Failed to delete tutorial');
        }
      },
      error => {
        console.error('Error deleting tutorial:', error);
        this.notificationService.showError('Failed to delete tutorial');
      }
    );
  }
  
  toggleTutorialStatus(tutorial: any): void {
    const newStatus = !tutorial.active;
    
    this.tutorialService.updateTutorialStatus(tutorial._id, newStatus).subscribe(
      response => {
        if (response.success) {
          tutorial.active = newStatus;
          this.notificationService.showSuccess(
            newStatus ? 'Tutorial activated' : 'Tutorial deactivated'
          );
        } else {
          this.notificationService.showError('Failed to update tutorial status');
        }
      },
      error => {
        console.error('Error updating tutorial status:', error);
        this.notificationService.showError('Failed to update tutorial status');
      }
    );
  }
  
  openImportModal(): void {
    this.importFile = null;
    this.importResult = null;
    this.importError = '';
    this.isImporting = false;
    this.showImportModal = true;
  }
  
  closeImportModal(): void {
    this.showImportModal = false;
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }
  
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json') {
        this.importFile = file;
      } else {
        this.notificationService.showError('Only JSON files are allowed');
      }
    }
  }
  
  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      this.importFile = fileInput.files[0];
    }
  }
  
  clearSelectedFile(): void {
    this.importFile = null;
  }
  
  importTutorial(): void {
    if (!this.importFile) {
      return;
    }
    
    this.isImporting = true;
    this.importError = '';
    this.importResult = null;
    
    const formData = new FormData();
    formData.append('tutorialFile', this.importFile);
    
    this.tutorialService.importTutorial(formData).subscribe(
      response => {
        this.isImporting = false;
        if (response.success) {
          this.importResult = response.data;
          this.importFile = null;
          // Refresh the tutorial list
          this.loadTutorials();
        } else {
          this.importError = response.message || 'Import failed';
        }
      },
      error => {
        this.isImporting = false;
        console.error('Error importing tutorial:', error);
        this.importError = error.error?.message || 'Import failed';
      }
    );
  }
  
  downloadTemplateFile(event: Event): void {
    event.preventDefault();
    // This will trigger a download of the template file
    window.location.href = '/api/admin/tutorials/template';
  }
  
  exportTutorial(id: string): void {
    window.location.href = `/api/admin/tutorials/${id}/export`;
  }
}