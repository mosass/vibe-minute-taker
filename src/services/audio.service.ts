/**
 * Audio Recording Service
 * Handles audio recording using MediaRecorder API
 * Provides start/stop/pause/resume controls with chunk collection
 */

import { AUDIO_CONFIG } from '@/utils/constants';
import type { RecordingResult, AudioAmplitude } from '@/types/audio';

/**
 * Audio recording service event callbacks
 */
export interface AudioServiceCallbacks {
  onDataAvailable?: (chunk: Blob) => void;
  onAmplitude?: (amplitude: AudioAmplitude) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: RecordingServiceState) => void;
}

/**
 * Internal state of the audio service
 */
export type RecordingServiceState = 
  | 'inactive'
  | 'recording'
  | 'paused';

/**
 * Audio recording service class
 * Manages MediaRecorder lifecycle and audio stream
 */
export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private pauseStartTime: number = 0;
  private animationFrameId: number | null = null;
  private callbacks: AudioServiceCallbacks = {};

  /**
   * Get the supported MIME type for recording
   */
  static getSupportedMimeType(): string {
    const types = [
      AUDIO_CONFIG.MIME_TYPE,
      AUDIO_CONFIG.FALLBACK_MIME_TYPE,
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Return default - browser will use its default
    return '';
  }

  /**
   * Check if audio recording is supported
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'mediaDevices' in navigator &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Request microphone permission and check availability
   */
  static async checkMicrophonePermission(): Promise<PermissionState> {
    try {
      // Check if Permissions API is available
      if ('permissions' in navigator && navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state;
      }
      // Fallback: try to get stream to check permission
      if (navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        return 'granted';
      }
      return 'prompt';
    } catch (error) {
      if ((error as Error).name === 'NotAllowedError') {
        return 'denied';
      }
      return 'prompt';
    }
  }

  /**
   * Get current recording state
   */
  get state(): RecordingServiceState {
    if (!this.mediaRecorder) return 'inactive';
    if (this.mediaRecorder.state === 'recording') return 'recording';
    if (this.mediaRecorder.state === 'paused') return 'paused';
    return 'inactive';
  }

  /**
   * Get elapsed recording time in milliseconds (excluding paused time)
   */
  get elapsedTime(): number {
    if (!this.startTime) return 0;
    
    const now = this.state === 'paused' ? this.pauseStartTime : Date.now();
    return now - this.startTime - this.pausedDuration;
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: AudioServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Start audio recording
   * Requests microphone access and begins recording
   */
  async start(): Promise<void> {
    if (this.state !== 'inactive') {
      throw new Error('Recording is already in progress');
    }

    try {
      // Request microphone access with constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: AUDIO_CONFIG.CHANNEL_COUNT,
          sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up audio analysis for visualization
      this.setupAudioAnalysis();

      // Create MediaRecorder with supported MIME type
      const mimeType = AudioRecordingService.getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      this.chunks = [];
      this.pausedDuration = 0;

      // Handle data chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          this.callbacks.onDataAvailable?.(event.data);
        }
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        const error = new Error('Recording error: ' + (event as ErrorEvent).message);
        this.callbacks.onError?.(error);
      };

      // Handle state changes
      this.mediaRecorder.onstart = () => {
        this.callbacks.onStateChange?.('recording');
      };

      this.mediaRecorder.onpause = () => {
        this.callbacks.onStateChange?.('paused');
      };

      this.mediaRecorder.onresume = () => {
        this.callbacks.onStateChange?.('recording');
      };

      this.mediaRecorder.onstop = () => {
        this.callbacks.onStateChange?.('inactive');
      };

      // Start recording - request data every second
      this.startTime = Date.now();
      this.mediaRecorder.start(1000);

      // Start amplitude visualization
      this.startAmplitudeTracking();

    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (this.state !== 'recording' || !this.mediaRecorder) {
      throw new Error('Cannot pause: not currently recording');
    }

    this.pauseStartTime = Date.now();
    this.mediaRecorder.pause();
    this.stopAmplitudeTracking();
  }

  /**
   * Resume recording after pause
   */
  resume(): void {
    if (this.state !== 'paused' || !this.mediaRecorder) {
      throw new Error('Cannot resume: not currently paused');
    }

    this.pausedDuration += Date.now() - this.pauseStartTime;
    this.mediaRecorder.resume();
    this.startAmplitudeTracking();
  }

  /**
   * Stop recording and return the result
   */
  async stop(): Promise<RecordingResult> {
    if (this.state === 'inactive' || !this.mediaRecorder) {
      throw new Error('Cannot stop: not currently recording');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not available'));
        return;
      }

      const handleStop = () => {
        try {
          // Calculate duration
          const duration = this.elapsedTime / 1000; // Convert to seconds

          // Create blob from chunks
          const mimeType = this.mediaRecorder?.mimeType || AUDIO_CONFIG.MIME_TYPE;
          const blob = new Blob(this.chunks, { type: mimeType });

          // Cleanup
          this.cleanup();

          resolve({
            blob,
            duration,
            mimeType
          });
        } catch (error) {
          reject(error);
        }
      };

      // Request any pending data and stop
      this.mediaRecorder.onstop = handleStop;
      this.mediaRecorder.requestData();
      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording without saving
   */
  cancel(): void {
    this.cleanup();
  }

  /**
   * Set up Web Audio API for amplitude analysis
   */
  private setupAudioAnalysis(): void {
    if (!this.mediaStream) return;

    try {
      this.audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.SAMPLE_RATE });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      source.connect(this.analyser);
    } catch (error) {
      console.warn('Failed to set up audio analysis:', error);
    }
  }

  /**
   * Start tracking audio amplitude for visualization
   */
  private startAmplitudeTracking(): void {
    if (!this.analyser || !this.callbacks.onAmplitude) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const track = () => {
      if (this.state !== 'recording' || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS amplitude (normalized 0-1)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i] ?? 0;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / dataArray.length) / 255;

      this.callbacks.onAmplitude?.({
        timestamp: Date.now(),
        value: rms
      });

      this.animationFrameId = requestAnimationFrame(track);
    };

    track();
  }

  /**
   * Stop amplitude tracking
   */
  private stopAmplitudeTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    this.stopAmplitudeTracking();

    // Stop media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.warn);
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.startTime = 0;
    this.pausedDuration = 0;
    this.pauseStartTime = 0;
  }
}

/**
 * Singleton instance for easy access
 */
let audioServiceInstance: AudioRecordingService | null = null;

/**
 * Get the audio recording service instance
 */
export function getAudioService(): AudioRecordingService {
  if (!audioServiceInstance) {
    audioServiceInstance = new AudioRecordingService();
  }
  return audioServiceInstance;
}

/**
 * Create a new audio recording service instance
 * Useful for isolated recordings
 */
export function createAudioService(): AudioRecordingService {
  return new AudioRecordingService();
}
