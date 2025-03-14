import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Exam } from 'src/app/models/exam.interface';
import { ExamService } from 'src/app/services/exam.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ExistingAttempt } from '../resume-exam-dialog/resume-exam-dialog.component';


@Component({
  selector: 'app-exam-instructions',
  templateUrl: './exam-instructions.component.html',
})
export class ExamInstructionsComponent implements OnInit {
  // examData: ExamInstructions = {
  //   examName: 'AWS Solutions Architect Associate',
  //   code: 'SAA-C03',
  //   timeLimit: 130,
  //   questionsCount: 65,
  //   passingScore: 72,
  //   instructions: [
  //     'Ensure you have a stable internet connection throughout the exam.',
  //     'Your webcam must remain active and your face visible during the entire exam.',
  //     'Do not switch browser tabs or windows during the exam.',
  //     'You can flag questions for review and return to them later.',
  //     'Once you submit the exam, you cannot return to review or change answers.',
  //     'Your results will be displayed immediately after submission.'
  //   ],
  //   domains: [
  //     { name: 'Design Resilient Architectures', percentage: 30 },
  //     { name: 'Design High-Performing Architectures', percentage: 28 },
  //     { name: 'Design Secure Applications and Architectures', percentage: 24 },
  //     { name: 'Design Cost-Optimized Architectures', percentage: 18 }
  //   ]
  // };

  examData: Exam = {
    _id: '',
    name: '',
    certificationId: {
      _id: '',
      name: '',
      code: '',
      description: '',
      domains: [],
      active: false,
      passingScore: 0,
      provider: '',
      timeLimit: 0
    },
    description: '',
    questionCount: 0,
    timeLimit: 0,
    randomize: false,
    showResults: false,
    active: false,
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  examId: string = '';

  showResumeDialog: boolean = false;
  existingAttempt: ExistingAttempt | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private examService: ExamService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // In a real app, you would fetch the exam data using the ID from the route
    this.examId = this.route.snapshot.params['examId'];
    this.loadExam(this.examId);
  }

  loadExam(id: any) {
    this.examService.getExams({examId: id }).subscribe({
      next: (response) => {
        this.examData = response.data[0];
      },
      error: (error) => {
        this.notificationService.showError(error.message)
      }
    })
  }



  startExam() {
    
    this.examService.checkPreviousAttempt(this.examData._id).subscribe({
      next: (response) => {
        if (response.data.hasExistingAttempt) {
          // Show the resume dialog
          this.existingAttempt = response.data.existingAttempt;
          this.showResumeDialog = true;
        } else {
          // No existing attempt, go directly to the exam
          this.router.navigate(['/portal/exams', this.examData._id, 'session']);
        }
      },
      error: (error) => {
        console.error('Error starting exam:', error);
        // Show error message
      }
    });
  }
  
  onResumeExam(attemptId: string) {
    this.showResumeDialog = false;
    console.log("djhrruhrhutuhtuhtuh")
    this.router.navigate(['/portal/exams', attemptId, 'session'], { 
      queryParams: { resume: true }
    });
  }
  
  onStartNewExam() {
    this.showResumeDialog = false;
    this.router.navigate(['/portal/exams', this.examData._id, 'session']);
    
  }

  onViewResults(attemptId: string) {
    this.showResumeDialog = false;
    this.router.navigate(['/portal/exams/results', attemptId]);
  }
  
  onCancelDialog() {
    this.showResumeDialog = false;
    this.existingAttempt = null;
  }

  goBack(): void {
    this.router.navigate(['/portal/exams/select']);
  }

  hasWebcamPermission = false;

  async checkWebcamPermission(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.hasWebcamPermission = true;
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      this.hasWebcamPermission = false;
    }
  }
}