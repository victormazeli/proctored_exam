import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-proctor-warning-modal',
  templateUrl: './proctor-warning-modal.component.html',
  styleUrls: ['./proctor-warning-modal.component.css']
})
export class ProctorWarningModalComponent {
  @Input() message: string = 'Your face must remain visible during the exam.';
  @Output() acknowledge = new EventEmitter<void>();
}
