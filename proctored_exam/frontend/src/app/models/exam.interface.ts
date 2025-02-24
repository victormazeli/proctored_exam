// exam.interfaces.ts

export interface Question {
    id: string;
    text: string;
    options: Option[];
    domain: string;
  }
  
  export interface Option {
    id: string;
    text: string;
  }
  
  export interface ExamData {
    id: string;
    timeLimit: number;
    questions: Question[];
    proctorEnabled: boolean;
    answers: Record<string, any>;
    timeSpent: Record<string, number>;
    flagged: number[];
    currentQuestionIndex: number;
    startTime: number;
    endTime: number | null;
    proctorEvents: ProctorEvent[];
    metadata: ExamDataMetadata
  }

  export interface ExamDataMetadata {
    examName: string,
    certificationName: string,
    totalQuestions: number,
    allowReview: boolean,
    randomizeQuestions: boolean
  }
  
  export interface ProctorEvent {
    type: string;
    time: Date;
    details: any;
  }
  
  export interface ExamSubmission {
    attemptId: string;
    answers: Record<string, any>;
    timeSpentPerQuestion: Record<string, number>;
    flaggedQuestions: number[];
    totalTimeSpent: number;
    autoSubmitted: boolean;
    proctorEvents?: ProctorEvent[];
  }
  
  export interface ExamResult {
    success: boolean;
    attemptId?: string;
    message?: string;
  }
  
  export interface ProctorConfig {
    captureInterval: number;
    faceDetectionEnabled: boolean;
    attentionTrackingEnabled: boolean;
    snapshotsEnabled: boolean;
    violationThresholds: {
      faceNotVisible: number;
      multiplesFaces: number;
      attentionLoss: number;
    };
  }

