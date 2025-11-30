/**
 * Transcription Web Worker
 * Runs Whisper speech-to-text model from Transformers.js in a background thread
 * Handles model initialization, transcription, and progress reporting
 */

import { pipeline } from '@huggingface/transformers';
import type {
  TranscriptionWorkerMessage,
  TranscriptionWorkerResponse,
  TranscriptionResult,
  TranscriptionSegment,
  DownloadProgress,
} from '@/types/transcription';

// Pipeline interface - using explicit type to avoid complex union type issues with Transformers.js
interface TranscriberPipeline {
  (audio: Float32Array, options?: Record<string, unknown>): Promise<unknown>;
  dispose?: () => Promise<void>;
}

// Global pipeline instance
let transcriber: TranscriberPipeline | null = null;
let currentModelId: string | null = null;
let isInitializing = false;

/**
 * Send a message back to the main thread
 */
function postResponse(response: TranscriptionWorkerResponse): void {
  self.postMessage(response);
}

/**
 * Progress callback for model download
 */
function handleProgress(progress: { status: string; file?: string; loaded?: number; total?: number; progress?: number; name?: string }): void {
  // Only report download progress events
  if (progress.status === 'progress' || progress.status === 'downloading') {
    const downloadProgress: DownloadProgress = {
      loaded: progress.loaded ?? 0,
      total: progress.total ?? 0,
      percentage: progress.progress !== undefined ? progress.progress * 100 : 0,
      status: progress.file ? `Downloading ${progress.file}...` : 'Downloading model...',
    };
    postResponse({ type: 'progress', progress: downloadProgress });
  } else if (progress.status === 'ready') {
    postResponse({ type: 'progress', progress: {
      loaded: 100,
      total: 100,
      percentage: 100,
      status: 'Model loaded and ready',
    }});
  } else if (progress.status === 'initiate') {
    postResponse({ type: 'progress', progress: {
      loaded: 0,
      total: 100,
      percentage: 0,
      status: progress.file ? `Preparing ${progress.file}...` : 'Initializing model...',
    }});
  }
}

/**
 * Initialize the Whisper pipeline
 */
async function initializePipeline(modelId: string): Promise<void> {
  if (isInitializing) {
    console.warn('Pipeline initialization already in progress');
    return;
  }

  if (transcriber && currentModelId === modelId) {
    // Already initialized with the same model
    postResponse({ type: 'ready' });
    return;
  }

  isInitializing = true;

  try {
    // Dispose existing pipeline if switching models
    if (transcriber && currentModelId !== modelId) {
      if (transcriber.dispose) {
        await transcriber.dispose();
      }
      transcriber = null;
      currentModelId = null;
    }

    console.log(`[Worker] Initializing Whisper pipeline with model: ${modelId}`);

    // Initialize the automatic speech recognition pipeline
    transcriber = await pipeline(
      'automatic-speech-recognition',
      modelId,
      {
        progress_callback: handleProgress,
        dtype: 'fp32', // Use fp32 for better compatibility
        device: 'wasm', // Use WebAssembly backend
      }
    ) as unknown as TranscriberPipeline;

    currentModelId = modelId;
    console.log('[Worker] Whisper pipeline initialized successfully');
    postResponse({ type: 'ready' });
  } catch (error) {
    console.error('[Worker] Failed to initialize pipeline:', error);
    transcriber = null;
    currentModelId = null;
    postResponse({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to initialize transcription model',
    });
  } finally {
    isInitializing = false;
  }
}

/**
 * Generate a unique ID for segments
 */
function generateSegmentId(): string {
  return `seg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Transcribe audio data
 */
async function transcribeAudio(
  audioData: Float32Array,
  sampleRate: number
): Promise<void> {
  if (!transcriber) {
    postResponse({
      type: 'error',
      error: 'Transcription model not initialized. Call init first.',
    });
    return;
  }

  try {
    console.log(`[Worker] Transcribing audio: ${audioData.length} samples at ${sampleRate}Hz`);

    // Resample to 16000Hz if needed (Whisper expects 16kHz)
    let processedAudio = audioData;
    if (sampleRate !== 16000) {
      processedAudio = resampleAudio(audioData, sampleRate, 16000);
    }

    // Run transcription with timestamps
    const result = await transcriber(processedAudio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      language: 'en', // Can be made configurable
    });

    // Handle different result formats
    let text = '';
    let segments: TranscriptionSegment[] = [];

    if (typeof result === 'string') {
      text = result;
    } else if (Array.isArray(result)) {
      // Multiple results (shouldn't happen with single input)
      text = result.map(r => typeof r === 'string' ? r : r.text).join(' ');
    } else if (result && typeof result === 'object') {
      const resultObj = result as { text?: string; chunks?: Array<{ timestamp?: [number, number]; text?: string }> };
      text = resultObj.text || '';
      
      // Extract timestamps/chunks if available
      if (resultObj.chunks && Array.isArray(resultObj.chunks)) {
        segments = resultObj.chunks.map((chunk: { timestamp?: [number, number]; text?: string }) => ({
          id: generateSegmentId(),
          start: chunk.timestamp?.[0] ?? 0,
          end: chunk.timestamp?.[1] ?? 0,
          text: chunk.text ?? '',
        }));
      }
    }

    // Calculate total duration from segments or audio length
    const duration = segments.length > 0
      ? Math.max(...segments.map(s => s.end))
      : processedAudio.length / 16000;

    const transcriptionResult: TranscriptionResult = {
      text: text.trim(),
      segments,
      duration,
      language: 'en',
    };

    console.log('[Worker] Transcription complete:', transcriptionResult.text.substring(0, 100));
    postResponse({ type: 'result', result: transcriptionResult });
  } catch (error) {
    console.error('[Worker] Transcription failed:', error);
    postResponse({
      type: 'error',
      error: error instanceof Error ? error.message : 'Transcription failed',
    });
  }
}

/**
 * Resample audio to target sample rate
 * Simple linear interpolation resampling
 */
function resampleAudio(
  audioData: Float32Array,
  fromSampleRate: number,
  toSampleRate: number
): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return audioData;
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
 * Handle messages from the main thread
 */
self.onmessage = async (event: MessageEvent<TranscriptionWorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      await initializePipeline(message.modelId);
      break;

    case 'transcribe':
      await transcribeAudio(message.audioData, message.sampleRate);
      break;

    case 'abort':
      // Currently cannot abort mid-transcription with Transformers.js
      // Future: implement cancellation token support
      console.log('[Worker] Abort requested (not implemented)');
      break;

    default:
      console.warn('[Worker] Unknown message type:', (message as { type: string }).type);
  }
};

// Export for TypeScript module resolution
export {};
