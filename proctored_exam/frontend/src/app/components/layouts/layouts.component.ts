import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  template: `
    <div class="min-h-screen flex bg-gray-100 text-gray-800">
      <aside class="admin-sidebar bg-gray-800 text-white w-64 flex-shrink-0 hidden md:block">
        <div class="sidebar-header p-4 border-b border-gray-700">
          <div class="flex items-center">
            <img class="h-8 w-auto mr-3" src="/assets/images/logo-white.svg" alt="Logo">
            <div>
              <h1 class="text-lg font-semibold">Admin Panel</h1>
              <p class="text-xs text-gray-400">Certification Practice Platform</p>
            </div>
          </div>
        </div>
        <nav class="sidebar-nav p-4">
          <ul class="space-y-1">
            <li>
              <a routerLink="/admin" class="nav-item">
                <i class="fas fa-tachometer-alt"></i>
                <span>Dashboard</span>
              </a>
            </li>
            <li class="nav-section">
              <span class="nav-section-title">Content Management</span>
            </li>
            <li>
              <a routerLink="/admin/certifications" class="nav-item">
                <i class="fas fa-certificate"></i>
                <span>Certifications</span>
              </a>
            </li>
            <li>
              <a routerLink="/admin/exams" class="nav-item">
                <i class="fas fa-file-alt"></i>
                <span>Exams</span>
              </a>
            </li>
            <li>
              <a routerLink="/admin/questions" class="nav-item">
                <i class="fas fa-question-circle"></i>
                <span>Questions</span>
              </a>
            </li>
          </ul>
        </nav>
      </aside>
      <div class="admin-content flex-grow md:ml-64">
        <div class="p-6">
          <!-- <router-outlet></router-outlet> -->
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .admin-sidebar {
      @apply fixed inset-y-0 left-0 z-20 flex flex-col;
      width: 16rem;
    }
    .admin-content {
      @apply w-full min-h-screen;
    }
    .nav-item {
      @apply flex items-center px-4 py-2 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors;
    }
    .nav-item i {
      @apply w-5 text-center mr-3;
    }
    .nav-item.active {
      @apply bg-gray-900 text-white;
    }
    `
  ]
})
export class AdminLayoutComponent {}

@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <div class="w-full max-w-sm mb-8">
        <a routerLink="/" class="block text-center">
          <img class="h-12 mx-auto" src="/assets/images/logo.svg" alt="Certification Practice Platform">
          <h1 class="text-2xl font-bold text-gray-800 mt-4">Certification Practice Platform</h1>
        </a>
      </div>
      <div class="w-full max-w-md">
        <router-outlet></router-outlet>
      </div>
      <div class="mt-8 text-center">
        <p class="text-sm text-gray-500">&copy; {{ year }} Certification Practice Platform</p>
        <div class="mt-2 flex justify-center space-x-4">
          <a routerLink="/privacy" class="text-sm text-gray-500 hover:text-gray-700">Privacy Policy</a>
          <a routerLink="/terms" class="text-sm text-gray-500 hover:text-gray-700">Terms of Service</a>
          <a routerLink="/contact" class="text-sm text-gray-500 hover:text-gray-700">Contact Us</a>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AuthLayoutComponent {
  year: number = new Date().getFullYear();
}

@Component({
  selector: 'app-main-layout',
  template: `
    <app-header></app-header>
    <main class="flex-grow">
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>
  `,
  styles: []
})
export class MainLayoutComponent {
  hideNavbar = false;
  hideFooter = false;
}

@Component({
  selector: 'app-exam-layout',
  template: `
     <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: []
})
export class ExamLayoutComponent {}

