// lesson.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LessonService } from '../../services/lesson.service';
import { MarkdownService } from 'ngx-markdown';
import { AuthService } from '../../services/auth.service';

// Define interfaces for our data types
interface Lesson {
  _id: string;
  title: string;
  content: string;
  estimatedTime: number;
  practicalExercises: PracticalExercise[];
  // ...other fields
}

interface PracticalExercise {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  expectedOutput: string;
  solution: string;
  hints: { text: string; order: number; _id: string }[];
  difficulty: string;
  estimatedTime: number;
}

interface LessonProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  completionPercentage: number;
  lastAccessedAt: string;
}

interface ExerciseCompletion {
  exerciseId: string;
  status: 'completed' | 'in_progress';
  score?: number;
  completedAt?: string;
}

@Component({
  selector: 'app-lesson',
  templateUrl: './lesson.component.html',
  encapsulation: ViewEncapsulation.None // To allow markdown styling to work properly
})
export class LessonComponent implements OnInit {
  lessonId: string = '';
  lesson: any = null;
  tutorial: any = null;
  navigation: any = null;
  lessonContent: SafeHtml = '';
  loading: boolean = true;
  error: string = '';
  currentUser: any;
  timeSpent: number = 0;
  progressTimer: any;
  contentLoaded: boolean = false;
  activeTab: string = 'content';
  practicalExercises: any[] = [];
  exerciseCompletionStatus: any[] = [];
  progress: any = null;
  exerciseInProgress: number | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService,
    private sanitizer: DomSanitizer,
    private markdownService: MarkdownService,
    private authService: AuthService
  ) { }
  
  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.route.params.subscribe(params => {
      this.lessonId = params['id'];
      this.loadLessonDetails();
    });
    
    // Check if returning from an exercise
    this.route.queryParams.subscribe(params => {
      if (params['exerciseCompleted'] === 'true') {
        this.setActiveTab('exercises');
      }
    });
    
    // Start tracking time spent on lesson
    this.startProgressTimer();
  }
  
  ngOnDestroy(): void {
    this.stopProgressTimer();
    this.updateProgress();
  }
  
  loadLessonDetails(): void {
    this.loading = true;
    this.lessonService.getLessonDetails(this.lessonId).subscribe(
      async (response) => {
        if (response.success) {
          // Extract data from the response structure
          this.lesson = response.data.lesson;
          this.tutorial = response.data.tutorial;
          this.navigation = response.data.navigation;
          this.progress = response.data.progress;
          this.exerciseCompletionStatus = response.data.exerciseCompletionStatus || [];
          this.practicalExercises = this.lesson.practicalExercises || [];
          
          // Update exercise progress status based on completion data
          this.updateExerciseProgressStatus();
          
          // Parse markdown content
          if (this.lesson.content) {
            try {
              const parsedContent = await this.markdownService.parse(this.lesson.content);
              this.lessonContent = this.sanitizer.bypassSecurityTrustHtml(parsedContent);
            } catch (error) {
              console.error('Error parsing markdown content:', error);
              this.lessonContent = this.sanitizer.bypassSecurityTrustHtml(
                '<div class="whitespace-pre-line">' + this.lesson.content + '</div>'
              );
            }
          } else {
            this.lessonContent = this.sanitizer.bypassSecurityTrustHtml(
              '<div class="text-gray-500 italic">No content available for this lesson.</div>'
            );
          }
          
          this.contentLoaded = true;
          this.updateLessonStarted();
        } else {
          this.error = 'Failed to load lesson details';
        }
        this.loading = false;
      },
      error => {
        console.error('Error loading lesson details:', error);
        this.error = 'Failed to load lesson details';
        this.loading = false;
      }
    );
  }

  updateExerciseProgressStatus(): void {
    // Map completion status to exercises
    if (this.practicalExercises && this.exerciseCompletionStatus) {
      this.practicalExercises.forEach((exercise, index) => {
        const completionData = this.exerciseCompletionStatus.find(
          (status) => status.exerciseIndex === index
        );
        
        if (completionData) {
          if (!exercise.progress) {
            exercise.progress = {};
          }
          exercise.progress.status = completionData.status;
          exercise.progress.completedAt = completionData.completedAt;
          exercise.progress.score = completionData.score;
          exercise.progress.completionPercentage = 100;
        }
      });
    }
  }
  
  updateLessonStarted(): void {
    // Only update if this is the first time viewing or in_progress
    if (!this.progress || this.progress.status === 'not_started') {
      this.lessonService.updateLessonProgress(this.lessonId, {
        timeSpent:this.timeSpent,
        completionPercentage: 0
      }).subscribe(
        response => {
          if (response.success) {
            this.progress = response.data.progress;
          }
        },
        error => {
          console.error('Error updating lesson progress:', error);
        }
      );
    }
  }
  
  markAsCompleted(): void {
    this.lessonService.updateLessonProgress(this.lessonId, {
      timeSpent:this.timeSpent,
      completionPercentage: 100
    }).subscribe(
      response => {
        if (response.success) {
          this.progress = response.data.progress;
          
          // If there's a next lesson, navigate to it
          if (this.navigation && this.navigation.nextLesson) {
            this.router.navigate(['/lessons', this.navigation.nextLesson._id]);
          } else {
            // Otherwise go back to tutorial
            this.backToTutorial();
          }
        }
      },
      error => {
        console.error('Error marking lesson as completed:', error);
      }
    );
  }
  
  startProgressTimer(): void {
    this.progressTimer = setInterval(() => {
      this.timeSpent += 5;
      this.updateProgress();
    }, 5000); // Update every 5 seconds
  }
  
  stopProgressTimer(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
  }
  
  updateProgress(): void {
    // Only update progress if we're not already marked as complete
    if (this.progress && this.progress.status !== 'completed') {
      // Calculate completion percentage based on time spent and estimated time
      let completionPercentage = 0;
      
      if (this.lesson && this.lesson.estimatedTime) {
        // Cap at 90% for time-based progress (final 10% requires manual completion)
        completionPercentage = Math.min(90, Math.round((this.timeSpent / 60) / this.lesson.estimatedTime * 100));
      } else {
        // If no estimated time, use a default progression based on time
        completionPercentage = Math.min(90, Math.round(this.timeSpent / 120 * 100)); // 2 minutes = 100%
      }
      
      // Only update if percentage has increased
      if (completionPercentage > (this.progress.completionPercentage || 0)) {
        this.lessonService.updateLessonProgress(this.lessonId, {
          timeSpent:this.timeSpent,
          completionPercentage: completionPercentage
        }).subscribe(
          response => {
            if (response.success) {
              this.progress = response.data.progress;
            }
          },
          error => {
            console.error('Error updating lesson progress:', error);
          }
        );
      }
    }
  }

  startExercise(exerciseIndex: number): void {
    // Set the current exercise as in progress
    this.exerciseInProgress = exerciseIndex;
    
    // Update local state
    if (this.practicalExercises && this.practicalExercises[exerciseIndex]) {
      if (!this.practicalExercises[exerciseIndex].progress) {
        this.practicalExercises[exerciseIndex].progress = {};
      }
      this.practicalExercises[exerciseIndex].progress.status = 'in_progress';
    }
    
    // Navigate to the exercise page with enough context
    this.router.navigate(['/exercises'], {
      queryParams: {
        lessonId: this.lessonId,
        exerciseIndex: exerciseIndex,
        returnPath: `/lessons/${this.lessonId}`
      }
    });
  }
  
  completeExercise(exerciseIndex: number, data: any = {}): void {
    const completionData = {
      completed: true,
      score: data.score || 100,
      timeSpent: data.timeSpent || 0,
      ...data
    };
    
    this.lessonService.completeExercise(this.lessonId, exerciseIndex, completionData)
      .subscribe(
        response => {
          if (response.success) {
            // Update lesson progress
            this.progress = response.data.lessonProgress;
            
            // Update exercise status
            if (this.practicalExercises && this.practicalExercises[exerciseIndex]) {
              if (!this.practicalExercises[exerciseIndex].progress) {
                this.practicalExercises[exerciseIndex].progress = {};
              }
              this.practicalExercises[exerciseIndex].progress.status = 'completed';
              this.practicalExercises[exerciseIndex].progress.completionPercentage = 100;
              this.practicalExercises[exerciseIndex].progress.completedAt = new Date();
              this.practicalExercises[exerciseIndex].progress.score = completionData.score;
            }
            
            // Update the exercise completion status array
            this.exerciseCompletionStatus = response.data.exercisesCompleted;
            
            // Reset the exercise in progress
            this.exerciseInProgress = null;
          }
        },
        error => {
          console.error('Error completing exercise:', error);
        }
      );
  }
  
  navigateToLesson(lessonId: string): void {
    // Save progress before navigating
    this.updateProgress();
    this.router.navigate(['/lessons', lessonId]);
  }
  
  backToTutorial(): void {
    if (this.tutorial) {
      this.router.navigate(['/tutorials', this.tutorial._id]);
    } else {
      this.router.navigate(['/tutorials']);
    }
  }
  
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
  
  getPracticalExerciseStatusIcon(status: string): string {
    switch(status) {
      case 'completed':
        return 'fas fa-check-circle text-green-500';
      case 'in_progress':
        return 'fas fa-spinner text-blue-500';
      default:
        return 'far fa-circle text-gray-300';
    }
  }
  
  getProgressColor(percentage: number): string {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }
}