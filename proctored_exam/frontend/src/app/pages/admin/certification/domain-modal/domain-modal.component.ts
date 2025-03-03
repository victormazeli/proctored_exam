// domains-modal.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

interface Domain {
  name: string;
  weight?: number;
  questionCount?: number;
}

export interface Certification {
  _id: string;
  name: string;
  code: string;
  provider: string;
  description?: string;
  passingScore: number;
  timeLimit: number;
  domains: Domain[];
  active: boolean;
}

@Component({
  selector: 'app-domains-modal',
  templateUrl: './domain-modal.component.html',
  styleUrls: ['./domain-modal.component.css']
})
export class DomainModalComponent implements OnInit {
  @Input() visible = false;
  @Input() certification: Certification | null = null;
  @Input() loading = false;
  
  @Output() edit = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

  onEdit(): void {
    if (this.certification) {
      this.edit.emit(this.certification._id);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}