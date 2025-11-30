/**
 * Transcription Composable
 * Vue composable for managing audio transcription
 * Supports both batch and streaming (real-time) transcription modes
 */

import { ref, computed, readonly, onUnmounted } from 'vue';
import { getTranscriptionWorker } from '@/composables/useModelManager';
import { convertAudioToFloat32, validateAudioBlob } from '@/services/transcription.service';
import { AUDIO_CONFIG } from '@/utils/constants';
import type {
  TranscriptionResult,
  TranscriptionSegment,
  TranscriptionMode,
  TranscriptionWorkerMessage,
  TranscriptionWorkerResponse,
} from '@/types/transcription';
import type { ComputedRef, Ref, DeepReadonly } from 'vue';

/**
 * Transcription state
 */
export type TranscriptionState = 
  | 'idle'           // Ready to transcribe
  | 'streaming'      // Streaming mode active
  | 'processing'     // Processing batch transcription
  | 'converting'     // Converting audio format
  | 'complete'       // Transcription finished
  | 'error';         // Error occurred

/**
 * Options for useTranscription
 */
export interface UseTranscriptionOptions {
  /** Default transcription mode */
  defaultMode?: TranscriptionMode;
  /** Minimum chunk duration in seconds for streaming */
  minChunkDuration?: number;
  /** Callback for partial results in streaming mode */
  onPartialResult?: (text: string, segments: TranscriptionSegment[]) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

/**
 * Return type for useTranscription
 */
export interface UseTranscriptionReturn {
  // State
  /** Current transcription state */
  state: DeepReadonly<Ref<TranscriptionState>>;
  /** Current transcription mode */
  mode: DeepReadonly<Ref<TranscriptionMode>>;
  /** Whether currently transcribing */
  isTranscribing: ComputedRef<boolean>;
  /** Whether in streaming mode */
  isStreaming: ComputedRef<boolean>;
  /** Current partial transcript (streaming mode) */
  partialText: DeepReadonly<Ref<string>>;
  /** Current partial segments (streaming mode) */
  partialSegments: DeepReadonly<Ref<TranscriptionSegment[]>>;
  /** Final result after transcription complete */
  result: DeepReadonly<Ref<TranscriptionResult | null>>;
  /** Progress percentage (0-100) */
  progress: DeepReadonly<Ref<number>>;
  /** Status message */
  statusMessage: DeepReadonly<Ref<string>>;
  /** Error message if any */
  error: DeepReadonly<Ref<string | null>>;

