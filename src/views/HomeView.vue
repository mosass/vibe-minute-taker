<script setup lang="ts">
/**
 * HomeView - Main recording and transcription view
 * 
 * This is the primary entry point for recording meetings
 * and transcribing audio using edge AI.
 */

import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

// Composables
import { useModelManager } from '@/composables/useModelManager';
import { useAudioRecorder } from '@/composables/useAudioRecorder';

// Services
import { 
  transcribeAudio, 
  validateAudioBlob,
  type TranscriptionProgressCallback
} from '@/services/transcription.service';
import { createMeeting, createAudioFile } from '@/services/db.service';
import { saveAudioFile } from '@/services/opfs.service';

// Components
import ModelDownloader from '@/components/setup/ModelDownloader.vue';
import RecordButton from '@/components/recording/RecordButton.vue';
import RecordingTimer from '@/components/recording/RecordingTimer.vue';
import RecordingControls from '@/components/recording/RecordingControls.vue';
import WaveformVisualizer from '@/components/recording/WaveformVisualizer.vue';
import TranscriptionProgress from '@/components/transcription/TranscriptionProgress.vue';
import TranscriptView from '@/components/transcription/TranscriptView.vue';

// Types
import type { Meeting, TranscriptSegment } from '@/types/meeting';
import type { AudioFile, RecordingResult } from '@/types/audio';
import type { TranscriptionResult } from '@/types/transcription';

// Utils
import { generateMeetingTitle } from '@/utils/formatters';
import { ERROR_MESSAGES } from '@/utils/constants';

// Router
const router = useRouter();

// View states
type ViewState = 'loading' | 'needsModel' | 'ready' | 'recording' | 'processing' | 'complete' | 'error';

// State
const viewState = ref<ViewState>('loading');
const errorMessage = ref<string | null>(null);

// Transcription state
const transcriptionStage = ref<'converting' | 'transcribing' | 'complete'>('converting');
const transcriptionProgress = ref(0);
const transcriptionMessage = ref('');

// Result state
const transcriptionResult = ref<TranscriptionResult | null>(null);
const savedMeetingId = ref<string | null>(null);

// Model manager
const {
  checkModelStatus
} = useModelManager();

// Audio recorder
const {
  state: recordingState,
  isRecording,
  isPaused,
  isActive,
  elapsedSeconds,
  amplitude,
  error: recorderError,
  start: startRecording,
  pause: pauseRecording,
  resume: resumeRecording,
  stop: stopRecording,
  cancel: cancelRecording,
  clearError: clearRecorderError
} = useAudioRecorder({
  enableVisualization: true
});

// Computed
const recordButtonState = computed(() => {
  if (viewState.value === 'processing') return 'processing';
  if (isRecording.value) return 'recording';
  return 'idle';
});

/**
 * Check if model is ready on mount
 */
async function initializeView(): Promise<void> {
  viewState.value = 'loading';
  
  const ready = await checkModelStatus();
  
  if (ready) {
    viewState.value = 'ready';
  } else {
    viewState.value = 'needsModel';
  }
}

/**
 * Handle model ready event from ModelDownloader
 */
function handleModelReady(): void {
  viewState.value = 'ready';
}

/**
 * Handle record button press
 */
async function handleRecordStart(): Promise<void> {
  errorMessage.value = null;
  
  try {
    await startRecording();
    viewState.value = 'recording';
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : ERROR_MESSAGES.RECORDING_FAILED;
    viewState.value = 'error';
  }
}

/**
 * Handle stop recording
 */
async function handleRecordStop(): Promise<void> {
  errorMessage.value = null;
  
  try {
    // Stop recording and get result
    const result = await stopRecording();
    
    // Validate audio
    const validation = validateAudioBlob(result.blob);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Start transcription process
    await processRecording(result);
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : ERROR_MESSAGES.RECORDING_FAILED;
    viewState.value = 'error';
  }
}

