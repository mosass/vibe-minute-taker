/**
 * Audio-related type definitions
 */

/**
 * State of audio recording
 */
export type RecordingState = 
  | 'idle'           // Not recording
  | 'requesting'     // Requesting microphone permission
  | 'recording'      // Actively recording
  | 'paused'         // Recording paused
  | 'stopping';      // Processing stop

/**
 * Audio recording configuration
 */
export interface AudioConfig {
  sampleRate: number;        // e.g., 16000 for Whisper
  channelCount: number;      // 1 for mono
  mimeType: string;          // e.g., 'audio/webm'
}

/**
 * Default audio configuration
 */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channelCount: 1,
  mimeType: 'audio/webm;codecs=opus'
};

/**
 * Metadata for audio files stored in OPFS
 */
export interface AudioFile {
  id: string;           // UUID, matches OPFS filename
  filename: string;     // Original filename if imported
  mimeType: string;     // audio/webm, audio/wav, etc.
  size: number;         // File size in bytes
  duration: number;     // Duration in seconds
  createdAt: Date;
}

/**
 * Audio recording result
 */
export interface RecordingResult {
  blob: Blob;
  duration: number;     // Duration in seconds
  mimeType: string;
}

/**
 * Audio amplitude data for visualization
 */
export interface AudioAmplitude {
  timestamp: number;
  value: number;        // 0-1 normalized amplitude
}

/**
 * Microphone permission state
 */
export type MicrophonePermission = 
  | 'prompt'           // Not yet requested
  | 'granted'          // Permission granted
  | 'denied';          // Permission denied
