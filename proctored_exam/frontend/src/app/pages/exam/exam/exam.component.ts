import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { ConnectionStatusService } from 'src/app/components/shared/connection-status/connection-status.service';
import { SaveStatusService } from 'src/app/components/shared/save-status/save-status.service';
import { ExamData } from 'src/app/models/exam.interface';
import { ExamService } from 'src/app/services/exam.service';
import { MockProctorService } from 'src/app/services/mock-proctor.service';
import { NetworkStatusService } from 'src/app/services/network-status.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ProctorService } from 'src/app/services/proctor.service';



@Component({
  selector: 'app-exam',
  templateUrl: './exam.component.html',
  // styleUrls: ['./exam.component.css']
})
export class ExamComponent implements OnInit, OnDestroy {
  @ViewChild('proctorWebcam') proctorWebcam!: ElementRef;

  examData: ExamData = {
    id: '',
    timeLimit: 0,
    questions: [],
    proctorEnabled: false,
    answers: {},
    timeSpent: {},
    flagged: [],
    currentQuestionIndex: 0,
    startTime: Date.now(),
    endTime: null,
    proctorEvents: [],
    metadata: {
      examName: '',
      allowReview: false,
      certificationName: '',
      randomizeQuestions: true,
      totalQuestions: 0
    }
  };

  currentQuestion: any = null;
  timerDisplay: string = '00:00:00';
  timerClasses: Record<string, boolean> = {};
  isNavigatorVisible: boolean = false;
  currentFilter: string = 'all';
  proctorStatusText: string = '';
  proctorStatusClass: string = '';
  timeWarningMinutes: number = 5;
  proctorWarningMessage: string = '';
  currentQuestionIndex: number = 0;
  
  // Modal visibility flags
  isSubmitModalVisible: boolean = false;
  isTimeWarningModalVisible: boolean = false;
  isProctorWarningModalVisible: boolean = false;
  isWebcamPermissionModalVisible: boolean = false;
  isWebcamMinimized = false;
  timeWarningShown: boolean | string = false;
  
  private timerInterval: any = null;
  private timeRemaining: number = 0;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS: number = 5;
  private currentQuestionStartTime: number = Date.now();

  private autoSaveInterval: any = null;
  private isDirty: boolean = false;
  private lastSaveTime: number = 0;
  private readonly SAVE_DEBOUNCE_MS: number = 5000; // 5 seconds debounce

  private saveQueue: any[] = [];
  isOnline: boolean = navigator.onLine;
  private reconnectInterval: any = null;
  private lastSaveAttempt: number = 0;


  private networkStatusSubscription: Subscription | null = null;
  private connectionStateSubscription: Subscription | null = null;


  filters = [
    { label: 'All', value: 'all' },
    { label: 'Answered', value: 'answered' },
    { label: 'Flagged', value: 'flagged' },
    { label: 'Unanswered', value: 'unanswered' }
  ];

   // Bound event handler
  private boundHandleBeforeUnload: (event: BeforeUnloadEvent) => void;

