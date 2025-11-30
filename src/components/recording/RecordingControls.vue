<script setup lang="ts">
/**
 * RecordingControls - Pause/resume, stop, and cancel buttons
 * Control buttons displayed during active recording
 */

import { computed } from 'vue';
import { 
  PauseIcon, 
  PlayIcon, 
  StopIcon, 
  XMarkIcon 
} from '@heroicons/vue/24/solid';

interface Props {
  /** Whether recording is currently paused */
  isPaused?: boolean;
  /** Whether stop is in progress (disables buttons) */
  isProcessing?: boolean;
  /** Show cancel button */
  showCancel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  isPaused: false,
  isProcessing: false,
  showCancel: true,
  size: 'md'
});

const emit = defineEmits<{
  /** Pause recording */
  pause: [];
  /** Resume recording */
  resume: [];
  /** Stop and save recording */
  stop: [];
  /** Cancel recording without saving */
  cancel: [];
}>();

const buttonSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-10 h-10';
    case 'lg': return 'w-14 h-14';
    default: return 'w-12 h-12';
  }
});

const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-5 h-5';
    case 'lg': return 'w-7 h-7';
    default: return 'w-6 h-6';
  }
});

const baseButtonClasses = 'rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

const handlePauseResume = () => {
  if (props.isProcessing) return;
  if (props.isPaused) {
    emit('resume');
  } else {
    emit('pause');
  }
};

const handleStop = () => {
  if (props.isProcessing) return;
  emit('stop');
};

const handleCancel = () => {
  if (props.isProcessing) return;
  emit('cancel');
};
</script>

<template>
  <div 
    class="flex items-center justify-center gap-4"
    role="group"
    aria-label="Recording controls"
  >
    <!-- Cancel button -->
    <button
      v-if="showCancel"
      type="button"
      :class="[buttonSizeClasses, baseButtonClasses]"
      class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 focus:ring-gray-400"
      :disabled="isProcessing"
      aria-label="Cancel recording"
      @click="handleCancel"
    >
      <XMarkIcon :class="iconSizeClasses" />
    </button>

    <!-- Pause/Resume button -->
    <button
      type="button"
      :class="[buttonSizeClasses, baseButtonClasses]"
      class="bg-warning hover:bg-warning-dark text-white focus:ring-warning"
      :disabled="isProcessing"
      :aria-label="isPaused ? 'Resume recording' : 'Pause recording'"
      @click="handlePauseResume"
    >
      <!-- Show play icon when paused, pause icon when recording -->
      <PlayIcon v-if="isPaused" :class="iconSizeClasses" />
      <PauseIcon v-else :class="iconSizeClasses" />
    </button>

    <!-- Stop button -->
    <button
      type="button"
      :class="[buttonSizeClasses, baseButtonClasses]"
      class="bg-recording hover:bg-recording-dark text-white focus:ring-recording shadow-md"
      :disabled="isProcessing"
      aria-label="Stop recording"
      @click="handleStop"
    >
      <template v-if="isProcessing">
        <!-- Spinner when processing -->
        <svg
          :class="iconSizeClasses"
          class="animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </template>
      <StopIcon v-else :class="iconSizeClasses" />
    </button>
  </div>
</template>
