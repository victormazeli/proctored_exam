import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Socket } from 'ngx-socket-io';
// import { ExamService } from '../../../services/exam.service';
// import { ProctorService } from '../../../services/proctor.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ExamData } from 'src/app/models/exam.interface';
import { MockExamService } from 'src/app/services/mock-exam.service';
import { MockProctorService } from 'src/app/services/mock-proctor.service';



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

  filters = [
    { label: 'All', value: 'all' },
    { label: 'Answered', value: 'answered' },
    { label: 'Flagged', value: 'flagged' },
    { label: 'Unanswered', value: 'unanswered' }
  ];

   // Bound event handler
  private boundHandleBeforeUnload: (event: BeforeUnloadEvent) => void;

  constructor(
    private examService: MockExamService,
    private proctorService: MockProctorService,
    private router: Router,
    private route: ActivatedRoute,
    private socket: Socket
  ) {
        // Bind the event handler in constructor
        this.boundHandleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.initializeExam(params['examId']);
    });
    window.addEventListener('beforeunload', this.boundHandleBeforeUnload);
  }

  ngOnDestroy() {
    this.cleanupExam();
    this.cleanupProctoring();
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
  
        // Set up auto-save interval
        setInterval(() => this.saveProgress(), 30000);
      },
      error: (error) => {
        console.error('Failed to initialize exam:', error);
        // Handle error (show error message, redirect, etc.)
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

  // loadQuestion(index: number) {
  //   if (index < 0 || index >= this.examData.questions.length) {
  //     console.error('Invalid question index:', index);
  //     return;
  //   }
    
  //   this.examData.currentQuestionIndex = index;
  //   this.currentQuestion = this.examData.questions[index];
    
  //   // Start tracking time for this question
  //   this.examData.timeSpent[index] = this.examData.timeSpent[index] || 0;
  //   this.currentQuestionStartTime = Date.now();
  // }

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

  private saveCurrentQuestionTime() {
    const timeSpent = Math.floor((Date.now() - this.currentQuestionStartTime) / 1000);
    this.examData.timeSpent[this.currentQuestionIndex] = 
      (this.examData.timeSpent[this.currentQuestionIndex] || 0) + timeSpent;
    this.currentQuestionStartTime = Date.now();
  }

  private async saveProgress() {
    this.saveCurrentQuestionState();
    try {
      await this.examService.saveProgress(this.examData.id, {
        answers: this.examData.answers,
        timeSpent: this.examData.timeSpent,
        flagged: this.examData.flagged
      }).toPromise();
    } catch (error) {
      console.error('Failed to save progress:', error);
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
        }
  
        // Initialize proctor service
        this.proctorService.initialize(this.examData.id, this.examData.id);
  
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
        this.proctorStatusClass = `status-${status.status}`;
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
      this.proctorStatusClass = `status-${status}`;
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


}