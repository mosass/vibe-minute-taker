<script setup lang="ts">
/**
 * HomeView - Main recording and transcription view
 * 
 * This is the primary entry point for recording meetings
 * and transcribing audio using edge AI.
 * 
 * Supports:
 * - Batch mode: Record first, then transcribe after stopping
 * - Live mode: Real-time transcription during recording
 * - Import mode: Import existing audio files for transcription
 */

import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Composables
import { useModelManager } from '@/composables/useModelManager';
import { useAudioRecorder } from '@/composables/useAudioRecorder';
import { useTranscription } from '@/composables/useTranscription';
import { useOPFS } from '@/composables/useOPFS';

// Services
import { 
  transcribeAudio, 
  validateAudioBlob,
  convertAudioToFloat32,
  type TranscriptionProgressCallback
} from '@/services/transcription.service';
import { createMeeting, createAudioFile } from '@/services/db.service';
import { saveAudioFile, readAudioFile } from '@/services/opfs.service';

// Components
import ModelDownloader from '@/components/setup/ModelDownloader.vue';
import RecordButton from '@/components/recording/RecordButton.vue';
import RecordingTimer from '@/components/recording/RecordingTimer.vue';
import RecordingControls from '@/components/recording/RecordingControls.vue';
import WaveformVisualizer from '@/components/recording/WaveformVisualizer.vue';
import TranscriptionProgress from '@/components/transcription/TranscriptionProgress.vue';
import TranscriptView from '@/components/transcription/TranscriptView.vue';
import OfflineBadge from '@/components/setup/OfflineBadge.vue';

// Types
import type { Meeting, TranscriptSegment } from '@/types/meeting';
import type { AudioFile, RecordingResult } from '@/types/audio';
import type { TranscriptionResult, TranscriptionSegment as TransSegment } from '@/types/transcription';

// Utils
import { generateMeetingTitle, formatFileSize } from '@/utils/formatters';
import { ERROR_MESSAGES, STORAGE_KEYS, AUDIO_CONFIG } from '@/utils/constants';

// Router
const router = useRouter();
const route = useRoute();

// OPFS composable
const { importAudioFile } = useOPFS();

// View states
type ViewState = 'loading' | 'needsModel' | 'ready' | 'recording' | 'processing' | 'complete' | 'error' | 'importing';

// State
const viewState = ref<ViewState>('loading');
const errorMessage = ref<string | null>(null);

// Import state
const importedFile = ref<File | null>(null);
const importedFileName = ref<string>('');
const importedFileSize = ref<number>(0);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Live transcription mode state
const isLiveMode = ref(false);
const liveTranscriptText = ref('');
const liveTranscriptSegments = ref<TransSegment[]>([]);

// Transcription state
const transcriptionStage = ref<'converting' | 'transcribing' | 'complete'>('converting');
const transcriptionProgress = ref(0);
const transcriptionMessage = ref('');

// Result state
const transcriptionResult = ref<TranscriptionResult | null>(null);
const savedMeetingId = ref<string | null>(null);

// Audio chunks for live transcription
const audioChunks = ref<Blob[]>([]);
const lastProcessedChunkIndex = ref(0);
const chunkProcessingInterval = ref<ReturnType<typeof setInterval> | null>(null);

// Model manager
const {
  checkModelStatus
} = useModelManager();

// Audio recorder with chunk callback for live mode
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
  enableVisualization: true,
  onDataChunk: handleAudioChunk
});

// Transcription composable for live mode
const {
  startStreaming,
  sendChunk,
  endStreaming,
  abort: abortTranscription,
  partialText,
  partialSegments,
  isStreaming
} = useTranscription({
  onPartialResult: (text, segments) => {
    liveTranscriptText.value = text;
    liveTranscriptSegments.value = segments;
  },
  onError: (error) => {
    console.error('Live transcription error:', error);
    // Don't fail the recording, just log it
  }
});

// Computed
const recordButtonState = computed(() => {
  if (viewState.value === 'processing') return 'processing';
  if (isRecording.value) return 'recording';
  return 'idle';
});

// Watch for partial transcript updates in live mode
watch(partialText, (text) => {
  if (isLiveMode.value && text) {
    liveTranscriptText.value = text;
  }
});

