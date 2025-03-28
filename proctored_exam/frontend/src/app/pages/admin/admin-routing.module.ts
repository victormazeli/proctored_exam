import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ActiveExamsComponent } from './active-exams/active-exams.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { CertificationAnalyticsComponent } from './certification-analytics/certification-analytics.component';
import { AdminCertificationsComponent } from './certification/certification.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AdminExamsComponent } from './exam/exam.component';
import { AdminQuestionsComponent } from './question/question.component';
import { AdminUsersComponent } from './users/users.component';
import { AdminLessonsComponent } from './admin-lessons/admin-lessons.component';
import { AdminTutorialAnalyticsComponent } from './admin-tutorial-analytics/admin-tutorial-analytics.component';
import { AdminTutorialsComponent } from './admin-tutorials/admin-tutorials.component';


const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'certifications', component: AdminCertificationsComponent },
      { path: 'exams', component: AdminExamsComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'questions', component: AdminQuestionsComponent },
      { path: 'active-exams', component: ActiveExamsComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'analytics/certifications', component: CertificationAnalyticsComponent },
      { path: 'tutorials', component: AdminTutorialsComponent },
      { path: 'tutorials/:id/lessons', component: AdminLessonsComponent },
      { path: 'tutorials/:id/analytics', component: AdminTutorialAnalyticsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
