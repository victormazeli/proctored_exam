// admin-certifications.component.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from 'src/app/services/admin.service';

interface Certification {
  _id: string;
  name: string;
  code: string;
  provider: string;
  active: boolean;
  passingScore: number;
  timeLimit: number;
  domains: Domain[];
}

interface Domain {
  name: string;
  weight?: number;
}

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
  selectedCertification: any = null;
  domainsLoading = false;
  
  // Form model
  certificationForm: any = {
    id: '',
    name: '',
    code: '',
    provider: '',
    description: '',
    passingScore: 72,
    timeLimit: 180,
    domains: [{ name: '' }]
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadCertifications();
  }

  loadCertifications(): void {
    this.adminService.getCertifications().subscribe(
      data => {
        this.certifications = data.certifications;
        this.certStats = data.certStats;
      },
      error => console.error('Error loading certifications:', error)
    );
  }

  openAddCertificationModal(): void {
    this.resetForm();
    this.modalTitle = 'Add New Certification';
    this.showCertificationModal = true;
  }

  openEditCertificationModal(certId: string): void {
    this.modalTitle = 'Edit Certification';
    this.adminService.getCertification(certId).subscribe(
      data => {
        if (data.success) {
          const cert = data.certification;
          this.certificationForm = {
            id: cert._id,
            name: cert.name,
            code: cert.code,
            provider: cert.provider,
            description: cert.description || '',
            passingScore: cert.passingScore,
            timeLimit: cert.timeLimit,
            domains: cert.domains && cert.domains.length > 0 ? 
              cert.domains.map((domain: Domain) => ({ name: domain.name, weight: domain.weight })) : 
              [{ name: '' }]
          };
          this.showCertificationModal = true;
        }
      },
      error => console.error('Error loading certification:', error)
    );
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

  saveCertification(): void {
    if (!this.validateForm()) {
      return;
    }

    const requestData = {
      id: this.certificationForm.id || undefined,
      name: this.certificationForm.name,
      code: this.certificationForm.code,
      provider: this.certificationForm.provider,
      description: this.certificationForm.description,
      passingScore: parseInt(this.certificationForm.passingScore),
      timeLimit: parseInt(this.certificationForm.timeLimit),
      domains: this.certificationForm.domains.filter((domain: Domain) => domain.name.trim() !== '')
    };

    const isUpdate = !!requestData.id;
    
    this.adminService.saveCertification(requestData, isUpdate).subscribe(
      data => {
        if (data.success) {
          this.closeCertificationModal();
          this.loadCertifications();
        }
      },
      error => console.error(`Error ${isUpdate ? 'updating' : 'creating'} certification:`, error)
    );
  }

  validateForm(): boolean {
    // Basic validation
    if (!this.certificationForm.name || !this.certificationForm.code || !this.certificationForm.provider) {
      return false;
    }
    
    // Check passing score
    if (isNaN(this.certificationForm.passingScore) || 
        this.certificationForm.passingScore < 1 || 
        this.certificationForm.passingScore > 100) {
      return false;
    }
    
    // Check time limit
    if (isNaN(this.certificationForm.timeLimit) || this.certificationForm.timeLimit < 1) {
      return false;
    }
    
    // Check domains
    const validDomains = this.certificationForm.domains.filter(
      (domain: Domain) => domain.name.trim() !== ''
    );
    
    return validDomains.length > 0;
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
        console.error('Error loading domains:', error);
      }
    );
  }

  closeDomainsModal(): void {
    this.showDomainsModal = false;
    this.selectedCertification = null;
  }

  editDomains(certId: string): void {
    this.closeDomainsModal();
    this.openEditCertificationModal(certId);
  }

  toggleCertificationStatus(cert: Certification): void {
    const newStatus = !cert.active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this certification?`)) {
      return;
    }
    
    this.adminService.updateCertificationStatus(cert._id, newStatus).subscribe(
      data => {
        if (data.success) {
          cert.active = newStatus;
        }
      },
      error => console.error(`Error ${action}ing certification:`, error)
    );
  }
}