  constructor(
    private examService: ExamService,
    private proctorService: ProctorService,
    private notificationService: NotificationService,
    private networkStatusService: NetworkStatusService,
    private saveStatusService: SaveStatusService,
    private connectionStatusService: ConnectionStatusService,
    private router: Router,
    private route: ActivatedRoute,
    private socket: Socket
  ) {
        // Bind the event handler in constructor
        this.boundHandleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.route.queryParams.subscribe(queryParams => {
        if (queryParams['resume'] && queryParams['resume'] == 'true') {
          this.resumeExam(params['examId']);
        }else {
          this.initializeExam(params['examId']);
        }
      })
    });
      
    // Set up auto-save interval
    this.setupAutoSave();

    window.addEventListener('beforeunload', this.boundHandleBeforeUnload);
    // Set up network status listeners
    this.subscribeToNetworkStatus();
  }

  ngOnDestroy() {
    this.cleanupExam();
    this.cleanupProctoring();

     // Unsubscribe from services
     if (this.networkStatusSubscription) {
      this.networkStatusSubscription.unsubscribe();
    }
    if (this.connectionStateSubscription) {
      this.connectionStateSubscription.unsubscribe();
    }

      // Try one last save if needed
      if (this.isDirty && this.isOnline) {
        this.saveProgress();
      }
  }

  private subscribeToNetworkStatus() {
    this.networkStatusSubscription = this.networkStatusService
      .getNetworkStatus()
      .subscribe(status => {
        const wasOnline = this.isOnline;
        this.isOnline = status.isOnline;
        
        // Handle online/offline transitions
        if (this.isOnline && !wasOnline) {
          // Just came back online
          this.connectionStatusService.showSuccess(
            'Your connection has been restored. Saving your progress...'
          );
          this.processSaveQueue();
        } else if (!this.isOnline && wasOnline) {
          // Just went offline
          this.connectionStatusService.showOffline(
            'You are offline. Your answers will be saved when connection is restored.'
          );
        }
        
        // Handle connection quality changes
        if (this.isOnline && status.connectionQuality === 'poor') {
          this.connectionStatusService.showWarning(
            'Your internet connection is unstable. Your progress will continue to be saved.',
            true,
            10000
          );
        }
      });
  }

  private initializeExam(examId: string) {
    this.examService.initializeExam(examId).subscribe({
      next: (data) => {
        this.examData = data;
        this.timeRemaining = this.examData.timeLimit;
        this.loadQuestion(0);
        this.startTimer();
  
        if (this.examData.proctorEnabled) {
          this.initializeProctoring();
        }
  
      },
      error: (error) => {
        console.error('Failed to initialize exam:', error);
        this.notificationService.showError('Failed to initialize exam');
        this.router.navigate(['/exams/select']);
      }
    });
  }
  
  private resumeExam(attemptId: string) {
    this.examService.resumeExam(attemptId).subscribe({
      next: (response) => {
        this.examData = response.data;
        this.timeRemaining = this.examData.timeLimit;
        this.loadQuestion(0);
        this.startTimer();
  
        if (this.examData.proctorEnabled) {
          this.initializeProctoring();
        }
  
      },
      error: (error) => {
        console.error('Failed to resume exam:', error);
        this.notificationService.showError('Failed to resume exam');
        this.router.navigate(['/exams/select']);
      }
    });
  }
  private startTimer() {
    this.updateTimerDisplay();
    
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.updateTimerDisplay();
      
      if (this.timeRemaining === 300 && !this.timeWarningShown) {
        this.showTimeWarning(5);
        this.timeWarningShown = true;
      }
      else if (this.timeRemaining === 60 && this.timeWarningShown === true) {
        this.showTimeWarning(1);
        this.timeWarningShown = 'critical';
      }
      
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.submitExam(true);
      }
    }, 1000);
  }

  private updateTimerDisplay() {
    const hours = Math.floor(this.timeRemaining / 3600);
    const minutes = Math.floor((this.timeRemaining % 3600) / 60);
    const seconds = this.timeRemaining % 60;
    
    this.timerDisplay = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    this.timerClasses = {
      'timer-warning': this.timeRemaining < 300,
      'timer-critical': this.timeRemaining < 60
    };
  }

  // Navigation methods
  goToNextQuestion() {
    if (this.currentQuestionIndex < this.examData.questions.length - 1) {
      this.saveCurrentQuestionState();
      this.loadQuestion(this.currentQuestionIndex + 1);
    }
  }

  goToPreviousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.saveCurrentQuestionState();
      this.loadQuestion(this.currentQuestionIndex - 1);
    }
  }



    // Add this computed property for filtered questions
    get filteredQuestions(): any[] {
      return this.examData.questions.filter((_, index) => this.shouldShowQuestion(index));
    }
  
    /**
     * Check if a question has been answered
     */
    isQuestionAnswered(index: number): boolean {
      return this.examData.answers[index] !== undefined;
    }
  
    /**
     * Check if a question is flagged for review
     */
    isQuestionFlagged(index: number): boolean {
      return this.examData.flagged.includes(index);
    }
  
    /**
     * Determine if a question should be shown based on current filter
     */
    shouldShowQuestion(index: number): boolean {
      switch (this.currentFilter) {
        case 'answered':
          return this.isQuestionAnswered(index);
        case 'flagged':
          return this.isQuestionFlagged(index);
        case 'unanswered':
          return !this.isQuestionAnswered(index);
        default: // 'all'
          return true;
      }
    }
  
    /**
     * Load a specific question and handle state saving
     */
    loadQuestion(index: number): void {
      // Save current question state before loading new one
      if (this.examData.currentQuestionIndex !== index) {
        this.saveCurrentQuestionState();
        this.saveCurrentQuestionTime();
      }
  
      // Validate index
      if (index < 0 || index >= this.examData.questions.length) {
        console.error('Invalid question index:', index);
        return;
      }
  
      // Update current question index
      this.examData.currentQuestionIndex = index;
      this.currentQuestionIndex = index; // Update the tracked index
  
      // Get the question
      this.currentQuestion = this.examData.questions[index];
  
      // Start tracking time for this question
      this.examData.timeSpent[index] = this.examData.timeSpent[index] || 0;
      this.currentQuestionStartTime = Date.now();
  
      // Update navigation state
      this.updateNavigationState();
    }
  
    /**
     * Update navigation state (enable/disable buttons, etc.)
     */
    private updateNavigationState(): void {
      const isPrevDisabled = this.currentQuestionIndex === 0;
      const isLastQuestion = this.currentQuestionIndex === this.examData.questions.length - 1;
  
      // Update progress indicators
      const progressPercentage = ((this.currentQuestionIndex + 1) / this.examData.questions.length) * 100;
      
      // You might want to update the DOM directly or use a separate property to track these
      const progressFill = document.getElementById('progress-fill');
      if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
      }
  
      // Update navigation button states
      const prevButton = document.getElementById('prev-button') as HTMLButtonElement;
      if (prevButton) {
        prevButton.disabled = isPrevDisabled;
      }
  
      const nextButton = document.getElementById('next-button');
      const submitButton = document.getElementById('submit-button');
      
      if (nextButton && submitButton) {
        if (isLastQuestion) {
          nextButton.classList.add('hidden');
          submitButton.classList.remove('hidden');
        } else {
          nextButton.classList.remove('hidden');
          submitButton.classList.add('hidden');
        }
      }
    }
  
  
    /**
     * Toggle question navigator visibility
     */
    toggleQuestionNavigator(): void {
      this.isNavigatorVisible = !this.isNavigatorVisible;
      if (this.isNavigatorVisible) {
        // Update counters when showing navigator
        this.updateQuestionGrid();
      }
    }
  
    /**
     * Update the question grid state
     */
    private updateQuestionGrid(): void {
      // This method would be called whenever the grid needs to be refreshed
      // The template will automatically update based on the data changes
      
      // You might want to trigger change detection explicitly in some cases
      // this.changeDetectorRef.detectChanges();
    }

  // Question handling methods
  toggleFlagQuestion() {
    const currentIndex = this.examData.currentQuestionIndex;
    const isFlagged = this.examData.flagged.includes(currentIndex);
    
    if (isFlagged) {
      this.examData.flagged = this.examData.flagged.filter(index => index !== currentIndex);
    } else {
      this.examData.flagged.push(currentIndex);
    }
  }

  selectOption(option: any) {
    this.examData.answers[this.currentQuestionIndex] = option.id;
  }

  isOptionSelected(option: any): boolean {
    return this.examData.answers[this.currentQuestionIndex] === option.id;
  }

  isCurrentQuestionFlagged(): boolean {
    return this.examData.flagged.includes(this.currentQuestionIndex);
  }

  isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.examData.questions.length - 1;
  }

  // Save methods
  private saveCurrentQuestionState() {
    // Save answer if one is selected
    const selectedOption = document.querySelector('.option-item.selected');
    if (selectedOption) {
      this.examData.answers[this.currentQuestionIndex] = selectedOption.getAttribute('data-option-id');
    }
    
    // Save time spent
    this.saveCurrentQuestionTime();
  }

  
