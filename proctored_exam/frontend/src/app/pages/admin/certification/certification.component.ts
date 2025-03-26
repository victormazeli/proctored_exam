// admin-certifications.component.ts
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CertificationFormData } from './create-certification-modal/create-certification-modal.component';
import { Certification } from './domain-modal/domain-modal.component';
import { Domain } from 'src/app/models/certification.interface';
import { AdminService } from 'src/app/services/admin.service';
import { NotificationService } from 'src/app/services/notification.service';


interface CertificationStats {
  [key: string]: {
    examCount: number;
    questionCount: number;
    attemptCount: number;
  };
}

@Component({
  selector: 'app-admin-certifications',
  templateUrl: './certification.component.html',
  styleUrls: ['./certification.component.css']
})
export class AdminCertificationsComponent implements OnInit {
  certifications: Certification[] = [];
  certStats: CertificationStats = {};
  showCertificationModal = false;
  showDomainsModal = false;
  modalTitle = 'Add New Certification';
  domainsLoading = false;
  
  // Certification modal properties
  certificationForm: CertificationFormData = this.getEmptyCertification();
  selectedCertification: Certification | null = null;

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadCertifications();
  }

  loadCertifications(): void {
    this.adminService.getCertifications().subscribe({
     next: data => {
      console.log(data)
        this.certifications = data.data.certifications;
        this.certStats = data.data.certStats;
      },
     error: error => console.error('Error loading certifications:', error)
  });
  }

  openAddCertificationModal(): void {
    this.certificationForm = this.getEmptyCertification();
    this.showCertificationModal = true;
  }

  closeCertificationModal(): void {
    this.showCertificationModal = false;
  }

  resetForm(): void {
    this.certificationForm = {
      id: '',
      name: '',
      code: '',
      provider: '',
      description: '',
      passingScore: 72,
      timeLimit: 180,
      domains: [{ name: '' }]
    };
  }

  addDomain(): void {
    this.certificationForm.domains.push({ name: '' });
  }

  removeDomain(index: number): void {
    if (this.certificationForm.domains.length > 1) {
      this.certificationForm.domains.splice(index, 1);
    }
  }

  saveCertification(formData: CertificationFormData): void {
    if (formData.id) {
      // Update existing certification
      this.adminService.updateCertification(formData.id, formData).subscribe({
        next: () => {
          this.closeCertificationModal();
          this.loadCertifications();
          this.notificationService.showSuccess('certification updated successfully')
        },
        error: (error: any) => {
          this.notificationService.showError(error.error.message)
        }
      });
    } else {
      // Create new certification
      this.adminService.createCertification(formData).subscribe({
        next: () => {
          this.closeCertificationModal();
          this.loadCertifications();
          this.notificationService.showSuccess('certification created successfully')
        },
        error: (error: any) => {
          this.notificationService.showError(error.error.message)
        }
      });
    }
  }



  viewDomains(certId: string): void {
    this.domainsLoading = true;
    this.showDomainsModal = true;
    
    this.adminService.getCertification(certId).subscribe(
      data => {
        this.domainsLoading = false;
        if (data.success) {
          this.selectedCertification = data.certification;
        }
      },
      error => {
        this.domainsLoading = false;
        this.notificationService.showError(error.error.message)
      }
    );
  }

  closeDomainsModal(): void {
    this.showDomainsModal = false;
    this.selectedCertification = null;
  }


  toggleCertificationStatus(cert: Certification): void {
    const newStatus = !cert.active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this certification?`)) {
      return;
    }
    
    this.adminService.updateCertificationStatus(cert._id, newStatus).subscribe({
     next: data => {
        if (data.success) {
          cert.active = newStatus;
        }
        this.notificationService.showSuccess('update successful')
      },
      error: error => this.notificationService.showError(error.error.message)
  });
  }


  openEditCertificationModal(certId: string): void {
    const cert = this.certifications.find(c => c._id === certId);
    if (cert) {
      this.certificationForm = {
        id: cert._id,
        name: cert.name,
        code: cert.code,
        provider: cert.provider,
        description: cert.description,
        passingScore: cert.passingScore,
        timeLimit: cert.timeLimit,
        domains: cert.domains && cert.domains.length > 0 ? 
        cert.domains.map((domain: Domain) => ({ name: domain.name, weight: domain.weight })) : 
        [{ name: '' }]
    };
        active: cert.active
      };
      this.showCertificationModal = true;
  }




  editDomains(certId: string): void {
    this.closeDomainsModal();
    this.openEditCertificationModal(certId);
  }


  private getEmptyCertification(): CertificationFormData {
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
}