  // Actions
  /** Transcribe audio blob in batch mode */
  transcribeBatch: (audioBlob: Blob) => Promise<TranscriptionResult>;
  /** Start streaming transcription session */
  startStreaming: () => Promise<void>;
  /** Send audio chunk for streaming transcription */
  sendChunk: (audioData: Float32Array, sampleRate: number) => Promise<void>;
  /** End streaming session and get final result */
  endStreaming: () => Promise<TranscriptionResult>;
  /** Abort current transcription */
  abort: () => void;
  /** Set transcription mode */
  setMode: (mode: TranscriptionMode) => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Composable for managing audio transcription
 */
export function useTranscription(options: UseTranscriptionOptions = {}): UseTranscriptionReturn {
  const {
    defaultMode = 'batch',
    minChunkDuration = 3, // Minimum 3 seconds per chunk for meaningful transcription
    onPartialResult,
    onError,
  } = options;

  // State
  const state = ref<TranscriptionState>('idle');
  const mode = ref<TranscriptionMode>(defaultMode);
  const partialText = ref('');
  const partialSegments = ref<TranscriptionSegment[]>([]);
  const result = ref<TranscriptionResult | null>(null);
  const progress = ref(0);
  const statusMessage = ref('');
  const error = ref<string | null>(null);

  // Internal state
  let worker: Worker | null = null;
  let messageHandler: ((event: MessageEvent<TranscriptionWorkerResponse>) => void) | null = null;
  let resolveResult: ((value: TranscriptionResult) => void) | null = null;
  let rejectResult: ((error: Error) => void) | null = null;
  let chunkIndex = 0;
  let streamingResolve: (() => void) | null = null;

  // Computed
  const isTranscribing = computed(() => 
    state.value === 'streaming' || 
    state.value === 'processing' || 
    state.value === 'converting'
  );

  const isStreaming = computed(() => state.value === 'streaming');

  /**
   * Set up worker message handler
   */
  function setupMessageHandler(): void {
    if (messageHandler) return;

    worker = getTranscriptionWorker();

    messageHandler = (event: MessageEvent<TranscriptionWorkerResponse>) => {
      const response = event.data;

      switch (response.type) {
        case 'progress':
          progress.value = response.progress.percentage;
          statusMessage.value = response.progress.status;
          break;

        case 'stream-ready':
          state.value = 'streaming';
          statusMessage.value = 'Streaming ready';
          streamingResolve?.();
          streamingResolve = null;
          break;

        case 'partial':
          partialText.value = response.text;
          if (response.segments) {
            partialSegments.value = [...partialSegments.value, ...response.segments];
          }
          onPartialResult?.(response.text, partialSegments.value);
          break;

        case 'result':
          state.value = 'complete';
          result.value = response.result;
          progress.value = 100;
          statusMessage.value = 'Transcription complete';
          resolveResult?.(response.result);
          resolveResult = null;
          rejectResult = null;
          break;

        case 'error':
          state.value = 'error';
          error.value = response.error;
          statusMessage.value = 'Error: ' + response.error;
          onError?.(new Error(response.error));
          rejectResult?.(new Error(response.error));
          resolveResult = null;
          rejectResult = null;
          break;
      }
    };

    worker.addEventListener('message', messageHandler);
  }

  /**
   * Clean up worker message handler
   */
  function cleanupMessageHandler(): void {
    if (worker && messageHandler) {
      worker.removeEventListener('message', messageHandler);
      messageHandler = null;
    }
  }

  /**
   * Transcribe audio in batch mode
   */
  async function transcribeBatch(audioBlob: Blob): Promise<TranscriptionResult> {
    if (isTranscribing.value) {
      throw new Error('Transcription already in progress');
    }

    // Validate audio
    const validation = validateAudioBlob(audioBlob);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Reset state
    reset();
    mode.value = 'batch';
    state.value = 'converting';
    statusMessage.value = 'Converting audio...';

    try {
      setupMessageHandler();

      // Convert audio to Float32Array
      const { audioData, sampleRate } = await convertAudioToFloat32(
        audioBlob,
        AUDIO_CONFIG.SAMPLE_RATE
      );

      state.value = 'processing';
      statusMessage.value = 'Transcribing...';

      // Send to worker
      return new Promise<TranscriptionResult>((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;

        const message: TranscriptionWorkerMessage = {
          type: 'transcribe',
          audioData,
          sampleRate,
        };
        worker?.postMessage(message);
      });
    } catch (err) {
      state.value = 'error';
      error.value = err instanceof Error ? err.message : 'Transcription failed';
      throw err;
    }
  }

  /**
   * Start streaming transcription session
   */
  async function startStreaming(): Promise<void> {
    if (isTranscribing.value) {
      throw new Error('Transcription already in progress');
    }

    reset();
    mode.value = 'streaming';
    state.value = 'converting'; // Temporary state while waiting for stream-ready
    statusMessage.value = 'Starting streaming...';
    chunkIndex = 0;

    setupMessageHandler();

    return new Promise<void>((resolve) => {
      streamingResolve = resolve;
      
      const message: TranscriptionWorkerMessage = {
        type: 'stream-start',
      };
      worker?.postMessage(message);
    });
  }

  /**
   * Send audio chunk for streaming transcription
   */
  async function sendChunk(audioData: Float32Array, sampleRate: number): Promise<void> {
    if (state.value !== 'streaming') {
      console.warn('Not in streaming mode, ignoring chunk');
      return;
    }

    // Check minimum chunk duration
    const chunkDuration = audioData.length / sampleRate;
    if (chunkDuration < minChunkDuration) {
      console.log(`Chunk too short (${chunkDuration.toFixed(1)}s < ${minChunkDuration}s), skipping`);
      return;
    }

    const message: TranscriptionWorkerMessage = {
      type: 'stream-chunk',
      audioData,
      sampleRate,
      chunkIndex: chunkIndex++,
    };
    worker?.postMessage(message);
  }

  /**
   * End streaming session and get final result
   */
  async function endStreaming(): Promise<TranscriptionResult> {
    if (state.value !== 'streaming') {
      throw new Error('Not in streaming mode');
    }

    statusMessage.value = 'Finalizing transcription...';

    return new Promise<TranscriptionResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;

      const message: TranscriptionWorkerMessage = {
        type: 'stream-end',
      };
      worker?.postMessage(message);
    });
  }

  /**
   * Abort current transcription
   */
  function abort(): void {
    if (!isTranscribing.value) return;

    const message: TranscriptionWorkerMessage = {
      type: 'abort',
    };
    worker?.postMessage(message);

    state.value = 'idle';
    statusMessage.value = 'Transcription aborted';
    resolveResult = null;
    rejectResult = null;
    streamingResolve = null;
  }

  /**
   * Set transcription mode
   */
  function setMode(newMode: TranscriptionMode): void {
    if (isTranscribing.value) {
      console.warn('Cannot change mode while transcribing');
      return;
    }
    mode.value = newMode;
  }

  /**
   * Reset state
   */
  function reset(): void {
    state.value = 'idle';
    partialText.value = '';
    partialSegments.value = [];
    result.value = null;
    progress.value = 0;
    statusMessage.value = '';
    error.value = null;
    chunkIndex = 0;
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (isTranscribing.value) {
      abort();
    }
    cleanupMessageHandler();
  });

  return {
    // State
    state: readonly(state),
    mode: readonly(mode),
    isTranscribing,
    isStreaming,
    partialText: readonly(partialText),
    partialSegments: readonly(partialSegments),
    result: readonly(result),
    progress: readonly(progress),
    statusMessage: readonly(statusMessage),
    error: readonly(error),

    // Actions
    transcribeBatch,
    startStreaming,
    sendChunk,
    endStreaming,
    abort,
    setMode,
    reset,
  };
}

/**
 * Helper to calculate minimum chunk size for streaming
 * Returns the minimum number of samples needed for a chunk
 */
export function getMinChunkSamples(sampleRate: number, minDurationSeconds: number = 3): number {
  return Math.floor(sampleRate * minDurationSeconds);
}

/**
 * Helper to chunk audio data for streaming
 * Splits audio into chunks of specified duration
 */
export function chunkAudioData(
  audioData: Float32Array,
  sampleRate: number,
  chunkDurationSeconds: number
): Float32Array[] {
  const chunkSize = Math.floor(sampleRate * chunkDurationSeconds);
  const chunks: Float32Array[] = [];

  for (let i = 0; i < audioData.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, audioData.length);
    chunks.push(audioData.slice(i, end));
  }

  return chunks;
}
