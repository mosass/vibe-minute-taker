<script setup lang="ts">
/**
 * AudioPlayer - Simple audio player component
 * 
 * Plays audio from OPFS storage with basic controls.
 */

import { ref, computed, onUnmounted, watch } from 'vue';
import { formatDuration } from '@/utils/formatters';

interface Props {
  /** Audio blob to play */
  audioBlob?: Blob | null;
  /** Audio URL to play (alternative to blob) */
  audioUrl?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /** Emitted when playback ends */
  ended: [];
  /** Emitted when an error occurs */
  error: [error: Error];
  /** Emitted when close is clicked */
  close: [];
}>();

// Audio element ref
const audioElement = ref<HTMLAudioElement | null>(null);
const objectUrl = ref<string | null>(null);

// Playback state
const isPlaying = ref(false);
const isPaused = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Computed
const progress = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

const formattedCurrentTime = computed(() => formatDuration(currentTime.value));
const formattedDuration = computed(() => formatDuration(duration.value));

/**
 * Initialize audio element with source
 */
function initializeAudio(): void {
  if (!audioElement.value) return;
  
  // Clean up previous object URL
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = null;
  }
  
  // Set source from blob or URL
  if (props.audioBlob) {
    objectUrl.value = URL.createObjectURL(props.audioBlob);
    audioElement.value.src = objectUrl.value;
  } else if (props.audioUrl) {
    audioElement.value.src = props.audioUrl;
  }
}

/**
 * Handle audio loaded metadata
 */
function handleLoadedMetadata(): void {
  if (audioElement.value) {
    duration.value = audioElement.value.duration;
    isLoading.value = false;
  }
}

/**
 * Handle time update
 */
function handleTimeUpdate(): void {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime;
  }
}

/**
 * Handle audio ended
 */
function handleEnded(): void {
  isPlaying.value = false;
  isPaused.value = false;
  currentTime.value = 0;
  emit('ended');
}

/**
 * Handle audio error
 */
function handleError(): void {
  error.value = 'Failed to load audio';
  isLoading.value = false;
  emit('error', new Error(error.value));
}

/**
 * Toggle play/pause
 */
async function togglePlayPause(): Promise<void> {
  if (!audioElement.value) return;
  
  try {
    if (isPlaying.value && !isPaused.value) {
      audioElement.value.pause();
      isPaused.value = true;
    } else {
      await audioElement.value.play();
      isPlaying.value = true;
      isPaused.value = false;
    }
  } catch (err) {
    error.value = 'Playback failed';
    emit('error', err as Error);
  }
}

/**
 * Stop playback
 */
function stop(): void {
  if (!audioElement.value) return;
  
  audioElement.value.pause();
  audioElement.value.currentTime = 0;
  isPlaying.value = false;
  isPaused.value = false;
  currentTime.value = 0;
}

/**
 * Seek to position
 */
function seek(event: Event): void {
  if (!audioElement.value) return;
  
  const input = event.target as HTMLInputElement;
  const seekTime = (parseFloat(input.value) / 100) * duration.value;
  audioElement.value.currentTime = seekTime;
  currentTime.value = seekTime;
}

/**
 * Skip forward 10 seconds
 */
function skipForward(): void {
  if (!audioElement.value) return;
  audioElement.value.currentTime = Math.min(
    audioElement.value.currentTime + 10,
    duration.value
  );
}

/**
 * Skip backward 10 seconds
 */
function skipBackward(): void {
  if (!audioElement.value) return;
  audioElement.value.currentTime = Math.max(
    audioElement.value.currentTime - 10,
    0
  );
}

// Watch for prop changes to reinitialize audio
watch(() => props.audioBlob, initializeAudio);
watch(() => props.audioUrl, initializeAudio);

// Cleanup on unmount
onUnmounted(() => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value);
  }
  if (audioElement.value) {
    audioElement.value.pause();
  }
});
</script>

<template>
  <div class="audio-player bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
    <!-- Hidden audio element -->
    <audio
      ref="audioElement"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="handleTimeUpdate"
      @ended="handleEnded"
      @error="handleError"
      preload="metadata"
    />
    
    <!-- Error state -->
    <div v-if="error" class="text-center text-red-600 dark:text-red-400 py-4">
      <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p>{{ error }}</p>
    </div>
    
    <!-- Player UI -->
    <div v-else>
      <!-- Progress bar -->
      <div class="mb-4">
        <input
          type="range"
          min="0"
          max="100"
          :value="progress"
          @input="seek"
          class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
        />
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{{ formattedCurrentTime }}</span>
          <span>{{ formattedDuration }}</span>
        </div>
      </div>
      
      <!-- Controls -->
      <div class="flex items-center justify-center gap-4">
        <!-- Skip back -->
        <button
          @click="skipBackward"
          class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Skip back 10 seconds"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>
        
        <!-- Play/Pause -->
        <button
          @click="togglePlayPause"
          class="p-4 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
          :aria-label="isPlaying && !isPaused ? 'Pause' : 'Play'"
        >
          <!-- Pause icon -->
          <svg v-if="isPlaying && !isPaused" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <!-- Play icon -->
          <svg v-else class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        
        <!-- Skip forward -->
        <button
          @click="skipForward"
          class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Skip forward 10 seconds"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
          </svg>
        </button>
        
        <!-- Stop/Close -->
        <button
          @click="() => { stop(); emit('close'); }"
          class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Close player"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom range input styling */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  border: none;
}
</style>
