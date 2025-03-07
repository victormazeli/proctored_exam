import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-submit-modal',
  templateUrl: './submit-modal.component.html',
  styleUrls: ['./submit-modal.component.css']
})
export class SubmitModalComponent {
  @Input() unansweredCount: number = 0;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
