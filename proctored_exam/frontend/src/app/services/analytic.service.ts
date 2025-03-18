import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from 'src/environment/environment';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticService {
  private apiUrl = `${environment.api}/api`;

  constructor(private http: HttpClient, private notificationService: NotificationService) { }

  /**
   * Get user attempt summary statistics
   * @param userId User ID
   */
  getUserAttemptsSummary(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/users/${userId}/summary`)
    .pipe(
        catchError(this.handleError('getUserAttemptsSummary', {success: false, data: {}}))
    );
  }

  /**
   * Get weekly statistics for user
   * @param userId User ID
   */
  getWeeklyStats(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/users/${userId}/weekly-stats`)
    .pipe(
        catchError(this.handleError('getWeeklyStats', {success: false, data: {}}))
    );
  }

  /**
   * Get certification progress for user
   * @param userId User ID
   */
  getUserCertificationProgress(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/users/${userId}/certification-progress`)
    .pipe(
        catchError(this.handleError('getUserCertificationProgress', {success: false, data: {}}))
    );
  }

  /**
   * Get user's badges
   * @param userId User ID
   */
  getUserBadges(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/users/${userId}/badges`)
    .pipe(
        catchError(this.handleError('getUserBadges', {success: false, data: []}))
    );
  }

  /**
   * Get recent attempts for user
   * @param userId User ID
   * @param limit Number of attempts to return
   */
  getRecentAttempts(userId: string, limit: number = 5): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());
    
    return this.http.get(`${this.apiUrl}/analytics/users/${userId}/recent-attempts`, { params })
    .pipe(
        catchError(this.handleError('getRecentAttempts', {success: false, data: []}))
    );
  }

  /**
   * Get personalized study recommendations
   * @param userId User ID
   */
  getPersonalizedRecommendations(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics/users/${userId}/recommendations`)
    .pipe(
        catchError(this.handleError('getPersonalizedRecommendations', {success: false, data: []}))
    );
  }


    /**
   * Get leaderboard data
   * @param params Optional parameters (certificationId, timeframe, limit)
   */
    getLeaderboard(params?: any): Observable<any> {
        let httpParams = new HttpParams();
        
        if (params) {
          if (params.certificationId) {
            httpParams = httpParams.set('certificationId', params.certificationId);
          }
          
          if (params.timeframe) {
            httpParams = httpParams.set('timeframe', params.timeframe);
          }
          
          if (params.limit) {
            httpParams = httpParams.set('limit', params.limit.toString());
          }
        }
        
        return this.http.get(`${this.apiUrl}/leaderboard`, { params: httpParams })
        .pipe(
            catchError(this.handleError('getLeaderboard', {success: false, data: {}}))
        );
      }
    
      /**
       * Get user rank on the leaderboard
       * @param userId User ID
       * @param certificationId Optional certification ID
       */
      getUserRank(userId: string, certificationId?: string): Observable<any> {
        let params = new HttpParams();
        
        if (certificationId) {
          params = params.set('certificationId', certificationId);
        }
        
        return this.http.get(`${this.apiUrl}/leaderboard/users/${userId}/rank`, { params })
        .pipe(
            catchError(this.handleError('getUserRank', {success: false, data: {}}))
        );
      }
    
      /**
       * Get detailed leaderboard data
       */
      getDetailedLeaderboard(page: number = 1, limit: number = 20, certificationId?: string): Observable<any> {
        let params = new HttpParams()
          .set('page', page.toString())
          .set('limit', limit.toString());
        
        if (certificationId) {
          params = params.set('certificationId', certificationId);
        }
        
        return this.http.get(`${this.apiUrl}/leaderboard/detailed`, { params })
        .pipe(
            catchError(this.handleError('getDetailedLeaderboard', {success: false, data: {}}))
        );
    }

    // analytics.service.ts - Add these methods to your existing AnalyticsService
getTutorialAnalytics(tutorialId: string, dateRange: string): Observable<any> {
  return this.http.get<any>(
    `/api/admin/tutorials/${tutorialId}/analytics?dateRange=${dateRange}`
  );
}

searchTutorialUsers(tutorialId: string, search: string, dateRange: string): Observable<any> {
  return this.http.get<any>(
    `/api/admin/tutorials/${tutorialId}/analytics/users?search=${search}&dateRange=${dateRange}`
  );
}

      // Generic error handler
      private handleError<T>(operation = 'operation', result?: T) {
        return (error: any): Observable<T> => {
          console.error(`${operation} failed: ${error.message}`);
          this.notificationService.showError(error.message)
          // Let the app keep running by returning an empty result
          return of(result as T);
        };
      }
}