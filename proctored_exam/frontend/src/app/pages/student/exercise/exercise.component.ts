// exercise.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonService } from '../../../services/lesson.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from 'ngx-markdown';

@Component({
  selector: 'app-exercise',
  templateUrl: './exercise.component.html'
})
export class ExerciseComponent implements OnInit {
  lessonId: string = '';
  exerciseIndex: number = 0;
  returnPath: string = '';
  exercise: any = null;
  lessonDetails: any = null;
  loading: boolean = true;
  error: string = '';
  startTime: number = Date.now();
  
  // For rendering content
  instructionsContent: SafeHtml = '';
  solutionContent: SafeHtml = '';
  showSolution: boolean = false;
  currentHintIndex: number = -1;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService,
    private sanitizer: DomSanitizer,
    private markdownService: MarkdownService
  ) { }
  
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.lessonId = params['lessonId'];
      this.exerciseIndex = +params['exerciseIndex'];
      this.returnPath = params['returnPath'] || '/lessons';
      this.loadExerciseData();
    });
  }
  
  loadExerciseData(): void {
    this.loading = true;
    this.lessonService.getLessonDetails(this.lessonId).subscribe(
      async (response) => {
        if (response.success) {
          this.lessonDetails = response.data;
          
          if (this.lessonDetails.lesson.practicalExercises && 
              this.lessonDetails.lesson.practicalExercises[this.exerciseIndex]) {
            
            this.exercise = this.lessonDetails.lesson.practicalExercises[this.exerciseIndex];
            
            // Parse markdown content
            if (this.exercise.instructions) {
              this.instructionsContent = this.sanitizer.bypassSecurityTrustHtml(
                await this.markdownService.parse(this.exercise.instructions)
              );
            }
            
            if (this.exercise.solution) {
              this.solutionContent = this.sanitizer.bypassSecurityTrustHtml(
                await this.markdownService.parse(this.exercise.solution)
              );
            }
          } else {
            this.error = 'Exercise not found';
          }
        } else {
          this.error = 'Failed to load exercise details';
        }
        this.loading = false;
      },
      error => {
        console.error('Error loading exercise details:', error);
        this.error = 'Failed to load exercise details';
        this.loading = false;
      }
    );
  }
  
  completeExercise(success: boolean = true, score: number = 100): void {
    const timeSpent = Math.round((Date.now() - this.startTime) / 1000); // Time in seconds
    
    const completionData = {
      completed: success,
      score: score,
      timeSpent: timeSpent
    };
    
    this.lessonService.completeExercise(this.lessonId, this.exerciseIndex, completionData)
      .subscribe(
        response => {
          if (response.success) {
            // Navigate back to the lesson
            this.router.navigate([this.returnPath], {
              queryParams: { exerciseCompleted: 'true' }
            });
          }
        },
        error => {
          console.error('Error completing exercise:', error);
          this.error = 'Failed to save exercise completion';
        }
      );
  }
  
  showNextHint(): void {
    if (this.exercise && this.exercise.hints && 
        this.currentHintIndex < this.exercise.hints.length - 1) {
      this.currentHintIndex++;
    }
  }
  
  toggleSolution(): void {
    this.showSolution = !this.showSolution;
  }
  
  goBack(): void {
    this.router.navigate([this.returnPath]);
  }
}