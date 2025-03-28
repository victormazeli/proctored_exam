import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TutorialService } from '../../../services/tutorial.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tutorial-detail',
  templateUrl: './tutorial-detail.component.html'
})
export class TutorialDetailComponent implements OnInit {
  tutorialId: string = '';
  tutorial: any = null;
  lessons: any[] = [];
  loading: boolean = true;
  error: string = '';
  currentUser: any;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorialService: TutorialService,
    private authService: AuthService
  ) { }
  
  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.route.params.subscribe(params => {
      this.tutorialId = params['id'];
      this.loadTutorialDetails();
    });
  }
  
  loadTutorialDetails(): void {
    this.loading = true;
    this.tutorialService.getTutorialDetails(this.tutorialId).subscribe(
      response => {
        if (response.success) {
          this.tutorial = response.data;
          this.lessons = response.data.lessons || [];
        } else {
          this.error = 'Failed to load tutorial details';
        }
        this.loading = false;
      },
      error => {
        console.error('Error loading tutorial details:', error);
        this.error = 'Failed to load tutorial details';
        this.loading = false;
      }
    );
  }
  
  navigateToLesson(lessonId: string): void {
    this.router.navigate(['/student/lessons', lessonId]);
  }
  
  getLessonStatusIcon(status: string): string {
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
  
  getTotalDuration(): number {
    return this.lessons.reduce((sum, lesson) => sum + (lesson.estimatedTime || 0), 0);
  }
  
  backToTutorials(): void {
    this.router.navigate(['/tutorials']);
  }
}