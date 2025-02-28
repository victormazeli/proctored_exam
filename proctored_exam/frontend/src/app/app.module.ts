import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AdminLayoutComponent, AuthLayoutComponent, ExamLayoutComponent, MainLayoutComponent } from './components/layouts/layouts.component';
import { HeaderComponent } from './components/layouts/header/header.component';
import { FooterComponent } from './components/layouts/footer/footer.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { FormsModule } from '@angular/forms';
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
import { UsersComponent } from './pages/admin/users/users.component';
import { AdminCertificationsComponent  } from './pages/admin/certification/certification.component';
import { CommonModule } from '@angular/common';
import { AdminQuestionsComponent } from './pages/admin/question/question.component';


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
    UsersComponent,
    AdminCertificationsComponent,
    AdminQuestionsComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    SocketIoModule.forRoot(config)
  ],
  providers: [
    ExamService,
    ProctorService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
