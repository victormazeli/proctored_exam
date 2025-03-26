import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { environment } from 'src/environment/environment';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private apiUrl = `${environment.api}/api`;

  constructor(private http: HttpClient, private notificationService: NotificationService) { }


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