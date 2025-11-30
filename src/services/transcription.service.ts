/**
 * Transcription Service
 * Orchestrates audio transcription using the Whisper model via Web Worker
 * Handles audio format conversion and transcription result processing
 */

import { AUDIO_CONFIG, MODEL_CONFIG } from '@/utils/constants';
import { getTranscriptionWorker } from '@/composables/useModelManager';
import type {
  TranscriptionResult,
  TranscriptionWorkerMessage,
  TranscriptionWorkerResponse,
  DownloadProgress,
  TranscriptionOptions,
} from '@/types/transcription';

/**
 * Transcription progress callback
 */
export type TranscriptionProgressCallback = (progress: {
  stage: 'converting' | 'transcribing';
  message: string;
  progress?: number;
}) => void;

/**
 * Transcription result callback
 */
export type TranscriptionResultCallback = (result: TranscriptionResult) => void;

/**
 * Transcription error callback
 */
export type TranscriptionErrorCallback = (error: Error) => void;

/**
 * Transcription service state
 */
interface TranscriptionState {
  isTranscribing: boolean;
  currentAbortController: AbortController | null;
}

// Service state
const state: TranscriptionState = {
  isTranscribing: false,
  currentAbortController: null,
};

/**
 * Check if transcription is currently in progress
 */
export function isTranscribing(): boolean {
  return state.isTranscribing;
}

/**
 * Convert audio blob to Float32Array for Whisper
 * Whisper expects 16kHz mono PCM audio
 */
export async function convertAudioToFloat32(
  audioBlob: Blob,
  targetSampleRate: number = AUDIO_CONFIG.SAMPLE_RATE
): Promise<{ audioData: Float32Array; sampleRate: number; duration: number }> {
  // Create an AudioContext with the target sample rate
  const audioContext = new AudioContext({ sampleRate: targetSampleRate });

  try {
    // Convert blob to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get mono channel (use first channel if stereo)
    const channelData = audioBuffer.getChannelData(0);

    // If the audio context sample rate differs from target, we need to resample
    // Note: Most browsers now support creating AudioContext with specific sample rate
    // so this should typically match
    let processedData: Float32Array;
    
    if (audioBuffer.sampleRate !== targetSampleRate) {
      // Resample using linear interpolation
      processedData = resampleAudio(channelData, audioBuffer.sampleRate, targetSampleRate);
    } else {
      // Copy the channel data
      processedData = new Float32Array(channelData);
    }

    return {
      audioData: processedData,
      sampleRate: targetSampleRate,
      duration: audioBuffer.duration,
    };
  } finally {
    await audioContext.close();
  }
}

/**
 * Simple linear interpolation resampling
 */
function resampleAudio(
  audioData: Float32Array,
  fromSampleRate: number,
  toSampleRate: number
): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return new Float32Array(audioData);
  }

  const ratio = fromSampleRate / toSampleRate;
  const newLength = Math.floor(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation with bounds checking
    const floorVal = audioData[srcIndexFloor] ?? 0;
    const ceilVal = audioData[srcIndexCeil] ?? 0;
    result[i] = floorVal * (1 - fraction) + ceilVal * fraction;
  }

  return result;
}

/**
 * Transcribe audio blob using the Whisper model
 */
export async function transcribeAudio(
  audioBlob: Blob,
  _options: Partial<TranscriptionOptions> = {},
  onProgress?: TranscriptionProgressCallback
): Promise<TranscriptionResult> {
  if (state.isTranscribing) {
    throw new Error('Transcription already in progress');
  }

  state.isTranscribing = true;
  state.currentAbortController = new AbortController();

  try {
    // Report conversion progress
    onProgress?.({
      stage: 'converting',
      message: 'Converting audio format...',
      progress: 0,
    });

    // Convert audio to Float32Array
    const { audioData, sampleRate, duration } = await convertAudioToFloat32(audioBlob);

    onProgress?.({
      stage: 'converting',
      message: 'Audio converted successfully',
      progress: 100,
    });

    // Report transcription starting
    onProgress?.({
      stage: 'transcribing',
      message: 'Starting transcription...',
      progress: 0,
    });

    // Get the worker
    const worker = getTranscriptionWorker();

    // Send transcription request and wait for result
    return new Promise<TranscriptionResult>((resolve, reject) => {
      const handleMessage = (event: MessageEvent<TranscriptionWorkerResponse>) => {
        switch (event.data.type) {
          case 'progress':
            onProgress?.({
              stage: 'transcribing',
              message: event.data.progress.status,
              progress: event.data.progress.percentage,
            });
            break;

          case 'partial':
            // For streaming mode - emit partial results
            // Currently handled in the composable
            break;

          case 'result':
            worker.removeEventListener('message', handleMessage);
            state.isTranscribing = false;
            state.currentAbortController = null;
            
            // Add duration if not provided by worker
            const result = {
              ...event.data.result,
              duration: event.data.result.duration ?? duration,
            };
            
            resolve(result);
            break;

          case 'error':
            worker.removeEventListener('message', handleMessage);
            state.isTranscribing = false;
            state.currentAbortController = null;
            reject(new Error(event.data.error));
            break;
        }
      };

      // Handle abort
      if (state.currentAbortController) {
        state.currentAbortController.signal.addEventListener('abort', () => {
          worker.removeEventListener('message', handleMessage);
          worker.postMessage({ type: 'abort' } as TranscriptionWorkerMessage);
          state.isTranscribing = false;
          reject(new Error('Transcription aborted'));
        });
      }

      worker.addEventListener('message', handleMessage);

      // Send transcription request
      const message: TranscriptionWorkerMessage = {
        type: 'transcribe',
        audioData,
        sampleRate,
      };
      worker.postMessage(message);
    });
  } catch (error) {
    state.isTranscribing = false;
    state.currentAbortController = null;
    throw error;
  }
}

