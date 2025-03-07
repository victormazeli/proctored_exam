// admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.api}/api/admin` // Base API URL for admin endpoints

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard-stats`)
      .pipe(
        catchError(this.handleError('getDashboardStats', {
          stats: {
            userCount: 0,
            certificationCount: 0,
            examCount: 0,
            attemptCount: 0,
            lastWeekAttempts: 0
          },
          recentAttempts: [],
          certPassRates: []
        }))
      );
  }

  /**
   * 
   * @description Create User
   * 
   */

  createUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, data)
  }

    /**
   * 
   * @description Get User details
   * 
   */

    getUserDetails(userId: any): Observable<any> {
      return this.http.get(`${this.apiUrl}/users/${userId}`)
    }

    /**
     * 
     * @description Update User role
     */

    changeUserRole(userId: any, role: any): Observable<any>{
      return this.http.put(`${this.apiUrl}/users/${userId}/role`, {role});
    }


  getActiveExamCount(): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.apiUrl}/active-exams/count`)
      .pipe(
        catchError(this.handleError('getActiveExamCount', {count: 0}))
      );
  }

  // Certification methods
  getCertifications(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/certifications`, {params: httpParams})
      // .pipe(
      //   catchError(this.handleError('getCertifications', { certifications: [], certStats: {} }))
      // );
  }

  getCertification(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/certifications/${id}`)
      .pipe(
        catchError(this.handleError('getCertification', { success: false }))
      );
  }

  getCertificationDomains(certId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/certifications/${certId}/domains`)
  }

  getAllDomains(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/domains`)
  }

  createCertification(certification: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/certifications`, certification)
  }

  updateCertification(certificationId: any, certification: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/certifications/${certificationId}` , certification)
  }


  updateCertificationStatus(id: string, active: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/certifications/${id}`, { active })
      .pipe(
        catchError(this.handleError('updateCertificationStatus', { success: false }))
      );
  }

  // Exam methods
  getExams(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    
    return this.http.get<any>(`${this.apiUrl}/exams`, { params: httpParams })
  }

  getExam(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/exams/${id}`)
      .pipe(
        catchError(this.handleError('getExam', { success: false }))
      );
  }

  saveExam(exam: any, isUpdate: boolean): Observable<any> {
    const url = isUpdate 
      ? `${this.apiUrl}/exams/${exam.id}` 
      : `${this.apiUrl}/exams`;
    const method = isUpdate ? 'put' : 'post';
    
    return this.http[method](url, exam)
  }

  updateExamStatus(id: string, active: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/exams/${id}`, { active })
      .pipe(
        catchError(this.handleError('updateExamStatus', { success: false }))
      );
  }

  getExamAttemptsCount(examId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/exams/${examId}/attempts/count`)
      .pipe(
        catchError(this.handleError('getExamAttemptsCount', { success: false, count: 0 }))
      );
  }

  deleteExam(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/exams/${id}`)
      .pipe(
        catchError(this.handleError('deleteExam', { success: false }))
      );
  }

  // Question methods
  getQuestions(filters?: any, pagination?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.append(key, filters[key]);
        }
      });
    }
    
    if (pagination) {
      params = params.append('page', pagination.page.toString());
      params = params.append('limit', pagination.limit.toString());
    }
    
    return this.http.get<any>(`${this.apiUrl}/questions`, { params })
      .pipe(
        catchError(this.handleError('getQuestions', { questions: [], pagination: { page: 1, limit: 10, totalQuestions: 0, totalPages: 0 } }))
      );
  }

  getQuestion(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/questions/${id}`)
      .pipe(
        catchError(this.handleError('getQuestion', { success: false }))
      );
  }

  getQuestionCount(certificationId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/questions/count?certification=${certificationId}`)
      .pipe(
        catchError(this.handleError('getQuestionCount', { success: false, count: 0 }))
      );
  }

  getQuestionStats(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/questions/${id}/stats`)
      .pipe(
        catchError(this.handleError('getQuestionStats', { success: false }))
      );
  }

  saveQuestion(question: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/questions/save`, question)
      .pipe(
        catchError(this.handleError('saveQuestion', { success: false }))
      );
  }

  deleteQuestion(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/questions/${id}`)
      .pipe(
        catchError(this.handleError('deleteQuestion', { success: false }))
      );
  }

  importQuestions(data: any): Observable<any> {
    // const formData = new FormData();
    
    // if (data.file) {
    //   formData.append('file', data.file);
    // }
    
    // if (data.certificationId) {
    //   formData.append('certificationId', data.certificationId);
    // }
    
    return this.http.post<any>(`${this.apiUrl}/questions/import`, data)
      // .pipe(
      //   catchError(this.handleError('importQuestions', { success: false }))
      // );
  }

  exportQuestions(params: any): void {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key]) {
        httpParams = httpParams.append(key, params[key]);
      }
    });
    
    window.location.href = `${this.apiUrl}/questions/export?${httpParams.toString()}`;
  }

  // User methods
  getUsers(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    
    return this.http.get<any>(`${this.apiUrl}/users`, { params: httpParams })
      .pipe(
        catchError(this.handleError('getUsers', { users: [], pagination: { page: 1, limit: 10, totalUsers: 0, totalPages: 0 } }))
      );
  }

  getUser(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${id}`)
      .pipe(
        catchError(this.handleError('getUser', { success: false }))
      );
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/role`, { userId, role })
      .pipe(
        catchError(this.handleError('updateUserRole', { success: false }))
      );
  }

  // Analytics methods
  getUserAnalytics(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analytics/user/${userId}`)
      .pipe(
        catchError(this.handleError('getUserAnalytics', { success: false }))
      );
  }

  getUserAttempts(userId: string, params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    
    return this.http.get<any>(`${this.apiUrl}/analytics/user/${userId}/attempts`, { params: httpParams })
      .pipe(
        catchError(this.handleError('getUserAttempts', { success: false, attempts: [], pagination: { page: 1, limit: 10, totalAttempts: 0, totalPages: 0 } }))
      );
  }

  getCertificationAnalytics(certId?: string): Observable<any> {
    let url = `${this.apiUrl}/analytics/certifications`;
    if (certId) {
      url += `/${certId}`;
    }
    
    return this.http.get<any>(url)
      .pipe(
        catchError(this.handleError('getCertificationAnalytics', { success: false }))
      );
  }

  getAttemptDetails(attemptId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analytics/attempts/${attemptId}`)
      .pipe(
        catchError(this.handleError('getAttemptDetails', { success: false }))
      );
  }

  // Admin settings methods
  getSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/settings`)
      .pipe(
        catchError(this.handleError('getSettings', { success: false, settings: {} }))
      );
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/settings`, settings)
      .pipe(
        catchError(this.handleError('updateSettings', { success: false }))
      );
  }

  // System methods
  getSystemStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/system/status`)
      .pipe(
        catchError(this.handleError('getSystemStatus', { success: false, status: {} }))
      );
  }

  getSystemLogs(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    
    return this.http.get<any>(`${this.apiUrl}/system/logs`, { params: httpParams })
      .pipe(
        catchError(this.handleError('getSystemLogs', { success: false, logs: [] }))
      );
  }

  clearCache(cacheType?: string): Observable<any> {
    let url = `${this.apiUrl}/system/cache/clear`;
    if (cacheType) {
      url += `/${cacheType}`;
    }
    
    return this.http.post<any>(url, {})
      .pipe(
        catchError(this.handleError('clearCache', { success: false }))
      );
  }

  // Generic error handler
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      // Let the app keep running by returning an empty result
      return of(result as T);
    };
  }
}