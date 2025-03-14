import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ExamComponent } from './pages/exam/exam/exam.component';
import { AdminLayoutComponent, ExamLayoutComponent } from './components/layouts/layouts.component';
import { SelectExamComponent } from './pages/exam/select-exam/select-exam.component';
import { ExamInstructionsComponent } from './pages/exam/exam-instructions/exam-instructions.component';
import { ExamResultsComponent } from './pages/exam/exam-results/exam-results.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { AdminCertificationsComponent } from './pages/admin/certification/certification.component';
import { AdminExamsComponent } from './pages/admin/exam/exam.component';
import { AdminQuestionsComponent } from './pages/admin/question/question.component';
import { AdminUsersComponent } from './pages/admin/users/users.component';
import { AdminLoginComponent } from './pages/admin/auth/auth.component';
import { adminAuthGuard, authGuard } from './auth-guard.guard';

const routes: Routes = [
  {
    path: 'auth',
    component: ExamLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      // { path: 'forgot-password', component: ForgotPasswordComponent },
      // { path: 'reset-password/:token', component: ResetPasswordComponent },
      { path: 'admin/login', component: AdminLoginComponent },
      { path: '', redirectTo: '/auth/login', pathMatch: 'full' }
    ]
  },
  
  { 
    path: 'portal', 
    component: ExamLayoutComponent,
    canActivate: [authGuard], 
    children: [
    { path: 'exams/select', component: SelectExamComponent },
    { path: 'exams/:examId/session', component: ExamComponent },
    { path: 'exams/:examId/instructions', component: ExamInstructionsComponent },
    { path: 'exams/results/:attemptId', component: ExamResultsComponent },
    { path: '', redirectTo: '/portal/exams/select', pathMatch: 'full' }, 
  ] 
},
{
  path: 'admin',
  component: AdminLayoutComponent,
  canActivate: [adminAuthGuard],
  children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'certifications', component: AdminCertificationsComponent },
    { path: 'exams', component: AdminExamsComponent },
    { path: 'users', component: AdminUsersComponent },
    { path: 'questions', component: AdminQuestionsComponent },
    { path: '', redirectTo: '/admin/dashboard', pathMatch: 'full' }
  ]
},

  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
