// admin-lessons.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { TutorialService } from 'src/app/services/tutorial.service';
import { LessonService } from 'src/app/services/lesson.service';
import { NotificationService } from 'src/app/services/notification.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from 'ngx-markdown';

@Component({
  selector: 'app-admin-lessons',
  templateUrl: './admin-lessons.component.html',
  styleUrls: ['./admin-lessons.component.css']
})
export class AdminLessonsComponent implements OnInit {
  tutorialId: string = '';
  tutorial: any = null;
  lessons: any[] = [];
  domains: any[] = [];
  showLessonModal: boolean = false;
  showReorderModal: boolean = false;
  showExerciseModal: boolean = false;
  showExerciseEditModal: boolean = false;
  showPreviewModal: boolean = false;
  showDeleteModal: boolean = false;
  modalTitle: string = '';
  activeTab: string = 'edit';
  markdownPreview: SafeHtml = '';
  lessonForm: any = {
    id: null,
    title: '',
    content: '',
    order: 0,
    estimatedTime: 15
  };
  domainMappings: { [key: string]: number } = {};
  currentLesson: any = null;
  exerciseForm: any = {
    title: '',
    description: '',
    instructions: '',
    expectedOutput: '',
    solution: '',
    difficulty: 'intermediate',
    estimatedTime: 20,
    hints: []
  };
  isNewExercise: boolean = true;
  currentExerciseIndex: number = -1;
  reorderLessons: any[] = [];
  previewLesson: any = null;
  previewHtml: SafeHtml = '';
  deleteId: string = '';
  deleteWarning: boolean = false;
  
