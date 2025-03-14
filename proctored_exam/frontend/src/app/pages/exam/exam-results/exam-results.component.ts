import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from 'src/app/services/exam.service';

interface DomainScore {
  domain: string;
  score: number;
  questionsCount: number;
}

interface ExamQuestion {
  id: string;
  text: string;
  options: any[];
  userAnswers: string[];
  correctAnswers: string[];
  correct: boolean;
  flagged: boolean;
  timeSpent: number;
  domain: string;
  difficulty: number;
  tags: string[];
  explanation?: string;
}

interface AttemptScore {
  overall: number;
  byDomain: DomainScore[];
}

interface ExamAttempt {
  _id: string;
  examId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  timeSpent: number;
  score: AttemptScore;
  passed: boolean;
  questions: ExamQuestion[];
  terminatedBy?: string;
}

interface Recommendation {
  weakDomains: string[];
  studyRecommendations: string[];
  practiceStrategy: string[];
}

interface ProctorSummary {
  totalEvents: number;
  violationCount: number;
  severityScore: number;
  potentialCheating: boolean;
  summary: string;
  flaggedBehaviors?: string[];
  eventCategories: Record<string, number>;
  timeline: any[];
}

@Component({
  selector: 'app-exam-results',
  templateUrl: './exam-results.component.html'
})
export class ExamResultsComponent implements OnInit {
  // Expose Math to template
  Math = Math;

  // Data properties
  exam: any = {};
  certification: any = {};
  attempt: ExamAttempt = {
    _id: '',
    examId: '',
    userId: '',
    startTime: new Date(),
    endTime: new Date(),
    timeSpent: 0,
    score: {
      overall: 0,
      byDomain: []
    },
    passed: false,
    questions: []
  };
  recommendations: Recommendation = {
    weakDomains: [],
    studyRecommendations: [],
    practiceStrategy: []
  };
  proctorSummary: ProctorSummary | null = null;

  // UI state
  questionFilter: string = 'all';
  expandedQuestions: Set<number> = new Set();
  loading: boolean = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const attemptId = params.get('attemptId');
      if (attemptId) {
        this.loadExamResults(attemptId);
      } else {
        this.error = 'No attempt ID provided';
        this.loading = false;
      }
    });
  }

  loadExamResults(attemptId: string): void {
    this.loading = true;
    this.error = null;

    this.examService.getExamResults(attemptId).subscribe({
      next: (response) => {
        // Assign data from API response
        this.exam = response.data.exam;
        this.certification = response.data.certification;
        
        // Format dates as Date objects
        const attempt = {
          ...response.data.attempt,
          startTime: new Date(response.data.attempt.startTime),
          endTime: new Date(response.data.attempt.endTime)
        };
        this.attempt = attempt;
        
        // Assign recommendations
        this.recommendations = response.data.recommendations || {
          weakDomains: [],
          studyRecommendations: [],
          practiceStrategy: []
        };
        
        // Assign proctor summary if available
        this.proctorSummary = response.data.proctorSummary || null;
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading exam results:', err);
        this.error = 'Failed to load exam results. Please try again.';
        this.loading = false;
      }
    });
  }

  // Helper methods
  getScoreColorClass(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  }

  getDomainScore(domainName: string): number {
    const domain = this.attempt.score.byDomain.find(d => d.domain === domainName);
    return domain ? domain.score : 0;
  }

  getOptionText(question: ExamQuestion, optionId: string): string {
    const option = question.options.find(o => o.id === optionId);
    return option ? option.text : 'Unknown option';
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0) result += `${minutes}m `;
    result += `${secs}s`;

    return result;
  }

  // UI interaction methods
  changeQuestionFilter(event: any): void {
    this.questionFilter = event.target.value;
  }

  shouldShowQuestion(question: ExamQuestion): boolean {
    if (this.questionFilter === 'all') return true;
    if (this.questionFilter === 'correct' && question.correct) return true;
    if (this.questionFilter === 'incorrect' && !question.correct) return true;
    if (this.questionFilter === 'flagged' && question.flagged) return true;
    return false;
  }

  toggleQuestion(index: number): void {
    if (this.expandedQuestions.has(index)) {
      this.expandedQuestions.delete(index);
    } else {
      this.expandedQuestions.add(index);
    }
  }

  isQuestionExpanded(index: number): boolean {
    return this.expandedQuestions.has(index);
  }

  getAnsweredCount(): number {
    return this.attempt.questions.filter(q => q.userAnswers.length > 0).length;
  }

  getFlaggedCount(): number {
    return this.attempt.questions.filter(q => q.flagged).length;
  }

  getCorrectCount(): number {
    return this.attempt.questions.filter(q => q.correct).length;
  }

  goBack(): void {
    this.router.navigate(['/portal/exams/select']);
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }
  

  viewAnalysis(): void {
    this.router.navigate(['/analytics/attempt', this.attempt._id]);
  }
}