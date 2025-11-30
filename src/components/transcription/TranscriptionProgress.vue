<script setup lang="ts">
/**
 * TranscriptionProgress - Shows transcription processing status
 * Displays processing spinner/animation, progress percentage, and status messages
 */

import { computed } from 'vue';
import ProgressBar from '@/components/common/ProgressBar.vue';

interface Props {
  /** Current processing stage */
  stage: 'converting' | 'transcribing' | 'complete';
  /** Progress percentage (0-100) */
  progress: number;
  /** Status message to display */
  message?: string;
  /** Whether to show the spinner animation */
  showSpinner?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  showSpinner: true
});

const defaultMessage = computed(() => {
  switch (props.stage) {
    case 'converting':
      return 'Converting audio format...';
    case 'transcribing':
      return 'Transcribing with AI...';
    case 'complete':
      return 'Transcription complete!';
    default:
      return 'Processing...';
  }
});

const displayMessage = computed(() => props.message || defaultMessage.value);

const stageIcon = computed(() => {
  switch (props.stage) {
    case 'converting':
      return 'audio';
    case 'transcribing':
      return 'ai';
    case 'complete':
      return 'check';
    default:
      return 'loading';
  }
});

const progressVariant = computed(() => {
  if (props.stage === 'complete') return 'success';
  return 'primary';
});
</script>

<template>
  <div class="flex flex-col items-center justify-center p-6 space-y-6">
    <!-- Animated processing indicator -->
    <div class="relative">
      <!-- Outer ring animation -->
      <div 
        v-if="stage !== 'complete'"
        class="absolute inset-0 rounded-full border-4 border-primary-200 dark:border-primary-800"
      />
      
      <!-- Spinning ring -->
      <div 
        v-if="stage !== 'complete' && showSpinner"
        class="w-24 h-24 rounded-full border-4 border-transparent border-t-primary-500 border-r-primary-500 animate-spin"
      />
      
      <!-- Success checkmark -->
      <div
        v-if="stage === 'complete'"
        class="w-24 h-24 rounded-full bg-success-100 dark:bg-success-900 flex items-center justify-center"
      >
        <svg 
          class="w-12 h-12 text-success-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="3" 
            d="M5 13l4 4L19 7" 
          />
        </svg>
      </div>
      
      <!-- Center icon -->
      <div 
        v-if="stage !== 'complete'"
        class="absolute inset-0 flex items-center justify-center"
      >
        <!-- Audio wave icon for converting -->
        <svg 
          v-if="stageIcon === 'audio'"
          class="w-10 h-10 text-primary-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" 
          />
        </svg>
        
        <!-- AI/Brain icon for transcribing -->
        <svg 
          v-else-if="stageIcon === 'ai'"
          class="w-10 h-10 text-primary-500 animate-pulse" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
          />
        </svg>
      </div>
    </div>

    <!-- Status message -->
    <div class="text-center space-y-2">
      <p class="text-lg font-medium text-gray-900 dark:text-white">
        {{ displayMessage }}
      </p>
      <p 
        v-if="stage !== 'complete'" 
        class="text-sm text-gray-500 dark:text-gray-400"
      >
        This may take a moment...
      </p>
    </div>

    <!-- Progress bar -->
    <div v-if="stage !== 'complete'" class="w-full max-w-xs">
      <ProgressBar
        :value="progress"
        :variant="progressVariant"
        :show-label="true"
        size="md"
      >
        <template #label>
          {{ stage === 'converting' ? 'Converting' : 'Transcribing' }}
        </template>
      </ProgressBar>
    </div>

    <!-- Stage indicator dots -->
    <div class="flex items-center space-x-2">
      <div 
        class="w-2 h-2 rounded-full transition-colors duration-300"
        :class="stage === 'converting' ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'"
      />
      <div 
        class="w-8 h-0.5 transition-colors duration-300"
        :class="stage !== 'converting' ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'"
      />
      <div 
        class="w-2 h-2 rounded-full transition-colors duration-300"
        :class="stage === 'transcribing' ? 'bg-primary-500' : stage === 'complete' ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'"
      />
      <div 
        class="w-8 h-0.5 transition-colors duration-300"
        :class="stage === 'complete' ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'"
      />
      <div 
        class="w-2 h-2 rounded-full transition-colors duration-300"
        :class="stage === 'complete' ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'"
      />
    </div>
  </div>
</template>