  @ViewChild('lessonFormEl') lessonFormEl!: NgForm;
  @ViewChild('exerciseFormEl') exerciseFormEl!: NgForm;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorialService: TutorialService,
    private lessonService: LessonService,
    private notificationService: NotificationService,
    private sanitizer: DomSanitizer,
    private markdownService: MarkdownService
  ) {}
  
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tutorialId = params['id'];
      this.loadTutorial();
      this.loadLessons();
    });
  }
  
  loadTutorial(): void {
    this.tutorialService.getTutorial(this.tutorialId).subscribe(
      response => {
        if (response.success) {
          this.tutorial = response.data;
          this.domains = this.tutorial.certificationId.domains || [];
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
  
  loadLessons(): void {
    this.lessonService.getLessons(this.tutorialId).subscribe(
      response => {
        if (response.success) {
          this.lessons = response.data.lessons || [];
        } else {
          this.notificationService.showError('Failed to load lessons');
        }
      },
      error => {
        console.error('Error loading lessons:', error);
        this.notificationService.showError('Failed to load lessons');
      }
    );
  }
  
  openAddLessonModal(): void {
    this.modalTitle = 'Add New Lesson';
    this.lessonForm = {
      id: null,
      title: '',
      content: '',
      order: this.lessons.length + 1,
      estimatedTime: 15
    };
    this.activeTab = 'edit';
    this.markdownPreview = '';
    this.resetDomainMappings();
    this.showLessonModal = true;
  }
  
  openEditLessonModal(id: string): void {
    this.modalTitle = 'Edit Lesson';
    this.lessonService.getLesson(id).subscribe(
      response => {
        if (response.success) {
          const lesson = response.data.lesson;
          this.lessonForm = {
            id: lesson._id,
            title: lesson.title,
            content: lesson.content,
            order: lesson.order,
            estimatedTime: lesson.estimatedTime
          };
          this.resetDomainMappings();
          
          // Set domain mappings
          if (lesson.domainMappings && lesson.domainMappings.length > 0) {
            lesson.domainMappings.forEach((mapping: any) => {
              this.domainMappings[mapping.domainId] = mapping.relevanceScore;
            });
          }
          
          this.activeTab = 'edit';
          this.updateMarkdownPreview();
          this.showLessonModal = true;
        } else {
          this.notificationService.showError('Failed to load lesson details');
        }
      },
      error => {
        console.error('Error loading lesson details:', error);
        this.notificationService.showError('Failed to load lesson details');
      }
    );
  }
  
  resetDomainMappings(): void {
    this.domainMappings = {};
    this.domains.forEach(domain => {
      this.domainMappings[domain.name] = 0;
    });
  }
  
  async updateMarkdownPreview(): Promise<void> {
    if (this.activeTab === 'preview' && this.lessonForm.content) {
      const html = await this.markdownService.parse(this.lessonForm.content);
      this.markdownPreview = this.sanitizer.bypassSecurityTrustHtml(html);
    }
  }
  
  closeLessonModal(): void {
    this.showLessonModal = false;
  }
  
  saveLesson(): void {
    if (this.lessonFormEl.invalid) {
      this.notificationService.showError('Please fill all required fields');
      return;
    }
    
    // Convert domain mappings to array format
    const domainMappingsArray = Object.keys(this.domainMappings)
      .filter(domainId => this.domainMappings[domainId] > 0)
      .map(domainId => ({
        domainId,
        relevanceScore: this.domainMappings[domainId]
      }));
    
    const lessonData = {
      ...this.lessonForm,
      tutorialId: this.tutorialId,
      domainMappings: domainMappingsArray
    };
    
    const saveObservable = this.lessonForm.id
      ? this.lessonService.updateLesson(this.lessonForm.id, lessonData)
      : this.lessonService.createLesson(lessonData);
    
    saveObservable.subscribe(
      response => {
        if (response.success) {
          this.notificationService.showSuccess(
            this.lessonForm.id ? 'Lesson updated successfully' : 'Lesson created successfully'
          );
          this.closeLessonModal();
          this.loadLessons();
        } else {
          this.notificationService.showError(response.message || 'Failed to save lesson');
        }
      },
      error => {
        console.error('Error saving lesson:', error);
        this.notificationService.showError('Failed to save lesson');
      }
    );
  }
  
  openReorderModal(): void {
    this.reorderLessons = [...this.lessons].sort((a, b) => a.order - b.order);
    this.showReorderModal = true;
  }
  
  closeReorderModal(): void {
    this.showReorderModal = false;
  }
  
  saveReordering(): void {
    const lessonOrder = this.reorderLessons.map((lesson, index) => ({
      id: lesson._id,
      order: index + 1
    }));
    
    this.lessonService.reorderLessons(this.tutorialId, lessonOrder).subscribe(
      response => {
        if (response.success) {
          this.notificationService.showSuccess('Lesson order updated successfully');
          this.closeReorderModal();
          this.loadLessons();
        } else {
          this.notificationService.showError(response.message || 'Failed to update lesson order');
        }
      },
      error => {
        console.error('Error reordering lessons:', error);
        this.notificationService.showError('Failed to update lesson order');
      }
    );
  }
  
  openExerciseManager(lessonId: string): void {
    this.lessonService.getLesson(lessonId).subscribe(
      response => {
        if (response.success) {
          this.currentLesson = response.data.lesson;
          this.showExerciseModal = true;
        } else {
          this.notificationService.showError('Failed to load lesson details');
        }
      },
      error => {
        console.error('Error loading lesson details:', error);
        this.notificationService.showError('Failed to load lesson details');
      }
    );
  }
  
  closeExerciseModal(): void {
    this.showExerciseModal = false;
    this.currentLesson = null;
  }
  
  addExercise(): void {
    this.isNewExercise = true;
    this.currentExerciseIndex = -1;
    this.exerciseForm = {
      title: '',
      description: '',
      instructions: '',
      expectedOutput: '',
      solution: '',
      difficulty: 'intermediate',
      estimatedTime: 20,
      hints: []
    };
    this.showExerciseEditModal = true;
  }
  
  editExercise(index: number): void {
    this.isNewExercise = false;
    this.currentExerciseIndex = index;
    const exercise = this.currentLesson.practicalExercises[index];
    
    this.exerciseForm = {
      title: exercise.title,
      description: exercise.description,
      instructions: exercise.instructions,
      expectedOutput: exercise.expectedOutput || '',
      solution: exercise.solution || '',
      difficulty: exercise.difficulty || 'intermediate',
      estimatedTime: exercise.estimatedTime || 20,
      hints: [...(exercise.hints || [])]
    };
    
    this.showExerciseEditModal = true;
  }
  
  closeExerciseEditModal(): void {
    this.showExerciseEditModal = false;
  }
  
  addHint(): void {
    this.exerciseForm.hints.push({
      text: '',
      order: this.exerciseForm.hints.length + 1
    });
  }
  
  removeHint(index: number): void {
    this.exerciseForm.hints.splice(index, 1);
    // Update order
    this.exerciseForm.hints.forEach((hint: any, idx: number) => {
      hint.order = idx + 1;
    });
  }
  
  saveExercise(): void {
    if (this.exerciseFormEl.invalid) {
      this.notificationService.showError('Please fill all required fields');
      return;
    }
    
    // Filter out empty hints
    this.exerciseForm.hints = this.exerciseForm.hints.filter((hint: any) => hint.text.trim() !== '');
    
    if (!this.currentLesson.practicalExercises) {
      this.currentLesson.practicalExercises = [];
    }
    
    if (this.isNewExercise) {
      // Add new exercise
      this.currentLesson.practicalExercises.push(this.exerciseForm);
    } else {
      // Update existing exercise
      this.currentLesson.practicalExercises[this.currentExerciseIndex] = this.exerciseForm;
    }
    
    // Save the lesson with updated exercises
    this.lessonService.updateLesson(this.currentLesson._id, {
      practicalExercises: this.currentLesson.practicalExercises
    }).subscribe(
      response => {
        if (response.success) {
          this.notificationService.showSuccess(
            this.isNewExercise ? 'Exercise added successfully' : 'Exercise updated successfully'
          );
          this.closeExerciseEditModal();
          // Refresh the current lesson
          this.openExerciseManager(this.currentLesson._id);
          // Refresh the lessons list
          this.loadLessons();
        } else {
          this.notificationService.showError(response.message || 'Failed to save exercise');
        }
      },
      error => {
        console.error('Error saving exercise:', error);
        this.notificationService.showError('Failed to save exercise');
      }
    );
  }
  
  removeExercise(index: number): void {
    if (confirm('Are you sure you want to remove this exercise?')) {
      this.currentLesson.practicalExercises.splice(index, 1);
      
      // Save the lesson with updated exercises
      this.lessonService.updateLesson(this.currentLesson._id, {
        practicalExercises: this.currentLesson.practicalExercises
      }).subscribe(
        response => {
          if (response.success) {
            this.notificationService.showSuccess('Exercise removed successfully');
            // Refresh the lessons list
            this.loadLessons();
          } else {
            this.notificationService.showError(response.message || 'Failed to remove exercise');
          }
        },
        error => {
          console.error('Error removing exercise:', error);
          this.notificationService.showError('Failed to remove exercise');
        }
      );
    }
  }
  
  async previewLessonFunc(id: string): Promise<void> {
    this.lessonService.getLesson(id).subscribe(
      async response => {
        if (response.success) {
          this.previewLesson = response.data.lesson;
          const html = await this.markdownService.parse(this.previewLesson.content);
          this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
          this.showPreviewModal = true;
        } else {
          this.notificationService.showError('Failed to load lesson details');
        }
      },
      error => {
        console.error('Error loading lesson details:', error);
        this.notificationService.showError('Failed to load lesson details');
      }
    );
  }
  
  async formatMarkdown(text: string): Promise<SafeHtml> {
    const html = await this.markdownService.parse(text);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
  
  closePreviewModal(): void {
    this.showPreviewModal = false;
    this.previewLesson = null;
    this.previewHtml = '';
  }
  
  viewExercises(lesson: any): void {
    this.openExerciseManager(lesson._id);
  }
  
  confirmDeleteLesson(id: string): void {
    this.deleteId = id;
    
    // Check if lesson has user progress
    this.lessonService.checkLessonUsage(id).subscribe(
      response => {
        this.deleteWarning = response.data.hasProgress;
        this.showDeleteModal = true;
      },
      error => {
        console.error('Error checking lesson usage:', error);
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
  
  deleteLesson(): void {
    if (!this.deleteId) {
      return;
    }
    
    this.lessonService.deleteLesson(this.deleteId).subscribe(
      response => {
        if (response.success) {
          this.notificationService.showSuccess('Lesson deleted successfully');
          this.closeDeleteModal();
          this.loadLessons();
        } else {
          this.notificationService.showError(response.message || 'Failed to delete lesson');
        }
      },
      error => {
        console.error('Error deleting lesson:', error);
        this.notificationService.showError('Failed to delete lesson');
      }
    );
  }
  
  toggleLessonStatus(lesson: any): void {
    const newStatus = !lesson.active;
    
    this.lessonService.updateLessonStatus(lesson._id, newStatus).subscribe(
      response => {
        if (response.success) {
          lesson.active = newStatus;
          this.notificationService.showSuccess(
            newStatus ? 'Lesson activated' : 'Lesson deactivated'
          );
        } else {
          this.notificationService.showError('Failed to update lesson status');
        }
      },
      error => {
        console.error('Error updating lesson status:', error);
        this.notificationService.showError('Failed to update lesson status');
      }
    );
  }
  
  openEditTutorialModal(): void {
    // Navigate to tutorial edit page
    this.router.navigate(['/admin/tutorials'], { 
      queryParams: { action: 'edit', id: this.tutorialId } 
    });
  }
}