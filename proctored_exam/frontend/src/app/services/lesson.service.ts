import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  private baseUrl = `${environment.api}/api`;
  
  constructor(private http: HttpClient) {}
  
  getLessons(tutorialId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/tutorials/${tutorialId}/lessons`);
  }
  
  getLesson(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/lessons/${id}`);
  }

  getLessonDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/lessons/${id}`);
  }

  updateLessonProgress(id: string, progressData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/lessons/${id}/progress`, progressData);
  }
  
  createLesson(lessonData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/lessons`, lessonData);
  }
  
  updateLesson(id: string, lessonData: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/lessons/${id}`, lessonData);
  }
  
  deleteLesson(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/admin/lessons/${id}`);
  }
  
  updateLessonStatus(id: string, active: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/lessons/${id}`, { active });
  }
  
  reorderLessons(tutorialId: string, lessonOrder: any[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/tutorials/${tutorialId}/reorder-lessons`, { lessonOrder });
  }
  
  checkLessonUsage(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/lessons/${id}/usage`);
  }

completeExercise(lessonId: string, exerciseIndex: number, completionData: any): Observable<any> {
  return this.http.post<any>(
    `${this.baseUrl}/lessons/${lessonId}/exercises/${exerciseIndex}/complete`, 
    completionData
  )
}
}
