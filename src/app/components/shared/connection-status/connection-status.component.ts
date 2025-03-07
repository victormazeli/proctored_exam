import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export type ConnectionStatusType = 'offline' | 'warning' | 'success';

@Component({
  selector: 'app-connection-status',
  templateUrl: './connection-status.component.html'
})
export class ConnectionStatusComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() statusType: ConnectionStatusType = 'offline';
  @Input() message: string = '';
  @Input() dismissible: boolean = false;
  
  @Output() dismiss = new EventEmitter<void>();
  
  get statusClass(): string {
    return `status-${this.statusType}`;
  }
  
  constructor() { }

  ngOnInit(): void {
  }
  
  onDismiss(): void {
    this.dismiss.emit();
  }
}