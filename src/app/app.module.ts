import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AdminLayoutComponent, AuthLayoutComponent, ExamLayoutComponent, MainLayoutComponent } from './components/layouts/layouts.component';
import { HeaderComponent } from './components/layouts/header/header.component';
import { FooterComponent } from './components/layouts/footer/footer.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExamComponent } from './pages/exam/exam/exam.component';
import { SelectExamComponent } from './pages/exam/select-exam/select-exam.component';
import { TimeWarningModalComponent } from './components/shared/time-warning-modal/time-warning-modal.component';
import { ProctorWarningModalComponent } from './components/shared/proctor-warning-modal/proctor-warning-modal.component';
import { SubmitModalComponent } from './components/shared/submit-modal/submit-modal.component';
import { ExamService } from './services/exam.service';
import { ProctorService } from './services/proctor.service';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { HttpClientModule } from '@angular/common/http';
import { WebCamPermissionModalComponent } from './components/shared/webcam-permission-modal/webcam-permission-modal.component';
import { ExamInstructionsComponent } from './pages/exam/exam-instructions/exam-instructions.component';
import { ExamResultsComponent } from './pages/exam/exam-results/exam-results.component';
import { AuthComponent } from './pages/admin/auth/auth.component';
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



// Configure Socket.io with your backend URL
const config: SocketIoConfig = { 
  url: 'http://localhost:3000', // Replace with your backend URL
  options: {
    transports: ['websocket']
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
    ExamComponent,
    SelectExamComponent,
    SubmitModalComponent,
    TimeWarningModalComponent,
    ProctorWarningModalComponent,
    WebCamPermissionModalComponent,
    ExamInstructionsComponent,
    ExamResultsComponent,
    AuthComponent,
    DashboardComponent,
    AdminCertificationsComponent,
    AdminQuestionsComponent,
    AdminExamsComponent,
    AdminUsersComponent,
    UserAvatarComponent,
    NotificationComponent,
    UploadDialogComponent,
    CreateUserDialogComponent,
    UserDetailsDialogComponent,
    RoleChangeDialogComponent,
    CreateCertificationModalComponent,
    DomainModalComponent,
    ConnectionStatusComponent,
    SaveStatusComponent
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    HttpClientModule,
    SocketIoModule.forRoot(config),
  ],
  providers: [
    ExamService,
    ProctorService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