watch(partialSegments, (segments) => {
  if (isLiveMode.value && segments.length > 0) {
    // Clone to avoid readonly assignment issues
    liveTranscriptSegments.value = segments.map(s => ({ ...s }));
  }
});

/**
 * Load live mode preference from storage
 */
function loadLiveModePreference(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LIVE_TRANSCRIPTION);
    if (saved === 'true') {
      isLiveMode.value = true;
    }
  } catch {
    // Storage not available
  }
}

/**
 * Save live mode preference to storage
 */
function saveLiveModePreference(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LIVE_TRANSCRIPTION, String(isLiveMode.value));
  } catch {
    // Storage not available
  }
}

/**
 * Toggle live transcription mode
 */
function toggleLiveMode(): void {
  if (isRecording.value) return; // Can't toggle during recording
  isLiveMode.value = !isLiveMode.value;
  saveLiveModePreference();
}

/**
 * Handle audio data chunk from recorder
 */
function handleAudioChunk(chunk: Blob): void {
  if (!isLiveMode.value) return;
  audioChunks.value.push(chunk);
}

/**
 * Process accumulated audio chunks for live transcription
 */
async function processAudioChunksForLive(): Promise<void> {
  if (!isLiveMode.value || !isStreaming.value) return;
  
  // Get unprocessed chunks
  const unprocessedChunks = audioChunks.value.slice(lastProcessedChunkIndex.value);
  
  if (unprocessedChunks.length === 0) return;
  
  // Combine chunks into a single blob
  const combinedBlob = new Blob(unprocessedChunks, { type: 'audio/webm' });
  
  // Only process if we have enough audio (at least ~3 seconds worth)
  // Rough estimate: ~32KB per second at typical WebM bitrate
  if (combinedBlob.size < 50000) return;
  
  try {
    // Convert to Float32Array
    const { audioData, sampleRate } = await convertAudioToFloat32(
      combinedBlob,
      AUDIO_CONFIG.SAMPLE_RATE
    );
    
    // Send to worker
    await sendChunk(audioData, sampleRate);
    
    // Mark chunks as processed
    lastProcessedChunkIndex.value = audioChunks.value.length;
  } catch (error) {
    console.error('Error processing live audio chunk:', error);
  }
}

/**
 * Start live chunk processing interval
 */
function startLiveChunkProcessing(): void {
  if (chunkProcessingInterval.value) return;
  
  // Process chunks every 5 seconds
  chunkProcessingInterval.value = setInterval(() => {
    processAudioChunksForLive();
  }, 5000);
}

/**
 * Stop live chunk processing interval
 */
function stopLiveChunkProcessing(): void {
  if (chunkProcessingInterval.value) {
    clearInterval(chunkProcessingInterval.value);
    chunkProcessingInterval.value = null;
  }
}

/**
 * Check if model is ready on mount
 */
async function initializeView(): Promise<void> {
  viewState.value = 'loading';
  loadLiveModePreference();
  
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
  audioChunks.value = [];
  lastProcessedChunkIndex.value = 0;
  liveTranscriptText.value = '';
  liveTranscriptSegments.value = [];
  
  try {
    // Start streaming transcription if in live mode
    if (isLiveMode.value) {
      await startStreaming();
      startLiveChunkProcessing();
    }
    
    await startRecording();
    viewState.value = 'recording';
  } catch (err) {
    stopLiveChunkProcessing();
    errorMessage.value = err instanceof Error ? err.message : ERROR_MESSAGES.RECORDING_FAILED;
    viewState.value = 'error';
  }
}

/**
 * Handle stop recording
 */
