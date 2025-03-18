// tutorial.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private baseUrl = `${environment.api}/api`;
  
  constructor(private http: HttpClient) {}
  
  getTutorials(certificationId?: string): Observable<any> {
    let httpParams = new HttpParams();

    if (certificationId) {
        httpParams = httpParams.set('certification', certificationId);
    }
    return this.http.get<any>(`${this.baseUrl}/admin/tutorials`, { params: httpParams });
  }
  
  getTutorial(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/tutorials/${id}`);
  }
  
  createTutorial(tutorialData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/tutorials`, tutorialData);
  }
  
  updateTutorial(id: string, tutorialData: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/tutorials/${id}`, tutorialData);
  }
  
  deleteTutorial(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/admin/tutorials/${id}`);
  }
  
  updateTutorialStatus(id: string, active: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/tutorials/${id}`, { active });
  }
  
  importTutorial(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/tutorials/import`, formData);
  }
  
  checkTutorialUsage(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/tutorials/${id}/usage`);
  }

getTutorialStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/tutorials/stats`);
  }
}
