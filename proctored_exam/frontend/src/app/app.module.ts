import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MarkdownModule, MarkdownService } from 'ngx-markdown';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AdminLayoutComponent, AuthLayoutComponent, ExamLayoutComponent, MainLayoutComponent } from './components/layouts/layouts.component';
import { HeaderComponent } from './components/layouts/header/header.component';
import { FooterComponent } from './components/layouts/footer/footer.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExamComponent } from './pages/student/exam/exam/exam.component';
import { SelectExamComponent } from './pages/student/exam/select-exam/select-exam.component';
import { TimeWarningModalComponent } from './components/shared/time-warning-modal/time-warning-modal.component';
import { ProctorWarningModalComponent } from './components/shared/proctor-warning-modal/proctor-warning-modal.component';
import { SubmitModalComponent } from './components/shared/submit-modal/submit-modal.component';
import { ExamService } from './services/exam.service';
import { ProctorService } from './services/proctor.service';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { WebCamPermissionModalComponent } from './components/shared/webcam-permission-modal/webcam-permission-modal.component';
import { ExamInstructionsComponent } from './pages/student/exam/exam-instructions/exam-instructions.component';
import { ExamResultsComponent } from './pages/student/exam/exam-results/exam-results.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { AdminUsersComponent } from './pages/admin/users/users.component';
import { AdminCertificationsComponent  } from './pages/admin/certification/certification.component';
import { CommonModule } from '@angular/common';
import { AdminQuestionsComponent } from './pages/admin/question/question.component';
import { AdminExamsComponent } from './pages/admin/exam/exam.component';
import { UserAvatarComponent } from './components/shared/user-avatar/user-avatar.component';
import { NotificationComponent } from './components/shared/notification/notification.component';
import { UploadDialogComponent } from './pages/admin/modals/upload-dialog/upload-dialog.component';
import { CreateUserDialogComponent } from './pages/admin/users/create-user-dialog/create-user-dialog.component';
import { UserDetailsDialogComponent } from './pages/admin/users/user-details-dialog/user-details-dialog.component';
import { RoleChangeDialogComponent } from './pages/admin/users/role-change-dialog/role-change-dialog.component';
import { CreateCertificationModalComponent } from './pages/admin/certification/create-certification-modal/create-certification-modal.component';
import { DomainModalComponent } from './pages/admin/certification/domain-modal/domain-modal.component';
import { ConnectionStatusComponent } from './components/shared/connection-status/connection-status.component';
import { SaveStatusComponent } from './components/shared/save-status/save-status.component';
import { ResumeExamDialogComponent } from './pages/student/exam/resume-exam-dialog/resume-exam-dialog.component';
import { AdminLoginComponent } from './pages/admin/auth/auth.component';
import { AuthInterceptor } from './auth-interceptor.interceptor';
import { AuthService } from './services/auth.service';
import { AnalyticsComponent } from './pages/admin/analytics/analytics.component';
import { CertificationAnalyticsComponent } from './pages/admin/certification-analytics/certification-analytics.component';
import { ActiveExamsComponent } from './pages/admin/active-exams/active-exams.component';
import { StudentDashboardComponent } from './pages/student/student-dashboard/student-dashboard.component';
import { environment } from 'src/environment/environment';
import { AdminService } from './services/admin.service';
import { LeaderboardService } from './services/leaderboard.service';
import { AnalyticService } from './services/analytic.service';
import { TutorialHubComponent } from './pages/student/tutorial-hub/tutorial-hub.component';
import { TutorialDetailComponent } from './pages/student/tutorial-detail/tutorial-detail.component';
import { LessonComponent } from './pages/student/lesson/lesson.component';
import { ExerciseComponent } from './pages/student/exercise/exercise.component';


const getToken = () => {
  return localStorage.getItem('token');
};

const config: SocketIoConfig = { 
  url: environment.api,
  options: {
    transports: ['websocket'],
    autoConnect: false,
    query: {
      token: getToken()
    }
  }
};

@NgModule({
  declarations: [
    AppComponent,
    AdminLayoutComponent,
    AuthLayoutComponent,
    MainLayoutComponent,
    ExamLayoutComponent,
    HeaderComponent,
    FooterComponent,
    LoginComponent,
    RegisterComponent,
    AdminLoginComponent,
    SaveStatusComponent,
    ConnectionStatusComponent,
    NotificationComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    MarkdownModule.forRoot(),
    SocketIoModule.forRoot(config),
  ],
  providers: [
    ExamService,
    ProctorService,
    AuthService,
    AdminService,
    LeaderboardService,
    AnalyticService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
