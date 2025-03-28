import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ExamComponent } from './pages/student/exam/exam/exam.component';
import { AdminLayoutComponent, AuthLayoutComponent, ExamLayoutComponent, MainLayoutComponent } from './components/layouts/layouts.component';
import { SelectExamComponent } from './pages/student/exam/select-exam/select-exam.component';
import { ExamInstructionsComponent } from './pages/student/exam/exam-instructions/exam-instructions.component';
import { ExamResultsComponent } from './pages/student/exam/exam-results/exam-results.component';
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
import { StudentDashboardComponent } from './pages/student/student-dashboard/student-dashboard.component';
import { AdminLessonsComponent } from './pages/admin/admin-lessons/admin-lessons.component';
import { AdminTutorialAnalyticsComponent } from './pages/admin/admin-tutorial-analytics/admin-tutorial-analytics.component';
import { AdminTutorialsComponent } from './pages/admin/admin-tutorials/admin-tutorials.component';
import { ExerciseComponent } from './pages/student/exercise/exercise.component';
import { TutorialHubComponent } from './pages/student/tutorial-hub/tutorial-hub.component';
import { TutorialDetailComponent } from './pages/student/tutorial-detail/tutorial-detail.component';
import { LessonComponent } from './pages/student/lesson/lesson.component';

const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      // { path: 'forgot-password', component: ForgotPasswordComponent },
      // { path: 'reset-password/:token', component: ResetPasswordComponent },
      { path: 'admin/login', component: AdminLoginComponent },
    ]
  },

  
  { 
    path: 'student', 
    component: ExamLayoutComponent,
    canActivate: [authGuard], 
    loadChildren: () => import('./pages/student/student.module').then(m => m.StudentModule)
  },
{
  path: 'admin',
  component: AdminLayoutComponent,
  canActivate: [adminAuthGuard],
  loadChildren: () => import('./pages/admin/admin.module').then(m => m.AdminModule)
},

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
