/**
 * Transcription Web Worker
 * Runs Whisper speech-to-text model from Transformers.js in a background thread
 * Handles model initialization, transcription, and progress reporting
 * Supports both batch and streaming transcription modes
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

// Streaming state
let isStreamingActive = false;
let streamingAborted = false;
let accumulatedChunks: { text: string; timestamp?: [number, number] }[] = [];
let lastProcessedOffset = 0; // Track time offset for continuous streaming

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
 * Start streaming transcription session
 */
function startStreaming(): void {
  isStreamingActive = true;
  streamingAborted = false;
  accumulatedChunks = [];
  lastProcessedOffset = 0;
  console.log('[Worker] Streaming session started');
  postResponse({ type: 'stream-ready' });
}

/**
 * Process a streaming audio chunk
 * This transcribes a chunk and sends partial results
 */
async function processStreamingChunk(
  audioData: Float32Array,
  sampleRate: number,
  chunkIndex: number
): Promise<void> {
  if (!transcriber) {
    postResponse({
      type: 'error',
      error: 'Transcription model not initialized. Call init first.',
    });
    return;
  }

  if (!isStreamingActive || streamingAborted) {
    console.log('[Worker] Streaming not active or aborted, ignoring chunk');
    return;
  }

  try {
    console.log(`[Worker] Processing streaming chunk ${chunkIndex}: ${audioData.length} samples at ${sampleRate}Hz`);

    // Resample to 16000Hz if needed
    let processedAudio = audioData;
    if (sampleRate !== 16000) {
      processedAudio = resampleAudio(audioData, sampleRate, 16000);
    }

    // Calculate chunk duration for time offset
    const chunkDuration = processedAudio.length / 16000;

    // Transcribe the chunk
    const result = await transcriber(processedAudio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      language: 'en',
    });

    if (streamingAborted) {
      return;
    }

    // Parse result
    let chunkText = '';
    const chunkSegments: TranscriptionSegment[] = [];

    if (typeof result === 'string') {
      chunkText = result;
    } else if (result && typeof result === 'object') {
      const resultObj = result as { text?: string; chunks?: Array<{ timestamp?: [number, number]; text?: string }> };
      chunkText = resultObj.text || '';
      
      if (resultObj.chunks && Array.isArray(resultObj.chunks)) {
        for (const chunk of resultObj.chunks) {
          const start = (chunk.timestamp?.[0] ?? 0) + lastProcessedOffset;
          const end = (chunk.timestamp?.[1] ?? 0) + lastProcessedOffset;
          
          accumulatedChunks.push({
            text: chunk.text ?? '',
            timestamp: [start, end],
          });
          
          chunkSegments.push({
            id: generateSegmentId(),
            start,
            end,
            text: chunk.text ?? '',
          });
        }
      }
    }

    // Update offset for next chunk
    lastProcessedOffset += chunkDuration;

    // Send partial result with accumulated text
    const accumulatedText = accumulatedChunks.map(c => c.text).join(' ').trim();
    
    console.log(`[Worker] Streaming chunk ${chunkIndex} processed: "${chunkText.substring(0, 50)}..."`);
    
    postResponse({
      type: 'partial',
      text: accumulatedText,
      segments: chunkSegments,
    });

  } catch (error) {
    console.error('[Worker] Streaming chunk processing failed:', error);
    postResponse({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to process audio chunk',
    });
  }
}

/**
 * End streaming session and return final result
 */
function endStreaming(): void {
  if (!isStreamingActive) {
    console.log('[Worker] No active streaming session to end');
    return;
  }

  console.log('[Worker] Ending streaming session');

  // Build final result from accumulated chunks
  const finalText = accumulatedChunks.map(c => c.text).join(' ').trim();
  const segments: TranscriptionSegment[] = accumulatedChunks.map(chunk => ({
    id: generateSegmentId(),
    start: chunk.timestamp?.[0] ?? 0,
    end: chunk.timestamp?.[1] ?? 0,
    text: chunk.text,
  }));

  const duration = segments.length > 0
    ? Math.max(...segments.map(s => s.end))
    : lastProcessedOffset;

  const result: TranscriptionResult = {
    text: finalText,
    segments,
    duration,
    language: 'en',
  };

  // Reset streaming state
  isStreamingActive = false;
  streamingAborted = false;
  accumulatedChunks = [];
  lastProcessedOffset = 0;

  postResponse({ type: 'result', result });
}

/**
 * Abort streaming transcription
 */
function abortStreaming(): void {
  console.log('[Worker] Aborting streaming session');
  streamingAborted = true;
  isStreamingActive = false;
  accumulatedChunks = [];
  lastProcessedOffset = 0;
}

/**
 * Handle messages from the main thread
 */
self.onmessage = async (event: MessageEvent<TranscriptionWorkerMessage>) => {
  const message = event.data;
  console.log('[Worker] Received message:', message.type);

  switch (message.type) {
    case 'init':
      console.log('[Worker] Initializing pipeline with model:', message.modelId);
      await initializePipeline(message.modelId);
      break;

    case 'transcribe':
      await transcribeAudio(message.audioData, message.sampleRate);
      break;

    case 'stream-start':
      startStreaming();
      break;

    case 'stream-chunk':
      await processStreamingChunk(message.audioData, message.sampleRate, message.chunkIndex);
      break;

    case 'stream-end':
      endStreaming();
      break;

    case 'abort':
      if (isStreamingActive) {
        abortStreaming();
      }
      console.log('[Worker] Abort processed');
      break;

    default:
      console.warn('[Worker] Unknown message type:', (message as { type: string }).type);
  }
};

// Export for TypeScript module resolution
export {};