/**
 * Handle pause recording
 */
function handlePause(): void {
  pauseRecording();
}

/**
 * Handle resume recording
 */
function handleResume(): void {
  resumeRecording();
}

/**
 * Handle cancel recording
 */
function handleCancel(): void {
  cancelRecording();
  viewState.value = 'ready';
}

/**
 * Process a recording through transcription
 */
async function processRecording(result: RecordingResult): Promise<void> {
  viewState.value = 'processing';
  transcriptionStage.value = 'converting';
  transcriptionProgress.value = 0;
  transcriptionMessage.value = '';
  
  try {
    // Progress callback
    const onProgress: TranscriptionProgressCallback = (progress) => {
      transcriptionStage.value = progress.stage;
      transcriptionMessage.value = progress.message;
      if (progress.progress !== undefined) {
        transcriptionProgress.value = progress.progress;
      }
    };
    
    // Transcribe
    const transcription = await transcribeAudio(result.blob, {}, onProgress);
    transcriptionResult.value = transcription;
    
    // Save to database
    await saveMeeting(result, transcription);
    
    // Show complete state
    transcriptionStage.value = 'complete';
    viewState.value = 'complete';
  } catch (err) {
    console.error('Transcription failed:', err);
    errorMessage.value = err instanceof Error ? err.message : ERROR_MESSAGES.TRANSCRIPTION_FAILED;
    viewState.value = 'error';
  }
}

/**
 * Save meeting to database
 */
async function saveMeeting(
  recording: RecordingResult,
  transcription: TranscriptionResult
): Promise<void> {
  const meetingId = crypto.randomUUID();
  const audioId = crypto.randomUUID();
  const now = new Date();
  
  // Save audio file to OPFS
  await saveAudioFile(audioId, recording.blob);
  
  // Create audio file record
  const audioFile: AudioFile = {
    id: audioId,
    filename: `${audioId}.webm`,
    mimeType: recording.mimeType,
    size: recording.blob.size,
    duration: recording.duration,
    createdAt: now
  };
  await createAudioFile(audioFile);
  
  // Generate title from transcript or use date-based title
  const title = transcription.text.trim() 
    ? transcription.text.slice(0, 50).trim() + (transcription.text.length > 50 ? '...' : '')
    : generateMeetingTitle(now);
  
  // Create meeting record
  const meeting: Meeting = {
    id: meetingId,
    title,
    createdAt: now,
    updatedAt: now,
    duration: recording.duration,
    transcript: transcription.text,
    segments: transcription.segments as TranscriptSegment[],
    audioFileId: audioId,
    status: 'complete'
  };
  await createMeeting(meeting);
  
  savedMeetingId.value = meetingId;
}

/**
 * Start a new recording
 */
function startNewRecording(): void {
  transcriptionResult.value = null;
  savedMeetingId.value = null;
  errorMessage.value = null;
  viewState.value = 'ready';
}

/**
 * View the saved meeting
 */
function viewMeeting(): void {
  if (savedMeetingId.value) {
    router.push(`/meetings/${savedMeetingId.value}`);
  }
}

/**
 * Retry after an error
 */
function handleRetry(): void {
  clearRecorderError();
  errorMessage.value = null;
  viewState.value = 'ready';
}

// Watch for recorder errors
watch(recorderError, (error) => {
  if (error) {
    errorMessage.value = error;
  }
});

