import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  template: `
  <!-- admin-layout.component.html -->
<div class="min-h-screen flex bg-gray-100 text-gray-800">
  <!-- Sidebar for desktop -->
  <aside class="admin-sidebar bg-gray-800 text-white w-64 flex-shrink-0 hidden md:block">
    <div class="sidebar-header p-4 border-b border-gray-700">
      <div class="flex items-center">
        <!-- <img class="h-8 w-auto mr-3" src="/assets/images/logo-white.svg" alt="Logo"> -->
        <div>
          <h1 class="text-lg font-semibold">Admin Panel</h1>
          <p class="text-xs text-gray-400">Certification Practice Platform</p>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav p-4 flex flex-col h-full">
      <!-- Main navigation menu -->
      <ul class="space-y-1 flex-grow">
        <ng-container *ngFor="let item of navItems">
          <!-- Section header -->
          <li *ngIf="item.section" class="nav-section">
            <span class="nav-section-title">{{ item.section }}</span>
          </li>
          
          <!-- Navigation item -->
          <li *ngIf="!item.section">
            <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{exact: item.route === '/admin'}" class="nav-item">
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          </li>
        </ng-container>
      </ul>
      
      <!-- User profile and logout section -->
      <div class="mt-auto pt-4 border-t border-gray-700">
        <div class="flex items-center px-4 py-2">
          <img [src]="currentUser.avatar" alt="Profile" class="w-8 h-8 rounded-full mr-3">
          <div class="truncate">
            <div class="text-sm font-medium">{{ currentUser.name }}</div>
            <div class="text-xs text-gray-400 truncate">{{ currentUser.email }}</div>
          </div>
        </div>
        <a href="javascript:void(0)" (click)="logout()" class="nav-item mt-2 text-red-300 hover:text-red-100 hover:bg-red-800">
          <i class="fas fa-sign-out-alt"></i>
          <span>Log out</span>
        </a>
      </div>
    </nav>
  </aside>

  <!-- Mobile header -->
  <div class="md:hidden fixed top-0 left-0 right-0 bg-gray-800 text-white z-30">
    <div class="flex items-center justify-between p-4">
      <div class="flex items-center">
        <img class="h-8 w-auto mr-2" src="/assets/images/logo-white.svg" alt="Logo">
        <h1 class="text-lg font-semibold">Admin Panel</h1>
      </div>
      <button class="text-white focus:outline-none">
        <i class="fas fa-bars text-xl"></i>
      </button>
    </div>
  </div>

  <!-- Main content -->
  <div class="admin-content flex-grow md:ml-64 pt-16 md:pt-0">
    <div class="p-4 md:p-6">
      <router-outlet></router-outlet>
    </div>
  </div>
</div>
  `,
  styles: [
    `
    /* admin-layout.component.css */
.admin-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: 16rem;
}

.admin-content {
  width: 100%;
  min-height: 100vh;
}

.nav-item {
  display: flex;
  align-items: center;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  color: #d1d5db;
  border-radius: 0.375rem;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-item:hover {
  background-color: #374151;
  color: white;
}

.nav-item i {
  width: 1.25rem;
  text-align: center;
  margin-right: 0.75rem;
}

.nav-item.active {
  background-color: #111827;
  color: white;
}

.nav-section-title {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.05em;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

/* Styles for mobile navigation toggle */
.nav-toggle {
  border: none;
  background: transparent;
  color: white;
  cursor: pointer;
}

/* Styles for the user profile section */
.user-profile {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-top: 1px solid #374151;
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  margin-right: 0.75rem;
}

.user-info {
  overflow: hidden;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
}

.user-email {
  font-size: 0.75rem;
  color: #9ca3af;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
    `
  ]
})
export class AdminLayoutComponent {
  // Navigation items for the sidebar
  navItems = [
    { 
      icon: 'fas fa-tachometer-alt', 
      label: 'Dashboard', 
      route: '/admin/dashboard' 
    },
    {
      section: 'Content Management'
    },
    { 
      icon: 'fas fa-certificate', 
      label: 'Certifications', 
      route: '/admin/certifications' 
    },
    { 
      icon: 'fas fa-file-alt', 
      label: 'Exams', 
      route: '/admin/exams' 
    },
    { 
      icon: 'fas fa-question-circle', 
      label: 'Questions', 
      route: '/admin/questions' 
    },
    {
      section: 'User Management'
    },
    { 
      icon: 'fas fa-users', 
      label: 'Users', 
      route: '/admin/users' 
    },
    {
      section: 'Analytics'
    },
    { 
      icon: 'fas fa-chart-bar', 
      label: 'Reports', 
      route: '/admin/analytics' 
    },
    { 
      icon: 'fas fa-video', 
      label: 'Proctored Exams', 
      route: '/admin/active-exams' 
    }
  ];
  
  // User information - would typically come from an auth service
  currentUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    avatar: '/assets/images/avatar.jpg'
  };

  logout() {
    console.log("logout")
  }
}

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

