import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminQuestionsComponent } from './question/question.component';
import { AdminLessonsComponent } from './admin-lessons/admin-lessons.component';
import { AdminTutorialAnalyticsComponent } from './admin-tutorial-analytics/admin-tutorial-analytics.component';
import { AdminTutorialsComponent } from './admin-tutorials/admin-tutorials.component';
import { AdminCertificationsComponent } from './certification/certification.component';
import { AdminExamsComponent } from './exam/exam.component';
import { AdminUsersComponent } from './users/users.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AdminRoutingModule } from './admin-routing.module';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DomainModalComponent } from './certification/domain-modal/domain-modal.component';
import { ActiveExamsComponent } from './active-exams/active-exams.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { CertificationAnalyticsComponent } from './certification-analytics/certification-analytics.component';
import { CreateCertificationModalComponent } from './certification/create-certification-modal/create-certification-modal.component';
import { UploadDialogComponent } from './modals/upload-dialog/upload-dialog.component';
import { CreateUserDialogComponent } from './users/create-user-dialog/create-user-dialog.component';
import { RoleChangeDialogComponent } from './users/role-change-dialog/role-change-dialog.component';
import { UserDetailsDialogComponent } from './users/user-details-dialog/user-details-dialog.component';
import { UserAvatarComponent } from 'src/app/components/shared/user-avatar/user-avatar.component';

@NgModule({
  declarations: [
    AdminQuestionsComponent,
    AdminExamsComponent,
    AdminUsersComponent,
    AdminCertificationsComponent,
    AdminLessonsComponent,
    AdminTutorialsComponent,
    AdminTutorialAnalyticsComponent,
    DashboardComponent,
    DomainModalComponent,
    AnalyticsComponent,
    CertificationAnalyticsComponent,
    UploadDialogComponent,
    CreateUserDialogComponent,
    UserDetailsDialogComponent,
    RoleChangeDialogComponent,
    CreateCertificationModalComponent,
    UserAvatarComponent,
    ActiveExamsComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