async function handleRecordStop(): Promise<void> {
  errorMessage.value = null;
  stopLiveChunkProcessing();
  
  try {
    // Stop recording and get result
    const result = await stopRecording();
    
    // Validate audio
    const validation = validateAudioBlob(result.blob);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // If in live mode, get final result from streaming
    if (isLiveMode.value && isStreaming.value) {
      try {
        // Process any remaining chunks
        await processAudioChunksForLive();
        
        // End streaming and get final result
        const streamResult = await endStreaming();
        
        // Use streaming result if available, otherwise fall back to batch
        if (streamResult.text.trim()) {
          transcriptionResult.value = streamResult;
          await saveMeeting(result, streamResult);
          transcriptionStage.value = 'complete';
          viewState.value = 'complete';
          return;
        }
      } catch (streamError) {
        console.error('Streaming finalization failed, falling back to batch:', streamError);
        // Fall through to batch transcription
      }
    }
    
    // Batch transcription (default or fallback)
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
  // Pause live chunk processing when paused
  stopLiveChunkProcessing();
}

/**
 * Handle resume recording
 */
function handleResume(): void {
  resumeRecording();
  // Resume live chunk processing
  if (isLiveMode.value) {
    startLiveChunkProcessing();
  }
}

/**
 * Handle cancel recording
 */
function handleCancel(): void {
  cancelRecording();
  stopLiveChunkProcessing();
  abortTranscription();
  audioChunks.value = [];
  lastProcessedChunkIndex.value = 0;
  liveTranscriptText.value = '';
  liveTranscriptSegments.value = [];
  viewState.value = 'ready';
}

/**
 * Process a recording through transcription
 * @param result - Recording result with blob data
 * @param existingAudioId - Optional existing audio ID (for imported files)
 */
async function processRecording(result: RecordingResult, existingAudioId?: string): Promise<void> {
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
    await saveMeeting(result, transcription, existingAudioId);
    
    // Show complete state
    transcriptionStage.value = 'complete';
    viewState.value = 'complete';
    
    // Clear import state
    importedFile.value = null;
    importedFileName.value = '';
    importedFileSize.value = 0;
  } catch (err) {
    console.error('Transcription failed:', err);
    errorMessage.value = err instanceof Error ? err.message : ERROR_MESSAGES.TRANSCRIPTION_FAILED;
    viewState.value = 'error';
  }
}

/**
 * Save meeting to database
 * @param recording - Recording result with blob data
 * @param transcription - Transcription result
 * @param existingAudioId - Optional existing audio ID (for imported files)
 */
async function saveMeeting(
  recording: RecordingResult,
  transcription: TranscriptionResult,
  existingAudioId?: string
): Promise<void> {
  const meetingId = crypto.randomUUID();
  const audioId = existingAudioId || crypto.randomUUID();
  const now = new Date();
  
  // Only save audio file if we don't have an existing one (new recording vs import)
  if (!existingAudioId) {
    await saveAudioFile(audioId, recording.blob);
  }
  
  // Determine filename based on import or recording
  const filename = importedFileName.value || `${audioId}.webm`;
  
  // Create audio file record
  const audioFile: AudioFile = {
    id: audioId,
    filename,
    mimeType: recording.mimeType,
    size: recording.blob.size,
    duration: recording.duration,
    createdAt: now
  };
  await createAudioFile(audioFile);
  
  // Generate title from imported filename, transcript, or use date-based title
  let title: string;
  if (importedFileName.value) {
    // Use imported filename without extension
    const nameWithoutExt = importedFileName.value.replace(/\.[^.]+$/, '');
    title = nameWithoutExt.slice(0, 50) + (nameWithoutExt.length > 50 ? '...' : '');
  } else if (transcription.text.trim()) {
    title = transcription.text.slice(0, 50).trim() + (transcription.text.length > 50 ? '...' : '');
  } else {
    title = generateMeetingTitle(now);
  }
  
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
  
  // Mark first recording as complete for install prompt trigger
  try {
    localStorage.setItem('first-recording-complete', 'true');
    // Dispatch storage event for other components to detect
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'first-recording-complete',
      newValue: 'true'
    }));
  } catch {
    // Storage not available
  }
}

/**
 * Start a new recording
 */
function startNewRecording(): void {
  transcriptionResult.value = null;
  savedMeetingId.value = null;
  errorMessage.value = null;
  audioChunks.value = [];
  lastProcessedChunkIndex.value = 0;
  liveTranscriptText.value = '';
  liveTranscriptSegments.value = [];
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
  stopLiveChunkProcessing();
  abortTranscription();
  importedFile.value = null;
  importedFileName.value = '';
  importedFileSize.value = 0;
  viewState.value = 'ready';
}

// ============================================================================
// IMPORT FUNCTIONALITY
// ============================================================================

/**
 * Supported audio formats
 */
const SUPPORTED_AUDIO_FORMATS = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/webm',
  'audio/ogg',
  'audio/m4a',
  'audio/mp4',
  'audio/x-m4a'
];

/**
 * Trigger file input click
 */
function triggerFileInput(): void {
  fileInputRef.value?.click();
}

