import { Component, Input, OnInit } from '@angular/core';

export type SaveStatusType = 'saving' | 'saved' | 'error' | 'queued';

@Component({
  selector: 'app-save-status',
  templateUrl: './save-status.component.html'
})
export class SaveStatusComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() statusType: SaveStatusType = 'saving';
  @Input() message: string = '';
  @Input() position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right';
  
  get statusClass(): string {
    return `status-${this.statusType}`;
  }
  
  get positionClass(): string {
    switch (this.position) {
      case 'bottom-right':
        return 'bottom-5 right-5';
      case 'bottom-left':
        return 'bottom-5 left-5';
      case 'top-right':
        return 'top-5 right-5';
      case 'top-left':
        return 'top-5 left-5';
      default:
        return 'bottom-5 right-5';
    }
  }
  
  constructor() { }

  ngOnInit(): void {
  }
}