import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-time-warning-modal',
  templateUrl: './time-warning-modal.component.html',
  styleUrls: ['./time-warning-modal.component.css']
})
export class TimeWarningModalComponent {
  @Input() timeRemaining: number = 5;
  @Output() acknowledge = new EventEmitter<void>();
}