/**
 * Handle file selection from file picker
 */
async function handleFileSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  
  if (!files || files.length === 0) return;
  
  const file = files[0];
  if (!file) return;
  
  // Reset the input so the same file can be selected again
  input.value = '';
  
  await processImportedFile(file);
}

/**
 * Handle files dropped via drag and drop
 */
async function handleFileDrop(event: DragEvent): Promise<void> {
  event.preventDefault();
  event.stopPropagation();
  
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  if (!file) return;
  
  await processImportedFile(file);
}

/**
 * Handle drag over event
 */
function handleDragOver(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Process an imported audio file
 */
async function processImportedFile(file: File): Promise<void> {
  // Validate file type
  if (!file.type.startsWith('audio/')) {
    errorMessage.value = 'Please select an audio file';
    viewState.value = 'error';
    return;
  }
  
  // Check if format is supported
  const isSupported = SUPPORTED_AUDIO_FORMATS.some(format => {
    const formatType = format.split('/')[1];
    return formatType && file.type.includes(formatType);
  });
  
  if (!isSupported && !file.type.startsWith('audio/')) {
    errorMessage.value = `Unsupported audio format: ${file.type}. Supported formats: WAV, MP3, WebM, OGG, M4A`;
    viewState.value = 'error';
    return;
  }
  
  // Store file info for display
  importedFile.value = file;
  importedFileName.value = file.name;
  importedFileSize.value = file.size;
  
  // Show importing state
  viewState.value = 'importing';
  errorMessage.value = null;
  
  try {
    // Import the file to OPFS
    const result = await importAudioFile(file);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to import file');
    }
    
    const { id, filename } = result.data;
    
    // Read the file back as blob for transcription
    const audioBlob = await readAudioFile(id, filename.split('.').pop() || 'webm');
    
    if (!audioBlob) {
      throw new Error('Failed to read imported audio file');
    }
    
    // Create recording result for processing
    const recordingResult: RecordingResult = {
      blob: audioBlob,
      duration: 0, // Will be determined during transcription
      mimeType: file.type
    };
    
    // Process through transcription
    await processRecording(recordingResult, id);
    
  } catch (err) {
    console.error('Import failed:', err);
    errorMessage.value = err instanceof Error ? err.message : 'Failed to import audio file';
    viewState.value = 'error';
    importedFile.value = null;
  }
}

/**
 * Cancel import
 */
function cancelImport(): void {
  importedFile.value = null;
  importedFileName.value = '';
  importedFileSize.value = 0;
  viewState.value = 'ready';
}

/**
 * Check for shared files on mount (Share Target API)
 */
async function checkForSharedFiles(): Promise<void> {
  // Check if we received shared files via Share Target
  if (route.path === '/share-target' || route.query.shared === 'true') {
    // Try to get the shared file from the service worker
    try {
      // First try the service worker message channel
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const fileInfo = await getPendingShareFromServiceWorker();
        
        if (fileInfo) {
          // Fetch the shared file from the SW cache
          const response = await fetch(fileInfo.url);
          if (response.ok) {
            const blob = await response.blob();
            // Get original filename from header
            const originalFilename = response.headers.get('X-Original-Filename');
            const filename = originalFilename ? decodeURIComponent(originalFilename) : fileInfo.name;
            const file = new File([blob], filename, { type: fileInfo.type });
            
            // Clear the pending share
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_PENDING_SHARE' });
            
            await processImportedFile(file);
          }
        }
      }
    } catch (err) {
      console.error('Failed to process shared file:', err);
    }
    
    // Clear the URL params
    router.replace('/');
  }
}

/**
 * Get pending share from service worker using message channel
 */
function getPendingShareFromServiceWorker(): Promise<{ url: string; name: string; type: string; size: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve(null);
      return;
    }
    
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data && event.data.success) {
        resolve(event.data.data);
      } else {
        resolve(null);
      }
    };
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_PENDING_SHARE' },
      [messageChannel.port2]
    );
    
    // Timeout after 3 seconds
    setTimeout(() => resolve(null), 3000);
  });
}

/**
 * Listen for shared files from service worker
 */
