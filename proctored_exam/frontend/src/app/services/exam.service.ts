// exam.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  ExamData, 
  ExamSubmission, 
  ExamResult, 
  ProctorConfig,
  ProctorEvent 
} from '../models/exam.interface';

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private readonly API_URL = '/api/exams';
  private examDataSubject = new BehaviorSubject<ExamData | null>(null);
  public examData$ = this.examDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Initialize exam data
   */
  initializeExam(examId: string): Observable<ExamData> {
    return this.http.get<ExamData>(`${this.API_URL}/${examId}/initialize`).pipe(
      map(data => {
        this.examDataSubject.next(data);
        return data;
      })
    );
  }

  /**
   * Save exam progress
   */
  saveProgress(attemptId: string, data: Partial<ExamData>): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${attemptId}/progress`, data);
  }

  /**
   * Submit exam
   */
  submitExam(submission: ExamSubmission): Observable<ExamResult> {
    return this.http.post<ExamResult>(`${this.API_URL}/submit`, submission);
  }

  /**
   * Get proctor configuration
   */
  getProctorConfig(): Observable<ProctorConfig> {
    return this.http.get<ProctorConfig>(`${this.API_URL}/proctor/config`);
  }

  /**
   * Log proctor violation
   */
  logViolation(attemptId: string, violation: ProctorEvent): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${attemptId}/violations`, violation);
  }

  /**
   * Log batch violations
   */
  logViolationBatch(attemptId: string, violations: ProctorEvent[]): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${attemptId}/violations/batch`, { violations });
  }

  /**
   * Update exam data in the behavior subject
   */
  updateExamData(data: Partial<ExamData>): void {
    const currentData = this.examDataSubject.value;
    if (currentData) {
      this.examDataSubject.next({
        ...currentData,
        ...data
      });
    }
  }

  /**
   * Get current exam data
   */
  getCurrentExamData(): ExamData | null {
    return this.examDataSubject.value;
  }
}