// Initialize on mount
onMounted(() => {
  initializeView();
});
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Loading state -->
    <div 
      v-if="viewState === 'loading'"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>

    <!-- Model download required -->
    <div 
      v-else-if="viewState === 'needsModel'"
      class="flex-1 flex items-center justify-center p-4"
    >
      <ModelDownloader @ready="handleModelReady" />
    </div>

    <!-- Ready state - can record -->
    <div 
      v-else-if="viewState === 'ready'"
      class="flex-1 flex flex-col items-center justify-center p-4 space-y-8"
    >
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Record Meeting
        </h1>
        <p class="text-gray-600 dark:text-gray-400 max-w-sm">
          Tap to start recording. Your audio will be transcribed automatically.
        </p>
      </div>
      
      <!-- Waveform placeholder -->
      <div class="w-full max-w-md">
        <WaveformVisualizer
          :active="false"
          :amplitude="0"
          variant="primary"
          :height="64"
        />
      </div>
      
      <!-- Record button -->
      <RecordButton
        :state="recordButtonState"
        size="lg"
        @start="handleRecordStart"
      />
      
      <!-- Hint text -->
      <p class="text-sm text-gray-500 dark:text-gray-500">
        All transcription happens on your device
      </p>
    </div>

    <!-- Recording state -->
    <div 
      v-else-if="viewState === 'recording'"
      class="flex-1 flex flex-col items-center justify-center p-4 space-y-8"
    >
      <!-- Timer -->
      <RecordingTimer
        :seconds="elapsedSeconds"
        :is-recording="isActive"
        :is-paused="isPaused"
        size="lg"
      />
      
      <!-- Waveform -->
      <div class="w-full max-w-md">
        <WaveformVisualizer
          :active="isActive"
          :amplitude="amplitude"
          variant="recording"
          :height="80"
        />
      </div>
      
      <!-- Record button (for stop) -->
      <RecordButton
        :state="recordButtonState"
        size="lg"
        @stop="handleRecordStop"
      />
      
      <!-- Controls -->
      <RecordingControls
        :is-paused="isPaused"
        :is-processing="recordingState === 'stopping'"
        :show-cancel="true"
        size="md"
        @pause="handlePause"
        @resume="handleResume"
        @stop="handleRecordStop"
        @cancel="handleCancel"
      />
    </div>

    <!-- Processing state -->
    <div 
      v-else-if="viewState === 'processing'"
      class="flex-1 flex items-center justify-center p-4"
    >
      <TranscriptionProgress
        :stage="transcriptionStage"
        :progress="transcriptionProgress"
        :message="transcriptionMessage"
      />
    </div>

    <!-- Complete state - show result -->
    <div 
      v-else-if="viewState === 'complete' && transcriptionResult"
      class="flex-1 flex flex-col p-4 space-y-4 overflow-hidden"
    >
      <div class="text-center">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          Transcription Complete!
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Your meeting has been saved
        </p>
      </div>
      
      <!-- Transcript preview -->
      <div class="flex-1 overflow-hidden">
        <TranscriptView
          :text="transcriptionResult.text"
          :segments="transcriptionResult.segments"
          :show-timestamps="true"
          max-height="300px"
        />
      </div>
      
      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <button
          type="button"
          class="flex-1 py-3 px-4 rounded-xl font-medium bg-gray-200 dark:bg-gray-700 
                 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600
                 transition-colors"
          @click="startNewRecording"
        >
          New Recording
        </button>
        <button
          type="button"
          class="flex-1 py-3 px-4 rounded-xl font-medium bg-primary-500 text-white
                 hover:bg-primary-600 transition-colors"
          @click="viewMeeting"
        >
          View Meeting
        </button>
      </div>
    </div>

    <!-- Error state -->
    <div 
      v-else-if="viewState === 'error'"
      class="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
    >
      <div class="w-16 h-16 rounded-full bg-recording-100 dark:bg-recording-900 flex items-center justify-center">
        <svg class="w-8 h-8 text-recording-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <div class="text-center">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p class="text-gray-600 dark:text-gray-400 max-w-sm">
          {{ errorMessage || 'An unexpected error occurred. Please try again.' }}
        </p>
      </div>
      
      <button
        type="button"
        class="py-3 px-6 rounded-xl font-medium bg-primary-500 text-white
               hover:bg-primary-600 transition-colors"
        @click="handleRetry"
      >
        Try Again
      </button>
    </div>
  </div>
</template>