function setupServiceWorkerListener(): void {
  if (!('serviceWorker' in navigator)) return;
  
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SHARED_FILE') {
      const fileInfo = event.data.data;
      
      try {
        const response = await fetch(fileInfo.url);
        if (response.ok) {
          const blob = await response.blob();
          const originalFilename = response.headers.get('X-Original-Filename');
          const filename = originalFilename ? decodeURIComponent(originalFilename) : fileInfo.name;
          const file = new File([blob], filename, { type: fileInfo.type });
          
          // Clear the pending share
          navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_PENDING_SHARE' });
          
          await processImportedFile(file);
        }
      } catch (err) {
        console.error('Failed to process shared file from SW message:', err);
      }
    }
  });
}

// Watch for recorder errors
watch(recorderError, (error) => {
  if (error) {
    errorMessage.value = error;
  }
});

// Initialize on mount
onMounted(async () => {
  // Setup listener for shared files from service worker
  setupServiceWorkerListener();
  
  await initializeView();
  // Check for shared files after initialization
  await checkForSharedFiles();
});

// Cleanup on unmount
onUnmounted(() => {
  stopLiveChunkProcessing();
  abortTranscription();
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
      
      <!-- Live mode toggle -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          :class="[
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            isLiveMode ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
          ]"
          role="switch"
          :aria-checked="isLiveMode"
          @click="toggleLiveMode"
        >
          <span class="sr-only">Enable live transcription</span>
          <span
            :class="[
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0',
              'transition duration-200 ease-in-out',
              isLiveMode ? 'translate-x-5' : 'translate-x-0'
            ]"
          />
        </button>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Live transcription
        </span>
        <span 
          v-if="isLiveMode"
          class="inline-flex items-center rounded-md bg-primary-50 dark:bg-primary-900/30 px-2 py-1 text-xs font-medium text-primary-700 dark:text-primary-300"
        >
          Beta
        </span>
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
      
      <!-- Import audio button -->
      <div 
        class="flex flex-col items-center gap-2"
        @drop="handleFileDrop"
        @dragover="handleDragOver"
      >
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400
                 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30
                 rounded-lg transition-colors"
          @click="triggerFileInput"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Audio File
        </button>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          WAV, MP3, WebM, OGG, M4A
        </p>
        
        <!-- Hidden file input -->
        <input
          ref="fileInputRef"
          type="file"
          accept="audio/*"
          class="hidden"
          @change="handleFileSelect"
        />
      </div>
      
      <!-- Hint text with offline badge -->
      <div class="flex flex-col items-center gap-2">
        <OfflineBadge variant="success" size="sm" />
        <p class="text-sm text-gray-500 dark:text-gray-500">
          {{ isLiveMode ? 'See your transcript as you speak' : 'All transcription happens on your device' }}
        </p>
      </div>
    </div>

    <!-- Recording state -->
    <div 
      v-else-if="viewState === 'recording'"
      class="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
    >
      <!-- Live mode indicator -->
      <div 
        v-if="isLiveMode" 
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm"
      >
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-primary-500"></span>
        </span>
        Live transcription active
      </div>
      
      <!-- Timer -->
      <RecordingTimer
        :seconds="elapsedSeconds"
        :is-recording="isActive"
        :is-paused="isPaused"
        size="lg"
      />
      
      <!-- Live transcript preview (when in live mode) -->
      <div 
        v-if="isLiveMode && liveTranscriptText"
        class="w-full max-w-md bg-gray-50 dark:bg-gray-800 rounded-xl p-4 max-h-32 overflow-y-auto"
      >
        <p class="text-sm text-gray-700 dark:text-gray-300 italic">
          "{{ liveTranscriptText }}"
        </p>
      </div>
      
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

    <!-- Importing state -->
    <div 
      v-else-if="viewState === 'importing'"
      class="flex-1 flex flex-col items-center justify-center p-4 space-y-6"
    >
      <div class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
        <svg class="w-8 h-8 text-primary-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </div>
      
      <div class="text-center">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Importing Audio
        </h2>
        <p class="text-gray-600 dark:text-gray-400 max-w-sm">
          {{ importedFileName }}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
          {{ formatFileSize(importedFileSize) }}
        </p>
      </div>
      
      <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      
      <button
        type="button"
        class="py-2 px-4 text-sm font-medium text-gray-600 dark:text-gray-400 
               hover:text-gray-900 dark:hover:text-white transition-colors"
        @click="cancelImport"
      >
        Cancel
      </button>
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
