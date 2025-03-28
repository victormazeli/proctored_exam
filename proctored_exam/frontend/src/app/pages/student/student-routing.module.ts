import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExamInstructionsComponent } from './exam/exam-instructions/exam-instructions.component';
import { ExamResultsComponent } from './exam/exam-results/exam-results.component';
import { ExamComponent } from './exam/exam/exam.component';
import { SelectExamComponent } from './exam/select-exam/select-exam.component';
import { ExerciseComponent } from './exercise/exercise.component';
import { LessonComponent } from './lesson/lesson.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { TutorialDetailComponent } from './tutorial-detail/tutorial-detail.component';
import { TutorialHubComponent } from './tutorial-hub/tutorial-hub.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  { 
    path: '',
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
      { path: 'exercises', component: ExerciseComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StudentRoutingModule { }
