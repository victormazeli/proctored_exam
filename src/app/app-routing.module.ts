import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ExamComponent } from './pages/exam/exam/exam.component';
import { AdminLayoutComponent, AuthLayoutComponent, ExamLayoutComponent, MainLayoutComponent } from './components/layouts/layouts.component';
import { SelectExamComponent } from './pages/exam/select-exam/select-exam.component';
import { ExamInstructionsComponent } from './pages/exam/exam-instructions/exam-instructions.component';
import { ExamResultsComponent } from './pages/exam/exam-results/exam-results.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { AdminCertificationsComponent } from './pages/admin/certification/certification.component';
import { AdminExamsComponent } from './pages/admin/exam/exam.component';
import { AdminQuestionsComponent } from './pages/admin/question/question.component';
import { AdminUsersComponent } from './pages/admin/users/users.component';

const routes: Routes = [
  
  { 
    path: '', 
    component: ExamLayoutComponent, 
    children: [
    { path: 'auth/login', component: LoginComponent },
    { path: 'auth/register', component: RegisterComponent },
    { path: 'exams/select', component: SelectExamComponent },
    { path: 'exams/:examId/session', component: ExamComponent },
    { path: 'exams/:examId/instructions', component: ExamInstructionsComponent },
    { path: 'exams/results', component: ExamResultsComponent }
  ] 
},
{
  path: 'admin',
  component: AdminLayoutComponent,
  children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'certifications', component: AdminCertificationsComponent },
    { path: 'exams', component: AdminExamsComponent },
    { path: 'users', component: AdminUsersComponent },
    { path: 'questions', component: AdminQuestionsComponent }
  ]
},
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' }, 
  { path: '**', redirectTo: '/auth/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