/**
 * Abort current transcription
 */
export function abortTranscription(): void {
  if (state.currentAbortController) {
    state.currentAbortController.abort();
  }
}

/**
 * Initialize the transcription model
 * This should be called before transcription to ensure the model is loaded
 */
export async function initializeTranscriptionModel(
  modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  const worker = getTranscriptionWorker();

  return new Promise<void>((resolve, reject) => {
    const handleMessage = (event: MessageEvent<TranscriptionWorkerResponse>) => {
      switch (event.data.type) {
        case 'progress':
          onProgress?.(event.data.progress);
          break;

        case 'ready':
          worker.removeEventListener('message', handleMessage);
          resolve();
          break;

        case 'error':
          worker.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
          break;
      }
    };

    worker.addEventListener('message', handleMessage);

    // Send init message
    const message: TranscriptionWorkerMessage = {
      type: 'init',
      modelId,
    };
    worker.postMessage(message);
  });
}

/**
 * Check if transcription is supported in this browser
 */
export function isTranscriptionSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    'decodeAudioData' in AudioContext.prototype
  );
}

/**
 * Get estimated transcription time based on audio duration
 * Rough estimate: Whisper Tiny processes at about 5x real-time on average hardware
 */
export function estimateTranscriptionTime(audioDurationSeconds: number): number {
  // Whisper Tiny: approximately 5x real-time (12 seconds for 1 minute of audio)
  // Add buffer for conversion and overhead
  const processingRatio = 0.2; // 5x real-time = 0.2
  const overhead = 2; // 2 seconds overhead
  
  return Math.ceil(audioDurationSeconds * processingRatio + overhead);
}

/**
 * Validate audio blob before transcription
 */
export function validateAudioBlob(blob: Blob): { valid: boolean; error?: string } {
  if (!blob || blob.size === 0) {
    return { valid: false, error: 'Audio is empty' };
  }

  // Check for minimum size (at least 1KB)
  if (blob.size < 1024) {
    return { valid: false, error: 'Audio is too short' };
  }

  // Check for maximum size (500MB limit)
  const maxSize = 500 * 1024 * 1024;
  if (blob.size > maxSize) {
    return { valid: false, error: 'Audio file is too large (max 500MB)' };
  }

  // Check MIME type if available
  const validTypes = [
    'audio/webm',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/flac',
    'audio/x-m4a',
  ];

  if (blob.type && !validTypes.some(t => blob.type.startsWith(t.split('/')[0]!))) {
    // Still allow if type is empty (browser may not set it)
    if (blob.type !== '') {
      return { valid: false, error: `Unsupported audio format: ${blob.type}` };
    }
  }

  return { valid: true };
}

/**
 * Create a formatted transcript from segments
 */
export function formatTranscript(
  segments: TranscriptionResult['segments'],
  options: { includeTimestamps?: boolean; separator?: string } = {}
): string {
  const { includeTimestamps = false, separator = '\n' } = options;

  if (!segments || segments.length === 0) {
    return '';
  }

  return segments
    .map(segment => {
      if (includeTimestamps) {
        const startTime = formatTimestamp(segment.start);
        const endTime = formatTimestamp(segment.end);
        return `[${startTime} - ${endTime}] ${segment.text}`;
      }
      return segment.text;
    })
    .join(separator);
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
