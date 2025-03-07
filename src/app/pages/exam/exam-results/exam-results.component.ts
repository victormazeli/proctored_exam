// exam-results.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

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

@Component({
  selector: 'app-exam-results',
  templateUrl: './exam-results.component.html'
})
export class ExamResultsComponent implements OnInit {
  // Expose Math to template
  Math = Math;

  // Mock data (in a real app, this would come from a service)
  exam: any = {
    _id: '1',
    name: 'AWS Solutions Architect Associate Practice Exam'
  };

  certification: any = {
    _id: '1',
    name: 'AWS Certified Solutions Architect - Associate',
    code: 'SAA-C03',
    passingScore: 72
  };

  attempt: ExamAttempt = {
    _id: '1',
    examId: '1',
    userId: 'user1',
    startTime: new Date(new Date().getTime() - 60 * 60 * 1000),
    endTime: new Date(),
    timeSpent: 3450, // 57.5 minutes
    score: {
      overall: 76.5,
      byDomain: [
        { domain: "Design Resilient Architectures", score: 85, questionsCount: 14 },
        { domain: "Design High-Performance Architectures", score: 70, questionsCount: 12 },
        { domain: "Design Secure Applications and Architectures", score: 90, questionsCount: 15 },
        { domain: "Design Cost-Optimized Architectures", score: 65, questionsCount: 10 }
      ]
    },
    passed: true,
    questions: [] // We'll populate this below
  };

  recommendations: Recommendation = {
    weakDomains: ['Design High-Performance Architectures', 'Design Cost-Optimized Architectures'],
    studyRecommendations: [
      'Review EC2 instance types and their performance characteristics',
      'Study Amazon RDS performance optimization strategies',
      'Learn more about S3 storage classes and their cost implications',
      'Focus on understanding auto-scaling configurations for cost optimization'
    ],
    practiceStrategy: [
      'Attempt focused practice tests on high-performance architectures',
      'Complete hands-on labs related to cost optimization',
      'Review past wrong answers in these domains'
    ]
  };

  // UI state
  questionFilter: string = 'all';
  expandedQuestions: Set<number> = new Set();

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Generate mock questions data
    this.generateMockQuestions();
  }

  ngOnInit(): void {
    // In a real app, you would fetch the data based on the route params
    // const attemptId = this.route.snapshot.paramMap.get('id');
    // this.loadAttemptData(attemptId);
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
    this.router.navigate(['/exams', this.certification._id, 'select']);
  }

  viewAnalysis(): void {
    this.router.navigate(['/analytics/attempt', this.attempt._id]);
  }

  // Mock data generation
  private generateMockQuestions(): void {
    // Generate 20 mock questions
    const domains = this.attempt.score.byDomain.map(d => d.domain);
    
    this.attempt.questions = Array(20).fill(null).map((_, i) => {
      const correct = Math.random() > 0.3; // 70% chance of being correct
      const flagged = Math.random() > 0.8; // 20% chance of being flagged
      const difficulty = Math.floor(Math.random() * 5) + 1;
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const options = this.generateOptions(i + 1);
      const correctAnswers = [options[0].id]; // First option is always correct for mock data
      const userAnswers = correct ? [...correctAnswers] : [options[1].id]; // If correct, user selected correct answer
      
      return {
        id: `q${i + 1}`,
        text: `This is a sample question ${i + 1} related to ${domain}. What is the correct approach?`,
        options,
        userAnswers,
        correctAnswers,
        correct,
        flagged,
        timeSpent: Math.floor(Math.random() * 120) + 10, // 10-130 seconds
        domain,
        difficulty,
        tags: ['EC2', 'S3', 'VPC'].slice(0, Math.floor(Math.random() * 3) + 1),
        explanation: Math.random() > 0.2 ? `This is an explanation for question ${i + 1}. The correct answer is based on AWS best practices.` : ''
      };
    });
  }

  private generateOptions(questionNum: number): any[] {
    return Array(4).fill(null).map((_, i) => ({
      id: `q${questionNum}_opt${i + 1}`,
      text: `Option ${i + 1} for question ${questionNum}`
    }));
  }
}