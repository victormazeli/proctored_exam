// exam-instructions.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

interface ExamInstructions {
  examName: string;
  code: string;
  timeLimit: number;
  questionsCount: number;
  passingScore: number;
  instructions: string[];
  domains: {
    name: string;
    percentage: number;
  }[];
}

@Component({
  selector: 'app-exam-instructions',
  templateUrl: './exam-instructions.component.html',
})
export class ExamInstructionsComponent implements OnInit {
  examData: ExamInstructions = {
    examName: 'AWS Solutions Architect Associate',
    code: 'SAA-C03',
    timeLimit: 130,
    questionsCount: 65,
    passingScore: 72,
    instructions: [
      'Ensure you have a stable internet connection throughout the exam.',
      'Your webcam must remain active and your face visible during the entire exam.',
      'Do not switch browser tabs or windows during the exam.',
      'You can flag questions for review and return to them later.',
      'Once you submit the exam, you cannot return to review or change answers.',
      'Your results will be displayed immediately after submission.'
    ],
    domains: [
      { name: 'Design Resilient Architectures', percentage: 30 },
      { name: 'Design High-Performing Architectures', percentage: 28 },
      { name: 'Design Secure Applications and Architectures', percentage: 24 },
      { name: 'Design Cost-Optimized Architectures', percentage: 18 }
    ]
  };
  examId: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // In a real app, you would fetch the exam data using the ID from the route
    this.examId = this.route.snapshot.params['examId'];
  }

  startExam(): void {
    this.router.navigate(['/exams', this.examId, 'session']);
  }

  goBack(): void {
    this.router.navigate(['/exams']);
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