import { Component, EventEmitter, Input, Output } from '@angular/core';

interface Domain {
  name: string;
  weight?: number;
}

export interface CertificationFormData {
  id?: string;
  name: string;
  code: string;
  provider: string;
  description?: string;
  passingScore: number;
  timeLimit: number;
  domains: Domain[];
  active?: boolean;
}


@Component({
  selector: 'app-create-certification-modal',
  templateUrl: './create-certification-modal.component.html',
  styleUrls: ['./create-certification-modal.component.css']
})
export class CreateCertificationModalComponent {
  @Input() visible = false;
  @Input() isEdit = false;
  @Input() certificationData: CertificationFormData = this.getEmptyCertification();
  
  @Output() save = new EventEmitter<CertificationFormData>();
  @Output() cancel = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
    // Initialize with at least one domain if none exist
    if (!this.certificationData.domains || this.certificationData.domains.length === 0) {
      this.addDomain();
    }
  }

  getEmptyCertification(): CertificationFormData {
    return {
      name: '',
      code: '',
      provider: '',
      description: '',
      passingScore: 70,
      timeLimit: 180,
      domains: [{ name: '', weight: 0 }],
      active: true
    };
  }

  addDomain(): void {
    this.certificationData.domains.push({ name: '', weight: 0 });
  }

  removeDomain(index: number): void {
    if (this.certificationData.domains.length > 1) {
      this.certificationData.domains.splice(index, 1);
    }
  }

  close(): void {
    this.cancel.emit();
  }

  onSave(): void {
    this.save.emit(this.certificationData);
  }

}

