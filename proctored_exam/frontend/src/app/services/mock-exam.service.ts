// mock-exam.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ExamData, Question } from '../models/exam.interface';


@Injectable({
  providedIn: 'root'
})
export class MockExamService {
    private readonly mockQuestions: Question[] = [
        {
          id: '1',
          text: 'Which AWS service is used to securely store and retrieve credentials, such as database passwords or API keys?',
          options: [
            { id: 'a', text: 'AWS Secrets Manager' },
            { id: 'b', text: 'AWS Key Management Service (KMS)' },
            { id: 'c', text: 'AWS Identity and Access Management (IAM)' },
            { id: 'd', text: 'Amazon S3' }
          ],
          domain: 'Security'
        },
        {
          id: '2',
          text: 'Which storage service provides automatically scalable object storage and is commonly used for data backups and static content hosting?',
          options: [
            { id: 'a', text: 'Amazon EBS' },
            { id: 'b', text: 'Amazon EFS' },
            { id: 'c', text: 'Amazon S3' },
            { id: 'd', text: 'AWS Snowball' }
          ],
          domain: 'Storage'
        },
        {
          id: '3',
          text: 'Which AWS service provides a serverless compute engine that runs event-driven code without provisioning servers?',
          options: [
            { id: 'a', text: 'AWS Lambda' },
            { id: 'b', text: 'Amazon EC2' },
            { id: 'c', text: 'AWS Elastic Beanstalk' },
            { id: 'd', text: 'AWS Fargate' }
          ],
          domain: 'Compute'
        },
        {
          id: '4',
          text: 'Which AWS service is used to create and manage virtual private networks (VPNs) to connect on-premises data centers with AWS?',
          options: [
            { id: 'a', text: 'Amazon VPC' },
            { id: 'b', text: 'AWS Direct Connect' },
            { id: 'c', text: 'AWS Site-to-Site VPN' },
            { id: 'd', text: 'AWS Transit Gateway' }
          ],
          domain: 'Networking'
        },
        {
          id: '5',
          text: 'Which database service is fully managed, serverless, and designed for key-value and document-based applications?',
          options: [
            { id: 'a', text: 'Amazon RDS' },
            { id: 'b', text: 'Amazon DynamoDB' },
            { id: 'c', text: 'Amazon Redshift' },
            { id: 'd', text: 'Amazon Aurora' }
          ],
          domain: 'Databases'
        }
      ];
    

  private mockExamData: ExamData = {
    id: 'mock-exam-123',
    timeLimit: 1800, // 30 minutes in seconds
    questions: this.mockQuestions,
    proctorEnabled: true,
    answers: {},
    timeSpent: {},
    flagged: [],
    currentQuestionIndex: 0,
    startTime: Date.now(),
    endTime: null,
    proctorEvents: [],
    metadata: {
      examName: 'Mock Certification Exam',
      certificationName: 'Mock Professional Certification',
      totalQuestions: this.mockQuestions.length,
      allowReview: true,
      randomizeQuestions: false
    }
  };

  constructor() {}

  initializeExam(examId: string): Observable<ExamData> {
    // Simulate API delay
    return of(this.mockExamData).pipe(delay(1000));
  }

  saveProgress(attemptId: string, data: Partial<ExamData>): Observable<void> {
    // Simulate saving progress
    console.log('Saving progress:', data);
    return of(undefined).pipe(delay(500));
  }

  submitExam(submission: any): Observable<any> {
    // Simulate exam submission
    const result = {
      success: true,
      attemptId: this.mockExamData.id,
      score: 85 // Mock score
    };
    return of(result).pipe(delay(1500));
  }
}