private setupAutoSave() {
  // Start with 30-second intervals
  this.autoSaveInterval = setInterval(() => {
    if (this.isDirty) {
      this.saveProgress();
    }
  }, 30000);
  
  // Listen for user interaction to mark as dirty
  document.addEventListener('click', this.markAsDirty.bind(this));
  document.addEventListener('keydown', this.markAsDirty.bind(this));
}

// Mark the exam state as dirty (needing to be saved)
private markAsDirty() {
  // Only mark as dirty if there are actual answers
  if (Object.keys(this.examData.answers).length > 0) {
    this.isDirty = true;
    
    // Implement debounced saving when user makes changes
    const now = Date.now();
    if (now - this.lastSaveAttempt > this.SAVE_DEBOUNCE_MS) {
      this.saveProgress();
      this.lastSaveAttempt = now;
    }
  }
}

  private saveCurrentQuestionTime() {
    const timeSpent = Math.floor((Date.now() - this.currentQuestionStartTime) / 1000);
    this.examData.timeSpent[this.currentQuestionIndex] = 
      (this.examData.timeSpent[this.currentQuestionIndex] || 0) + timeSpent;
    this.currentQuestionStartTime = Date.now();
  }

  private handleNetworkChange() {
    this.isOnline = navigator.onLine;
    
    if (this.isOnline) {
      // We're back online - try to process any queued saves
      this.processSaveQueue();
      
      // Clear reconnect interval if it exists
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    } else {
      // We're offline - set up a reconnect interval
      if (!this.reconnectInterval) {
        this.reconnectInterval = setInterval(() => {
          if (navigator.onLine) {
            this.handleNetworkChange();
          }
        }, 30000); // Check every 30 seconds
      }
      
      // Show offline indicator to user
      this.connectionStatusService.showOffline(
        'You are offline. Your answers will be saved when connection is restored.'
      );
    }
  }

  private async saveProgress() {
    // Save current question state
    this.saveCurrentQuestionState();
    
    // Check if there are any answers to save
    const hasAnswers = Object.keys(this.examData.answers).length > 0;
    
    // If nothing has been answered and we're just starting, don't save yet
    if (!hasAnswers && Object.keys(this.examData.timeSpent).length === 0) {
      console.log('No answers or changes to save yet');
      return;
    }
    
    // Prepare save data
    const saveData = {
      attemptId: this.examData.id,
      timestamp: Date.now(),
      data: {
        answers: { ...this.examData.answers },
        timeSpent: { ...this.examData.timeSpent },
        flagged: [...this.examData.flagged],
        currentQuestionIndex: this.currentQuestionIndex
      }
    };
    
    // If offline, queue the save
    if (!this.isOnline) {
      this.queueSave(saveData);
      this.saveStatusService.showQueued('Changes will be saved when connection is restored');
      return;
    }
  
    this.saveStatusService.showSaving('Saving your progress...');
    
    try {
      // Try to save
      const response = await this.examService.saveProgress(saveData.attemptId, saveData.data).toPromise();
      this.isDirty = false;
  
      // Only show saved message if there were actual changes
      if (response.message !== 'No changes to save') {
        this.saveStatusService.showSaved('Progress saved');
      } else {
        // Just hide the saving indicator without showing "saved"
        this.saveStatusService.hide();
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
      // Check if it's a network error or a server error
      if (!navigator.onLine) {
        // We've gone offline during the save attempt
        this.queueSave(saveData);
        this.connectionStatusService.showOffline(
          'You are offline. Your answers will be saved when connection is restored.'
        );
        this.saveStatusService.showQueued('Changes will be saved when connection is restored');
      } else {
        // Server error - queue for retry
        this.queueSave(saveData);
        this.saveStatusService.showError('Unable to save. Will retry automatically');
        
        // Retry after a delay
        setTimeout(() => {
          this.processSaveQueue();
        }, 10000);
      }
    }
  }
  

  private queueSave(saveData: any) {
    // Add to queue
    this.saveQueue.push(saveData);
    
    // Store in localStorage as backup
    try {
      localStorage.setItem(`exam_save_${this.examData.id}`, JSON.stringify({
        queue: this.saveQueue,
        lastAttempt: Date.now()
      }));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }
  
  private async processSaveQueue() {
    if (this.saveQueue.length === 0) {
      // Check localStorage for any saved queue from previous sessions
      try {
        const savedQueue = localStorage.getItem(`exam_save_${this.examData.id}`);
        if (savedQueue) {
          const queueData = JSON.parse(savedQueue);
          this.saveQueue = queueData.queue;
        }
      } catch (e) {
        console.error('Failed to retrieve from localStorage:', e);
        return;
      }
      
      if (this.saveQueue.length === 0) return;
    }
    
    // Get the most recent save from the queue
    const mostRecentSave = this.saveQueue.pop();
    this.saveQueue = []; // Clear the queue
    
    // Show saving status
    this.saveStatusService.showSaving('Saving your progress...');
    
    try {
      await this.examService.saveProgress(
        mostRecentSave.attemptId, 
        mostRecentSave.data
      ).toPromise();
      
      // Clear localStorage backup
      localStorage.removeItem(`exam_save_${this.examData.id}`);
      
      // Reset dirty flag
      this.isDirty = false;
      
      // Show success
      this.saveStatusService.showSaved('All changes saved');
      
      // Update the connection status message if it's visible
      this.connectionStatusService.showSuccess(
        'Your connection has been restored. All changes saved.',
        false,
        3000
      );
    } catch (error) {
      console.error('Failed to process save queue:', error);
      
      // Re-queue for next attempt
      this.queueSave(mostRecentSave.data);
      
      // Show error
      this.saveStatusService.showError('Unable to save progress. Will retry automatically.');
    }
  }

  // Modal methods
  showSubmitConfirmation() {
    this.saveCurrentQuestionState();
    this.isSubmitModalVisible = true;
  }

  closeSubmitConfirmation() {
    this.isSubmitModalVisible = false;
  }

  showTimeWarning(minutes: number) {
    this.timeWarningMinutes = minutes;
    this.isTimeWarningModalVisible = true;
    
    if (this.examData.proctorEnabled) {
      this.proctorService.logViolation('time_warning', { minutesRemaining: minutes });
    }
  }

  closeTimeWarningModal() {
    this.isTimeWarningModalVisible = false;
  }

  getUnansweredCount(): number {
    return this.examData.questions.length - Object.keys(this.examData.answers).length;
  }

  // Submission methods
  submitExam(autoSubmit: boolean = false) {
    clearInterval(this.timerInterval);
    this.saveCurrentQuestionState();
  
    const totalTimeSpent = this.examData.timeLimit - this.timeRemaining;
  
    const submissionData = {
      attemptId: this.examData.id,
      answers: this.examData.answers,
      timeSpentPerQuestion: this.examData.timeSpent,
      flaggedQuestions: this.examData.flagged,
      totalTimeSpent,
      autoSubmitted: autoSubmit,
      proctorEvents: this.examData.proctorEvents
    };
  
    this.examService.submitExam(submissionData).subscribe({
      next: (result) => {
        if (result?.success) {
          this.router.navigate(['/exams/results', result.attemptId]);
        } else {
          console.error('Failed to submit exam:', result?.message);
        }
      },
      error: (error) => {
        console.error('Error submitting exam:', error);
      },
      complete: () => {
        console.log('Exam submission completed.');
      }
    });
  }
  


  // Navigation and filtering
  // toggleQuestionNavigator() {
  //   this.isNavigatorVisible = !this.isNavigatorVisible;
  // }

  filterQuestions(filter: string) {
    this.currentFilter = filter;
  }



  getCategoryCount(filter: string): number {
    switch (filter) {
      case 'answered':
        return Object.keys(this.examData.answers).length;
      case 'flagged':
        return this.examData.flagged.length;
      case 'unanswered':
        return this.examData.questions.length - Object.keys(this.examData.answers).length;
      default:
        return this.examData.questions.length;
    }
  }

  getAnsweredCount(): number {
    return Object.keys(this.examData.answers).length;
  }

    // Get count of flagged questions
    getFlaggedCount(): number {
     return this.examData.flagged.length;
    }

  // Event handlers
  private handleBeforeUnload(event: BeforeUnloadEvent) {
    event.preventDefault();
    event.returnValue = 'You are in the middle of an exam. Are you sure you want to leave?';
    
    if (this.examData.proctorEnabled) {
      this.proctorService.logViolation('page_exit_attempt', {
        timestamp: new Date().toISOString()
      });
    }
    
    return event.returnValue;
  }

  private cleanupExam() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    document.removeEventListener('click', this.markAsDirty.bind(this));
    document.removeEventListener('keydown', this.markAsDirty.bind(this));
  
    window.removeEventListener('beforeunload', this.boundHandleBeforeUnload);
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.examData?.proctorEnabled) {
      this.proctorService.cleanup();
    }
  }


    /**
   * Initialize proctoring system
   */
    public async initializeProctoring(): Promise<void> {
      try {
        // Reset modal states
        this.isWebcamPermissionModalVisible = false;
        this.isProctorWarningModalVisible = false;
  
        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          }, 
          audio: false 
        });
  
        // Set up webcam stream
        if (this.proctorWebcam?.nativeElement) {
          this.proctorWebcam.nativeElement.srcObject = stream;
          await this.proctorWebcam.nativeElement.play();
          console.log('Webcam stream active, initializing proctor service');

          // Initialize proctor service
          await this.proctorService.initialize(this.examData.id, this.proctorWebcam.nativeElement);
    
          // Subscribe to proctor service events
          this.setupProctorSubscriptions();

          // Set up visibility monitoring 
          this.setupVisibilityMonitoring();
    
          // Update status
          this.updateProctorStatus('active', 'Proctoring Active');
    
          // Log initialization
          this.logProctorEvent('proctor_initialized', {
            webcamActive: true,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('Webcam element not available');
          this.updateProctorStatus('error', 'Webcam element not available');
        }

  
      } catch (error) {
        console.error('Webcam access error:', error);
        this.isWebcamPermissionModalVisible = true;
        this.updateProctorStatus('error', 'Camera Access Required');
        
        this.logProctorEvent('proctor_initialization_failed', {
          error: error,
          timestamp: new Date().toISOString()
        });
      }
    }
  
    /**
     * Set up proctor service subscriptions
     */
    private setupProctorSubscriptions(): void {
      // Subscribe to proctor status updates
      this.proctorService.status$.subscribe(status => {
        this.proctorStatusText = status.message;
        this.proctorStatusClass = `${status.status}`;
      });
  
      // Subscribe to proctor warnings
      this.proctorService.warning$.subscribe(message => {
        this.showProctorWarning(message);
      });
    }
  
    /**
     * Show proctor warning modal
     */
    private showProctorWarning(message: string): void {
      this.proctorWarningMessage = message;
      this.isProctorWarningModalVisible = true;
  
      // Log warning event
      this.logProctorEvent('warning_displayed', {
        message,
        timestamp: new Date().toISOString()
      });
    }
  
    /**
     * Close proctor warning modal
     */
    closeProctorWarning(): void {
      this.isProctorWarningModalVisible = false;
  
      // Log acknowledgment
      this.logProctorEvent('warning_acknowledged', {
        message: this.proctorWarningMessage,
        timestamp: new Date().toISOString()
      });
    }
  
    /**
     * Update proctor status
     */
    private updateProctorStatus(status: 'active' | 'warning' | 'error', message: string): void {
      this.proctorStatusText = message;
      this.proctorStatusClass = `${status}`;
    }
  
    /**
     * Log proctor event
     */
    private logProctorEvent(type: string, details: any = {}): void {
      if (this.examData.proctorEnabled) {
        this.proctorService.logViolation(type, details);
        
        // Add to local events array
        this.examData.proctorEvents.push({
          type,
          time: new Date(),
          details
        });
      }
    }
  
    /**
     * Handle visibility change
     */
    private handleVisibilityChange = (): void => {
      if (document.hidden) {
        this.logProctorEvent('tab_switch', {
          visibilityState: 'hidden',
          timestamp: new Date().toISOString()
        });
        this.showProctorWarning('Please do not switch tabs during the exam.');
      } else {
        this.logProctorEvent('tab_switch', {
          visibilityState: 'visible',
          timestamp: new Date().toISOString()
        });
      }
    }
  
    /**
     * Set up visibility monitoring
     */
    private setupVisibilityMonitoring(): void {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  
    /**
     * Clean up proctoring
     */
    private cleanupProctoring(): void {
      // Stop webcam
      const stream = this.proctorWebcam?.nativeElement?.srcObject;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track: { stop: () => any; }) => track.stop());
      }
  
      // Remove visibility listener
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  
      // Clean up proctor service
      this.proctorService.cleanup();
    }


      
  onDismissConnectionStatus() {
    this.connectionStatusService.hide();
  }


}