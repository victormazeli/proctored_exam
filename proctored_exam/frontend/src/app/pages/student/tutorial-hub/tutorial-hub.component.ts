import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TutorialService } from '../../../services/tutorial.service';
import { AuthService } from '../../../services/auth.service';
import { ExamService } from 'src/app/services/exam.service';

@Component({
  selector: 'app-tutorial-hub',
  templateUrl: './tutorial-hub.component.html'
})
export class TutorialHubComponent implements OnInit {
  tutorials: any[] = [];
  certifications: any[] = [];
  selectedCertification: string = '';
  loading: boolean = true;
  error: string = '';
  currentUser: any;
  
  constructor(
    private tutorialService: TutorialService,
    private authService: AuthService,
    private examService: ExamService,
    private router: Router
  ) { }
  
  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadCertifications();
    this.loadTutorials();
  }
  
  loadCertifications(): void {
    this.examService.getCertifications().subscribe(
      response => {
        if (response.success) {
          this.certifications = response.data;
        } else {
          this.error = 'Failed to load certifications';
        }
      },
      error => {
        console.error('Error loading certifications:', error);
        this.error = 'Failed to load certifications';
      }
    );
  }
  
  loadTutorials(): void {
    this.loading = true;
    this.tutorialService.getTutorials(this.selectedCertification).subscribe(
      response => {
        if (response.success) {
          this.tutorials = response.data.tutorials;
        } else {
          this.error = 'Failed to load tutorials';
        }
        this.loading = false;
      },
      error => {
        console.error('Error loading tutorials:', error);
        this.error = 'Failed to load tutorials';
        this.loading = false;
      }
    );
  }
  
  onCertificationFilterChange(): void {
    this.loadTutorials();
  }
  
  navigateToTutorial(id: string): void {
    this.router.navigate(['/student/tutorials', id]);
  }
  
  getCategoryColor(index: number): string {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-green-500 to-teal-600',
      'from-purple-500 to-pink-600',
      'from-yellow-500 to-orange-600',
      'from-red-500 to-pink-600',
      'from-indigo-500 to-purple-600'
    ];
    return colors[index % colors.length];
  }
  
  getProgressColor(percentage: number): string {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }
}