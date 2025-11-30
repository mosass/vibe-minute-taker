/**
 * Audio Recorder Composable
 * Vue composable for managing audio recording state
 * Exposes reactive recording state, handles permissions, tracks elapsed time
 */

import { ref, computed, readonly, onUnmounted, watch } from 'vue';
import { 
  AudioRecordingService, 
  createAudioService,
  type RecordingServiceState 
} from '@/services/audio.service';
import type { 
  RecordingState, 
  RecordingResult, 
  AudioAmplitude, 
  MicrophonePermission 
} from '@/types/audio';
import { ERROR_MESSAGES } from '@/utils/constants';

/**
 * Options for useAudioRecorder
 */
export interface UseAudioRecorderOptions {
  /** Whether to track amplitude for visualization */
  enableVisualization?: boolean;
  /** Callback when amplitude changes (for waveform) */
  onAmplitude?: (amplitude: AudioAmplitude) => void;
  /** Callback when recording data chunk is available */
  onDataChunk?: (chunk: Blob) => void;
}

import type { ComputedRef, Ref, DeepReadonly } from 'vue';

/**
 * Return type for useAudioRecorder
 */
export interface UseAudioRecorderReturn {
  // State
  /** Current recording state */
  state: DeepReadonly<Ref<RecordingState>>;
  /** Whether currently recording (includes paused) */
  isRecording: ComputedRef<boolean>;
  /** Whether recording is paused */
  isPaused: ComputedRef<boolean>;
  /** Whether recording is active (not paused) */
  isActive: ComputedRef<boolean>;
  /** Elapsed time in seconds */
  elapsedSeconds: DeepReadonly<Ref<number>>;
  /** Formatted elapsed time (MM:SS or HH:MM:SS) */
  formattedTime: ComputedRef<string>;
  /** Current amplitude value (0-1) for visualization */
  amplitude: DeepReadonly<Ref<number>>;
  /** Microphone permission state */
  permission: DeepReadonly<Ref<MicrophonePermission>>;
  /** Error message if any */
  error: DeepReadonly<Ref<string | null>>;

  // Actions
  /** Start recording */
  start: () => Promise<void>;
  /** Pause recording */
  pause: () => void;
  /** Resume recording */
  resume: () => void;
  /** Stop recording and return result */
  stop: () => Promise<RecordingResult>;
  /** Cancel recording without saving */
  cancel: () => void;
  /** Check microphone permission */
  checkPermission: () => Promise<MicrophonePermission>;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Composable for managing audio recording
 */
export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const { 
    enableVisualization = true, 
    onAmplitude, 
    onDataChunk 
  } = options;

  // Reactive state
  const state = ref<RecordingState>('idle');
  const elapsedSeconds = ref(0);
  const amplitude = ref(0);
  const permission = ref<MicrophonePermission>('prompt');
  const error = ref<string | null>(null);

  // Audio service instance
  let audioService: AudioRecordingService | null = null;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  // Computed properties
  const isRecording = computed(() => 
    state.value === 'recording' || state.value === 'paused'
  );

  const isPaused = computed(() => state.value === 'paused');

  const isActive = computed(() => state.value === 'recording');

