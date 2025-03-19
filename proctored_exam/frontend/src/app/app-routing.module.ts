import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ExamComponent } from './pages/exam/exam/exam.component';
import { AdminLayoutComponent, ExamLayoutComponent, MainLayoutComponent } from './components/layouts/layouts.component';
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
import { ActiveExamsComponent } from './pages/admin/active-exams/active-exams.component';
import { AnalyticsComponent } from './pages/admin/analytics/analytics.component';
import { CertificationAnalyticsComponent } from './pages/admin/certification-analytics/certification-analytics.component';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard.component';
import { AdminLessonsComponent } from './pages/admin-lessons/admin-lessons.component';
import { AdminTutorialAnalyticsComponent } from './pages/admin-tutorial-analytics/admin-tutorial-analytics.component';
import { AdminTutorialsComponent } from './pages/admin-tutorials/admin-tutorials.component';
import { ExerciseComponent } from './pages/exercise/exercise.component';
import { TutorialHubComponent } from './pages/tutorial-hub/tutorial-hub.component';
import { TutorialDetailComponent } from './pages/tutorial-detail/tutorial-detail.component';
import { LessonComponent } from './pages/lesson/lesson.component';

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
    ]
  },

  
  { 
    path: '', 
    component: ExamLayoutComponent,
    canActivate: [authGuard], 
    children: [
    { path: 'dashboard', component: StudentDashboardComponent },
    { path: 'exams/select', component: SelectExamComponent },
    { path: 'exams/:examId/session', component: ExamComponent },
    { path: 'exams/:examId/instructions', component: ExamInstructionsComponent },
    { path: 'exams/results/:attemptId', component: ExamResultsComponent },
    { path: 'exercises/:id', component: ExerciseComponent },
    { path: 'tutorials', component: TutorialHubComponent },
    { path: 'tutorials/:id', component: TutorialDetailComponent },
    { path: 'lessons/:id', component: LessonComponent },
    { path: 'exercises', component: ExerciseComponent },
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
    { path: 'active-exams', component: ActiveExamsComponent },
    { path: 'analytics', component: AnalyticsComponent },
    { path: 'analytics/certifications', component: CertificationAnalyticsComponent },
    { path: 'tutorials', component: AdminTutorialsComponent},
    { path: 'tutorials/:id/lessons', component: AdminLessonsComponent},
    { path: 'tutorials/:id/analytics', component: AdminTutorialAnalyticsComponent}
  ]
},

 { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
