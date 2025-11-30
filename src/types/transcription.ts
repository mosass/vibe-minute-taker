/**
 * Transcription-related type definitions
 */

/**
 * Status of AI model
 */
export type ModelStatus = 
  | 'not_downloaded'   // Model not present
  | 'downloading'      // Download in progress
  | 'ready'            // Model ready for use
  | 'loading'          // Loading model into memory
  | 'error';           // Error occurred

/**
 * Metadata for cached AI model
 */
export interface AIModel {
  id: string;           // Model identifier (e.g., 'whisper-tiny')
  version: string;      // Model version
  size: number;         // Total size in bytes
  downloadedAt: Date;
  lastUsedAt: Date;
  status: ModelStatus;
}

/**
 * Download progress information
 */
export interface DownloadProgress {
  loaded: number;       // Bytes downloaded
  total: number;        // Total bytes
  percentage: number;   // 0-100
  status: string;       // Current status message
}

/**
 * Transcription result from Whisper model
 */
export interface TranscriptionResult {
  text: string;                    // Full transcript text
  segments: TranscriptionSegment[];
  language?: string;               // Detected language
  duration?: number;               // Audio duration in seconds
}

/**
 * Individual transcription segment with timing
 */
export interface TranscriptionSegment {
  id: string;
  start: number;        // Start time in seconds
  end: number;          // End time in seconds
  text: string;         // Segment text
  confidence?: number;  // Confidence score 0-1
}

/**
 * Message types for transcription worker
 */
export type TranscriptionWorkerMessage = 
  | { type: 'init'; modelId: string }
  | { type: 'transcribe'; audioData: Float32Array; sampleRate: number }
  | { type: 'stream-start' }
  | { type: 'stream-chunk'; audioData: Float32Array; sampleRate: number; chunkIndex: number }
  | { type: 'stream-end' }
  | { type: 'abort' };

/**
 * Response types from transcription worker
 */
export type TranscriptionWorkerResponse =
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'ready' }
  | { type: 'partial'; text: string; segments?: TranscriptionSegment[] }
  | { type: 'stream-ready' }
  | { type: 'result'; result: TranscriptionResult }
  | { type: 'error'; error: string };

/**
 * Transcription mode
 */
export type TranscriptionMode = 
  | 'batch'            // Process entire audio at once
  | 'streaming';       // Real-time partial results

/**
 * Transcription options
 */
export interface TranscriptionOptions {
  mode: TranscriptionMode;
  language?: string;   // Force specific language, or auto-detect
}