  const formattedTime = computed(() => {
    const totalSeconds = Math.floor(elapsedSeconds.value);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  /**
   * Map service state to recording state
   */
  function mapServiceState(serviceState: RecordingServiceState): RecordingState {
    switch (serviceState) {
      case 'recording': return 'recording';
      case 'paused': return 'paused';
      case 'inactive': return 'idle';
      default: return 'idle';
    }
  }

  /**
   * Start elapsed time tracking
   */
  function startElapsedTimer(): void {
    stopElapsedTimer();
    elapsedTimer = setInterval(() => {
      if (audioService && state.value === 'recording') {
        elapsedSeconds.value = audioService.elapsedTime / 1000;
      }
    }, 100); // Update every 100ms for smooth display
  }

  /**
   * Stop elapsed time tracking
   */
  function stopElapsedTimer(): void {
    if (elapsedTimer !== null) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  }

  /**
   * Check microphone permission
   */
  async function checkPermission(): Promise<MicrophonePermission> {
    try {
      const permissionState = await AudioRecordingService.checkMicrophonePermission();
      permission.value = permissionState as MicrophonePermission;
      return permission.value;
    } catch {
      permission.value = 'prompt';
      return 'prompt';
    }
  }

  /**
   * Start recording
   */
  async function start(): Promise<void> {
    if (!AudioRecordingService.isSupported()) {
      error.value = 'Audio recording is not supported in this browser';
      throw new Error(error.value);
    }

    try {
      error.value = null;
      state.value = 'requesting';

      // Create new audio service instance
      audioService = createAudioService();

      // Set up callbacks
      audioService.setCallbacks({
        onStateChange: (newState) => {
          state.value = mapServiceState(newState);
          
          if (newState === 'recording') {
            startElapsedTimer();
          } else if (newState === 'paused' || newState === 'inactive') {
            stopElapsedTimer();
          }
        },
        onAmplitude: enableVisualization ? (amp) => {
          amplitude.value = amp.value;
          onAmplitude?.(amp);
        } : undefined,
        onDataAvailable: onDataChunk,
        onError: (err) => {
          error.value = err.message;
        }
      });

      // Start recording
      await audioService.start();
      permission.value = 'granted';
      elapsedSeconds.value = 0;
      amplitude.value = 0;

    } catch (err) {
      const errorObj = err as Error;
      
      // Handle specific error types
      if (errorObj.name === 'NotAllowedError') {
        permission.value = 'denied';
        error.value = ERROR_MESSAGES.MICROPHONE_DENIED;
      } else if (errorObj.name === 'NotFoundError') {
        error.value = ERROR_MESSAGES.MICROPHONE_NOT_FOUND;
      } else {
        error.value = ERROR_MESSAGES.RECORDING_FAILED;
      }

      state.value = 'idle';
      audioService = null;
      throw new Error(error.value);
    }
  }

  /**
   * Pause recording
   */
  function pause(): void {
    if (!audioService) {
      throw new Error('Cannot pause: no active recording');
    }

    try {
      audioService.pause();
      // Update elapsed one more time before pausing
      elapsedSeconds.value = audioService.elapsedTime / 1000;
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    }
  }

  /**
   * Resume recording
   */
  function resume(): void {
    if (!audioService) {
      throw new Error('Cannot resume: no active recording');
    }

    try {
      audioService.resume();
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    }
  }

  /**
   * Stop recording and return result
   */
  async function stop(): Promise<RecordingResult> {
    if (!audioService) {
      throw new Error('Cannot stop: no active recording');
    }

    try {
      state.value = 'stopping';
      
      // Get final elapsed time
      const finalElapsed = audioService.elapsedTime / 1000;
      
      const result = await audioService.stop();
      
      // Clean up
      stopElapsedTimer();
      audioService = null;
      state.value = 'idle';
      amplitude.value = 0;
      
      // Use tracked time if more accurate
      if (Math.abs(result.duration - finalElapsed) > 1) {
        result.duration = finalElapsed;
      }

      return result;
    } catch (err) {
      error.value = (err as Error).message;
      state.value = 'idle';
      throw err;
    }
  }

  /**
   * Cancel recording without saving
   */
  function cancel(): void {
    if (audioService) {
      audioService.cancel();
      audioService = null;
    }
    
    stopElapsedTimer();
    state.value = 'idle';
    elapsedSeconds.value = 0;
    amplitude.value = 0;
    error.value = null;
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  // Watch for state changes to update elapsed time when paused
  watch(state, (newState, oldState) => {
    if (oldState === 'recording' && newState === 'paused' && audioService) {
      elapsedSeconds.value = audioService.elapsedTime / 1000;
    }
  });

  // Cleanup on unmount
  onUnmounted(() => {
    if (audioService) {
      audioService.cancel();
      audioService = null;
    }
    stopElapsedTimer();
  });

  return {
    // State (readonly)
    state: readonly(state),
    isRecording,
    isPaused,
    isActive,
    elapsedSeconds: readonly(elapsedSeconds),
    formattedTime,
    amplitude: readonly(amplitude),
    permission: readonly(permission),
    error: readonly(error),

    // Actions
    start,
    pause,
    resume,
    stop,
    cancel,
    checkPermission,
    clearError
  };
}
