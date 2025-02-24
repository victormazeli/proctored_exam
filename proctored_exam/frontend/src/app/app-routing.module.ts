import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ExamComponent } from './pages/exam/exam/exam.component';
import { AuthLayoutComponent, ExamLayoutComponent, MainLayoutComponent } from './components/layouts/layouts.component';
import { SelectExamComponent } from './pages/exam/select-exam/select-exam.component';
import { ExamInstructionsComponent } from './pages/exam/exam-instructions/exam-instructions.component';

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
  ] 
},
  { path: '**', redirectTo: 'auth/login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
