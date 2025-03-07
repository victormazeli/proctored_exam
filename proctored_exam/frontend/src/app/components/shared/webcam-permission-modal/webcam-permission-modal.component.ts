import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-webcam-permission-modal',
  templateUrl: './webcam-permission-modal.component.html',
  styleUrls: ['./webcam-permission-modal.component.css']
})
export class WebCamPermissionModalComponent {
  @Output() retry = new EventEmitter<void>();
}
