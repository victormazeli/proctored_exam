import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamInstructionsComponent } from './exam/exam-instructions/exam-instructions.component';
import { ExamResultsComponent } from './exam/exam-results/exam-results.component';
import { ExamComponent } from './exam/exam/exam.component';
import { ResumeExamDialogComponent } from './exam/resume-exam-dialog/resume-exam-dialog.component';
import { SelectExamComponent } from './exam/select-exam/select-exam.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { ExerciseComponent } from './exercise/exercise.component';
import { LessonComponent } from './lesson/lesson.component';
import { TutorialDetailComponent } from './tutorial-detail/tutorial-detail.component';
import { TutorialHubComponent } from './tutorial-hub/tutorial-hub.component';
import { StudentRoutingModule } from './student-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConnectionStatusComponent } from 'src/app/components/shared/connection-status/connection-status.component';
import { NotificationComponent } from 'src/app/components/shared/notification/notification.component';
import { ProctorWarningModalComponent } from 'src/app/components/shared/proctor-warning-modal/proctor-warning-modal.component';
import { SaveStatusComponent } from 'src/app/components/shared/save-status/save-status.component';
import { SubmitModalComponent } from 'src/app/components/shared/submit-modal/submit-modal.component';
import { TimeWarningModalComponent } from 'src/app/components/shared/time-warning-modal/time-warning-modal.component';
import { WebCamPermissionModalComponent } from 'src/app/components/shared/webcam-permission-modal/webcam-permission-modal.component';

@NgModule({
  declarations: [
    StudentDashboardComponent,
    ExamComponent,
    SelectExamComponent,
    ExamInstructionsComponent,
    ExamResultsComponent,
    ResumeExamDialogComponent,
    ExerciseComponent,
    LessonComponent,
    TutorialHubComponent,
    TutorialDetailComponent,
    ExerciseComponent,
    ExamComponent,
    SubmitModalComponent,
    TimeWarningModalComponent,
    ProctorWarningModalComponent,
    WebCamPermissionModalComponent,
    ResumeExamDialogComponent,
  ],
  imports: [
    CommonModule,
    StudentRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class StudentModule { }
