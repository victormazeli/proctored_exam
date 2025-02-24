// select-exam.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface Certification {
  _id: string;
  name: string;
  code: string;
  provider: string;
  description: string;
  passingScore: number;
  questionsCount: number;
  timeLimit: number;
  domains: string[];
}

@Component({
  selector: 'app-select-exam',
  templateUrl: './select-exam.component.html'
})
export class SelectExamComponent implements OnInit {
  // Mock data with the correct interface structure
  certifications: Certification[] = Array(20).fill(null).map((_, index) => {
    const providers = ['AWS', 'Azure', 'GCP', 'Oracle', 'Cisco'];
    const certTypes = ['Associate', 'Professional', 'Expert', 'Specialty'];
    const providerIndex = index % providers.length;
    const certTypeIndex = index % certTypes.length;

    return {
      _id: (index + 1).toString(),
      name: `${providers[providerIndex]} ${certTypes[certTypeIndex]} Certification`,
      code: `${providers[providerIndex].substring(0, 2)}-${(index + 1).toString().padStart(3, '0')}`,
      provider: providers[providerIndex],
      description: `Complete practice exam to prepare for the ${providers[providerIndex]} ${certTypes[certTypeIndex]} certification.`,
      passingScore: 70 + (index % 5),
      questionsCount: 50 + (index % 4) * 10,
      timeLimit: 90 + (index % 3) * 30,
      domains: [
        'Architecture Overview',
        'Security and Compliance',
        'Technology Implementation',
        'Operational Excellence'
      ]
    };
  });

  // Pagination
  currentPage = 1;
  itemsPerPage = 6;
  searchTerm = '';

  // Computed properties
  get filteredCertifications(): Certification[] {
    return this.certifications.filter(cert =>
      cert.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      cert.code.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      cert.provider.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCertifications.length / this.itemsPerPage);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.itemsPerPage, this.filteredCertifications.length);
  }

  get paginatedCertifications(): Certification[] {
    return this.filteredCertifications.slice(this.startIndex, this.endIndex);
  }

  constructor(private router: Router) {}

  ngOnInit(): void {}

  // Pagination methods
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Search and filters
  onSearch(): void {
    this.currentPage = 1;
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
  }

  // Navigation
  startExam(certId: string): void {
    this.router.navigate(['/exams', certId, 'instructions']);
  }
}