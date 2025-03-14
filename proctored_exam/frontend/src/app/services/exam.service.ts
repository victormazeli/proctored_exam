// exam.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { 
  ExamData, 
  ExamSubmission, 
  ExamResult, 
  ProctorConfig,
  ProctorEvent 
} from '../models/exam.interface';
import { NotificationService } from './notification.service';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private readonly API_URL = `${environment.api}/api/exams`
  private examDataSubject = new BehaviorSubject<ExamData | null>(null);
  public examData$ = this.examDataSubject.asObservable();

  constructor(private http: HttpClient, private notificationService: NotificationService) {}

  /**
   * Initialize exam data
   */
  initializeExam(examId: string, forceNew: boolean = false): Observable<any> {
    const params: any = forceNew ? { forceNew: 'true' } : {};
    let httpParams = new HttpParams();
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
  
    return this.http.get<any>(`${this.API_URL}/${examId}/start`, { params: httpParams }).pipe(
      map(data => {
        console.log(data)
        this.examDataSubject.next(data.data);
        return data.data;
      })
    );
  }

  /**
   * Save exam progress
   */
  saveProgress(attemptId: string, data: any): Observable<any> {
    return this.http.post<void>(`${this.API_URL}/attempts/${attemptId}/progress`, data).pipe(
      retry(1),
      catchError(this.handleError("saveProgress", {}))
    )
  }

    /**
   * Check Exam Attempt
   */
    checkPreviousAttempt(examId: string): Observable<any> {
      return this.http.get<void>(`${this.API_URL}/attempts/check/${examId}`).pipe(
        catchError(this.handleError("CheckPreviousAttempt", {}))
      )
    }

  /**
   * Submit exam
   */
  submitExam(submission: ExamSubmission): Observable<any> {
    return this.http.post<ExamResult>(`${this.API_URL}/submit`, submission).pipe(
      catchError(this.handleError("submitExam", {}))
    )
  }

    /**
   * Submit exam
   */
    resumeExam(attemptId: any): Observable<any> {
      return this.http.get<any>(`${this.API_URL}/attempts/${attemptId}/resume`).pipe(
        catchError(this.handleError("resumeExam", {}))
      )
    }
  
     /**
   * Get exam results by attempt ID
   */
  getExamResults(attemptId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/attempts/${attemptId}/results`)
      .pipe(
        catchError(this.handleError("getExamResults", {}))
      );
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

    getCertifications(params?: any): Observable<any> {
      let httpParams = new HttpParams();
      
      if (params) {
        Object.keys(params).forEach(key => {
          if (params[key]) {
            httpParams = httpParams.append(key, params[key]);
          }
        });
      }
      return this.http.get<any>(`${this.API_URL}/certifications`, {params: httpParams})
    }

  getExams(params?: any): Observable<any> {
    let httpParams = new HttpParams();
      if (params) {
        Object.keys(params).forEach(key => {
            if (params[key]) {
              httpParams = httpParams.append(key, params[key]);
            }
        });
      }
        
        return this.http.get<any>(`${this.API_URL}`, { params: httpParams })
  }


  getExamById(id: any): Observable<any> {
    return this.http.get<any>(`${this.API_URL}`, { params: {examId: id} });
  }

    private handleError<T>(operation = 'operation', result?: T) {
      return (error: any): Observable<T> => {
        console.error(`${operation} failed: ${error.message}`);
        // Let the app keep running by returning an empty result
        this.notificationService.showError(error.error.message)
        return of(result as T);
      };
    }
}