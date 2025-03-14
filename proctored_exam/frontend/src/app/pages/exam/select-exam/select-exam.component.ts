import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Certification } from 'src/app/models/certification.interface';
import { Exam } from 'src/app/models/exam.interface';
import { ExamService } from 'src/app/services/exam.service';
import { NotificationService } from 'src/app/services/notification.service';



@Component({
  selector: 'app-select-exam',
  templateUrl: './select-exam.component.html',
})
export class SelectExamComponent implements OnInit {
  // All certifications and exams
  certifications: Certification[] = [];
  exams: Exam[] = [];
  
  // Filtered and paginated exams
  filteredExams: Exam[] = [];
  paginatedExams: Exam[] = [];
  
  // Certification filter
  selectedCertificationId: string = '';
  selectedCertification: Certification | null = null;
  
  // Search and filter properties
  searchTerm: string = '';
  showActiveOnly: boolean = true;
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 1;
  startIndex: number = 0;
  endIndex: number = 0;
  
  // Map to cache certification details for quick lookup
  certificationMap: Map<string, Certification> = new Map();
  
  constructor(
    private examService: ExamService,
    private notificationService: NotificationService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadCertifications();
    this.loadExams();
  }
  
  // Load all certifications
  loadCertifications(): void {
    this.examService.getCertifications().subscribe({
      next: (response) => {
        const data: Certification[] = response.data;
        // Filter only active certifications
        this.certifications = data.filter(cert => cert.active);
        
        // Build certification map for quick lookup
        this.certificationMap.clear();
        for (const cert of this.certifications) {
          this.certificationMap.set(cert._id, cert);
        }
      },
      error: (error) => {
        console.log(error)
       this.notificationService.showError('unable to load certifications')
      }
    });
  }
  
  // Load all exams
  loadExams(): void {
    this.examService.getExams().subscribe({
      next: (response) => {
        const data: Exam[] = response.data;
        this.exams = data;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading exams:', error);
      }
    });
  }
  
  // Apply all filters (certification, search term, active status)
  applyFilters(): void {
    let filtered = [...this.exams];

    console.log(filtered)
    
    // Filter by certification if selected
    if (this.selectedCertificationId) {
      filtered = filtered.filter(exam => exam.certificationId._id === this.selectedCertificationId);
    }
    
    // Filter by active status if enabled
    if (this.showActiveOnly) {
      filtered = filtered.filter(exam => exam.active);
    }
    
    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(exam => 
        exam.name.toLowerCase().includes(term) ||
        (exam.description && exam.description.toLowerCase().includes(term))
      );
    }
    
    this.filteredExams = filtered;
    this.totalPages = Math.ceil(this.filteredExams.length / this.itemsPerPage);
    
    // Reset to first page when filters change
    this.currentPage = 1;
    this.updatePaginatedExams();
  }
  
  // Update paginated exams based on current page
  updatePaginatedExams(): void {
    this.startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.endIndex = Math.min(this.startIndex + this.itemsPerPage, this.filteredExams.length);
    
    this.paginatedExams = this.filteredExams.slice(this.startIndex, this.endIndex);
  }
  
  // Get certification name from ID
  getCertificationName(certificationId: string): string {
    const certification = this.certificationMap.get(certificationId);
    return certification ? `${certification.provider} - ${certification.name}` : 'Unknown';
  }
  
  // Handle certification change
  onCertificationChange(): void {
    // Update selected certification object
    this.selectedCertification = this.selectedCertificationId ? 
      this.certificationMap.get(this.selectedCertificationId) || null : null;
    
    // Apply filters
    this.applyFilters();
  }
  
  // Search event handler
  onSearch(): void {
    this.applyFilters();
  }
  
  // Items per page change handler
  onItemsPerPageChange(): void {
    this.totalPages = Math.ceil(this.filteredExams.length / this.itemsPerPage);
    
    // Ensure current page is still valid
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    
    this.updatePaginatedExams();
  }
  
  // Pagination navigation methods
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedExams();
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedExams();
    }
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedExams();
    }
  }
  
  // Generate an array of page numbers for pagination buttons
  getPageNumbers(): number[] {
    const pageNumbers: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // If total pages are less than or equal to max visible, show all pages
      for (let i = 1; i <= this.totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page, last page, current page, and pages adjacent to current
      const firstPage = 1;
      const lastPage = this.totalPages;
      
      // Add first page
      pageNumbers.push(firstPage);
      
      // Add pages around current page
      for (let i = Math.max(2, this.currentPage - 1); i <= Math.min(this.totalPages - 1, this.currentPage + 1); i++) {
        pageNumbers.push(i);
      }
      
      // Add last page if it's not already added
      if (pageNumbers.indexOf(lastPage) === -1) {
        pageNumbers.push(lastPage);
      }
    }
    
    return pageNumbers;
  }
  
  // Start the selected exam
  goToExamInstructions(examId: string): void {
    this.router.navigate(['/portal/exams', examId, 'instructions']);
  }
}