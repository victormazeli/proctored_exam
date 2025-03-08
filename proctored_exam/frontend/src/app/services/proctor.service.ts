// proctor.service.ts with face-api.js integration

import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ProctorConfig, ProctorEvent } from '../models/exam.interface';
import * as faceapi from '@vladmandic/face-api';

export interface ProctorStatus {
  status: 'active' | 'warning' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProctorService {
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectAttempts = 0;
  private queuedViolations: ProctorEvent[] = [];
  private faceDetectionInterval: any;
  private modelsLoaded = false;
  private webcamStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  
  private statusSubject = new BehaviorSubject<ProctorStatus>({
    status: 'active',
    message: 'Proctoring Active'
  });
  public status$ = this.statusSubject.asObservable();
  
  private warningSubject = new Subject<string>();
  public warning$ = this.warningSubject.asObservable();

  constructor(private socket: Socket) {}

  /**
   * Initialize proctoring for an exam attempt
   */
  async initialize(attemptId: string, examId: string): Promise<void> {
    // Load face-api models
    await this.loadFaceApiModels();
    
    // Setup socket connection
    this.setupSocketConnection(attemptId, examId);
    
    // Initialize webcam monitoring with face-api
    this.initializeWebcamMonitoring();
  }

  /**
   * Load face-api.js models
   */
  private async loadFaceApiModels(): Promise<void> {
    if (this.modelsLoaded) {
      return;
    }

    try {
      this.updateStatus('warning', 'Loading face detection models...');
      
      // Set the path to the models directory
      const modelPath = '/assets/models';
      
      // Load all the required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
      ]);
      
      console.log('Face-API models loaded successfully');
      this.modelsLoaded = true;
      this.updateStatus('active', 'Proctoring Active');
    } catch (error) {
      console.error('Error loading face-api models:', error);
      this.updateStatus('error', 'Failed to load face detection models');
    }
  }

  /**
   * Set up socket connection for proctoring
   */
  private setupSocketConnection(attemptId: string, examId: string): void {
    // Connect to proctor namespace
    this.socket.connect();

    // Socket connection events
    this.socket.on('connect', () => {
      this.updateStatus('active', 'Proctoring Active');
      this.reconnectAttempts = 0;

      // Join exam room
      this.socket.emit('join_exam', { attemptId, examId });

      // Process queued violations
      if (this.queuedViolations.length > 0) {
        this.socket.emit('proctor:violations_batch', this.queuedViolations);
        this.queuedViolations = [];
      }
    });

    this.socket.on('joined_exam', (response: { success: boolean, message?: string }) => {
      if (!response.success) {
        console.error('Failed to join exam room:', response.message);
        this.updateStatus('error', 'Failed to join exam room');
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Proctor socket connection error:', error);
      this.updateStatus('error', 'Connection Error');
    });

    this.socket.on('disconnect', (reason: string) => {
      this.updateStatus('warning', 'Reconnecting...');
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.reconnectAttempts = attemptNumber;
      this.updateStatus('warning', `Reconnecting (${attemptNumber}/${this.MAX_RECONNECT_ATTEMPTS})...`);
    });

    this.socket.on('reconnect_failed', () => {
      this.updateStatus('error', 'Connection Failed');
      this.warningSubject.next('Proctor connection lost. Your exam session may be reviewed.');
    });

    this.socket.on('proctor_warning', (data: { message: string }) => {
      this.warningSubject.next(data.message);
    });

    // Handle monitoring configuration updates
    this.socket.on('monitoring_requested', () => {
      this.updateMonitoringConfig({ captureInterval: 2000 });
    });
  }

  /**
   * Initialize webcam monitoring with face-api.js
   */
  private async initializeWebcamMonitoring(): Promise<void> {
    // Get webcam video element reference
    this.videoEl = document.querySelector('#proctorWebcam') as HTMLVideoElement;
    
    if (!this.videoEl) {
      console.error('Webcam video element not found');
      this.updateStatus('error', 'Webcam element not found');
      return;
    }
    
    // Ensure we have the webcam stream
    if (!this.videoEl.srcObject) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
        
        this.webcamStream = stream;
        this.videoEl.srcObject = stream;
        await this.videoEl.play();
      } catch (error) {
        console.error('Error accessing webcam:', error);
        this.updateStatus('error', 'Webcam access error');
        this.logViolation('webcam_access_error', { error: String(error) });
        return;
      }
    } else {
      this.webcamStream = this.videoEl.srcObject as MediaStream;
    }
    
    // Setup face detection interval
    this.faceDetectionInterval = setInterval(async () => {
      if (this.videoEl && this.modelsLoaded) {
        const detectionResult = await this.detectFace();
        
        if (this.socket.connected) {
          this.socket.emit('proctor:process_frame', detectionResult);
        }
        
        // Handle detection results for violations
        this.handleDetectionResults(detectionResult);
      }
    }, 3000); // Check every 3 seconds
  }
  
  /**
   * Detect face in webcam feed using face-api.js
   */
  private async detectFace(): Promise<any> {
    if (!this.videoEl || !this.modelsLoaded) {
      return this.createErrorResult('Face detection not ready');
    }
    
    try {
      // Check if video is ready and playing
      if (this.videoEl.paused || this.videoEl.ended || !this.videoEl.videoWidth) {
        return this.createErrorResult('Video stream not active');
      }
      
      // Configure face detection options
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5
      });
      
      // Detect all faces with landmarks and expressions
      const detections = await faceapi.detectAllFaces(this.videoEl, options)
        .withFaceLandmarks()
        .withFaceExpressions();
      
      // Process and analyze detection results
      return this.processDetectionResults(detections);
      
    } catch (error) {
      console.error('Face detection error:', error);
      return this.createErrorResult('Face detection error');
    }
  }
  
  /**
   * Process face detection results
   */
  private processDetectionResults(detections: any[]): any {
    // No faces detected
    if (detections.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        faceDetection: {
          facesDetected: 0,
          confidence: 0
        },
        attentionTracking: {
          isAttentive: false,
          gazeDirection: 'outside',
          confidence: 0.9
        }
      };
    }
    
    // Multiple faces detected
    if (detections.length > 1) {
      return {
        timestamp: new Date().toISOString(),
        faceDetection: {
          facesDetected: detections.length,
          confidence: Math.max(...detections.map(d => d.detection.score))
        },
        attentionTracking: {
          isAttentive: false,
          gazeDirection: 'multiple_faces',
          confidence: 0.95
        },
        expressions: this.getAverageExpressions(detections)
      };
    }
    
    // Single face detected - analyze it
    const detection = detections[0];
    const landmarks = detection.landmarks;
    const expressions = detection.expressions;
    
    // Analyze gaze direction using eye landmarks
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const gazeInfo = this.analyzeGazeDirection(leftEye, rightEye);
    
    // Create and return final analysis result
    return {
      timestamp: new Date().toISOString(),
      faceDetection: {
        facesDetected: 1,
        confidence: detection.detection.score
      },
      attentionTracking: {
        isAttentive: gazeInfo.isAttentive,
        gazeDirection: gazeInfo.direction,
        confidence: gazeInfo.confidence
      },
      expressions: this.formatExpressions(expressions),
      faceLandmarks: {
        eyeDistance: this.calculateEyeDistance(leftEye, rightEye),
        faceAngle: this.estimateFaceAngle(landmarks)
      }
    };
  }
  
  /**
   * Create error result for face detection failures
   */
  private createErrorResult(message: string): any {
    return {
      timestamp: new Date().toISOString(),
      error: message,
      faceDetection: {
        facesDetected: 0,
        confidence: 0
      },
      attentionTracking: {
        isAttentive: false,
        gazeDirection: 'unknown',
        confidence: 0
      }
    };
  }
  
  /**
   * Format expressions data
   */
  private formatExpressions(expressions: any): any {
    // Round expression values and find dominant expression
    const formattedExpressions: Record<string, number> = {};
    let dominantExpression = 'neutral';
    let highestScore = 0;
    
    for (const [expression, score] of Object.entries(expressions)) {
      const roundedScore = Math.round((score as number) * 100) / 100;
      formattedExpressions[expression] = roundedScore;
      
      if (roundedScore > highestScore) {
        highestScore = roundedScore;
        dominantExpression = expression;
      }
    }
    
    return {
      values: formattedExpressions,
      dominant: dominantExpression,
      dominantScore: highestScore
    };
  }
  
  /**
   * Get average expressions from multiple detected faces
   */
  private getAverageExpressions(detections: any[]): any {
    const avgExpressions: Record<string, number> = {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0
    };
    
    // Sum up all expressions
    for (const detection of detections) {
      for (const [expression, score] of Object.entries(detection.expressions)) {
        avgExpressions[expression] += score as number;
      }
    }
    
    // Calculate averages
    for (const expression in avgExpressions) {
      avgExpressions[expression] /= detections.length;
      avgExpressions[expression] = Math.round(avgExpressions[expression] * 100) / 100;
    }
    
    // Find dominant expression
    let dominantExpression = 'neutral';
    let highestScore = 0;
    
    for (const [expression, score] of Object.entries(avgExpressions)) {
      if (score > highestScore) {
        highestScore = score;
        dominantExpression = expression;
      }
    }
    
    return {
      values: avgExpressions,
      dominant: dominantExpression,
      dominantScore: highestScore
    };
  }
  
  /**
   * Analyze gaze direction from eye landmarks
   */
  private analyzeGazeDirection(leftEye: faceapi.Point[], rightEye: faceapi.Point[]): {
    direction: string;
    isAttentive: boolean;
    confidence: number;
  } {
    try {
      // Calculate eye aspect ratios
      const leftEAR = this.getEyeAspectRatio(leftEye);
      const rightEAR = this.getEyeAspectRatio(rightEye);
      
      // Calculate eye centers
      const leftCenter = this.getCenter(leftEye);
      const rightCenter = this.getCenter(rightEye);
      
      // Calculate horizontal gaze ratio
      const horizontalRatio = leftCenter.x / rightCenter.x;
      
      // Determine gaze direction
      let direction = 'center';
      let isAttentive = true;
      let confidence = 0.9;
      
      // Check for closed eyes (looking down)
      if (leftEAR < 0.17 && rightEAR < 0.17) {
        direction = 'down';
        isAttentive = false;
        confidence = 0.8;
      }
      // Check for wide open eyes (surprise or looking up)
      else if (leftEAR > 0.35 && rightEAR > 0.35) {
        direction = 'up';
        isAttentive = false;
        confidence = 0.7;
      }
      // Check for left/right gaze
      else if (horizontalRatio < 0.82) {
        direction = 'right';
        isAttentive = false;
        confidence = 0.75;
      }
      else if (horizontalRatio > 1.18) {
        direction = 'left';
        isAttentive = false;
        confidence = 0.75;
      }
      
      return { direction, isAttentive, confidence };
    } catch (error) {
      console.error('Error in gaze analysis:', error);
      return { direction: 'unknown', isAttentive: true, confidence: 0.5 };
    }
  }
  
  /**
   * Calculate Eye Aspect Ratio (EAR)
   * Used to determine eye openness
   */
  private getEyeAspectRatio(eye: faceapi.Point[]): number {
    try {
      // Need at least 6 points for a valid EAR
      if (eye.length < 6) return 0.25;
      
      // Calculate vertical distances
      const a = this.getDistance(eye[1], eye[5]);
      const b = this.getDistance(eye[2], eye[4]);
      
      // Calculate horizontal distance
      const c = this.getDistance(eye[0], eye[3]);
      
      // Calculate EAR
      return (a + b) / (2.0 * c);
    } catch (error) {
      return 0.25; // Default value
    }
  }
  
  /**
   * Calculate distance between two points
   */
  private getDistance(a: faceapi.Point, b: faceapi.Point): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }
  
  /**
   * Calculate center point of a group of points
   */
  private getCenter(points: faceapi.Point[]): {x: number, y: number} {
    let sumX = 0;
    let sumY = 0;
    
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
    }
    
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }
  
  /**
   * Calculate eye distance for baseline position
   */

  private calculateEyeDistance(leftEye: faceapi.Point[], rightEye: faceapi.Point[]): number {
    const leftCenter = this.getCenter(leftEye);
    const rightCenter = this.getCenter(rightEye);
    
    // Create actual Point objects
    const leftPoint = new faceapi.Point(leftCenter.x, leftCenter.y);
    const rightPoint = new faceapi.Point(rightCenter.x, rightCenter.y);
    
    return this.getDistance(leftPoint, rightPoint);
  }
  
  /**
   * Estimate face angle using landmarks
   */
  private estimateFaceAngle(landmarks: any): number {
    try {
      // Get jaw points
      const jaw = landmarks.getJawOutline();
      
      // Calculate angle of face using jaw points
      const left = jaw[0];
      const right = jaw[16]; // Last point of jaw outline
      
      // Calculate angle in degrees
      const angleRad = Math.atan2(right.y - left.y, right.x - left.x);
      return Math.round(angleRad * (180 / Math.PI));
    } catch (error) {
      return 0; // Default value for straight face
    }
  }
  
  /**
   * Handle face detection results for violations
   */
  private handleDetectionResults(result: any): void {
    // Check for no face detected
    if (result.faceDetection.facesDetected === 0) {
      this.logViolation('no_face_detected', {
        timestamp: new Date().toISOString()
      });
      // Only show warning if still no face after 5 seconds
      setTimeout(() => {
        if (this.socket.connected) {
          this.warningSubject.next('Your face is not visible. Please position yourself in front of the camera.');
        }
      }, 5000);
    }
    
    // Check for multiple faces
    else if (result.faceDetection.facesDetected > 1) {
      this.logViolation('multiple_faces', {
        faceCount: result.faceDetection.facesDetected,
        timestamp: new Date().toISOString()
      });
      this.warningSubject.next('Multiple faces detected. Please ensure you are the only person visible.');
    }
    
    // Check attention tracking
    else if (result.attentionTracking && !result.attentionTracking.isAttentive) {
      // Only log high-confidence gaze violations
      if (result.attentionTracking.confidence > 0.7) {
        this.logViolation('gaze_violation', {
          direction: result.attentionTracking.gazeDirection,
          confidence: result.attentionTracking.confidence,
          timestamp: new Date().toISOString()
        });
        
        // Only show warning for sustained looking away
        if (result.attentionTracking.confidence > 0.8) {
          this.warningSubject.next('Please focus on your exam. Looking away may be flagged.');
        }
      }
    }
    
    // Check suspicious expressions
    if (result.expressions && result.expressions.dominant) {
      // Check for talking or suspicious expressions
      if (
        (result.expressions.dominant === 'surprised' && result.expressions.dominantScore > 0.7) ||
        (result.expressions.dominant === 'angry' && result.expressions.dominantScore > 0.6)
      ) {
        this.logViolation('suspicious_expression', {
          expression: result.expressions.dominant,
          score: result.expressions.dominantScore,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Log a proctoring violation
   */
  logViolation(type: string, details: any = {}): void {
    const violation: ProctorEvent = {
      type,
      time: new Date(),
      details: {
        ...details,
        timestamp: new Date().toISOString()
      }
    };

    if (this.socket.connected) {
      this.socket.emit('proctor:violation', violation);
    } else {
      this.queuedViolations.push(violation);
    }
  }

  /**
   * Update proctor status
   */
  private updateStatus(status: 'active' | 'warning' | 'error', message: string): void {
    this.statusSubject.next({ status, message });
  }

  /**
   * Update monitoring configuration
   */
  private updateMonitoringConfig(config: Partial<ProctorConfig>): void {
    // Implementation would update monitoring parameters
    console.log('Updating monitoring config:', config);
    
    // If interval is specified, update face detection interval
    if (config.captureInterval && this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      
      this.faceDetectionInterval = setInterval(async () => {
        if (this.videoEl && this.modelsLoaded) {
          const detectionResult = await this.detectFace();
          
          if (this.socket.connected) {
            this.socket.emit('proctor:process_frame', detectionResult);
          }
          
          this.handleDetectionResults(detectionResult);
        }
      }, config.captureInterval);
    }
  }

  /**
   * Clean up proctoring
   */
  cleanup(): void {
    // Clear face detection interval
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
    }
    
    // Release webcam if we got it
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
    }
    
    // Disconnect socket
    this.socket.disconnect();
  }

  /**
   * Simulate frame analysis (fallback method when face-api fails)
   */
  private simulateFrameAnalysis() {
    const randomValue = Math.random();
    
    return {
      timestamp: new Date().toISOString(),
      faceDetection: {
        facesDetected: randomValue < 0.1 ? 0 : randomValue > 0.98 ? 2 : 1,
        confidence: 0.95
      },
      attentionTracking: {
        isAttentive: randomValue > 0.15,
        gazeDirection: randomValue > 0.15 ? 'center' : 'outside',
        confidence: 0.8
      }
    };
  }
}