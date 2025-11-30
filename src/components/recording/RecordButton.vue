<script setup lang="ts">
/**
 * RecordButton - Large FAB-style record button
 * Visual states: idle, recording, processing
 */

import { computed } from 'vue';
import { MicrophoneIcon, StopIcon } from '@heroicons/vue/24/solid';

type ButtonState = 'idle' | 'recording' | 'processing';

interface Props {
  /** Current state of the record button */
  state?: ButtonState;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  state: 'idle',
  disabled: false,
  size: 'lg'
});

const emit = defineEmits<{
  /** Emitted when button is clicked in idle state */
  start: [];
  /** Emitted when button is clicked in recording state */
  stop: [];
}>();

const isIdle = computed(() => props.state === 'idle');
const isRecording = computed(() => props.state === 'recording');
const isProcessing = computed(() => props.state === 'processing');

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-16 h-16';
    case 'md': return 'w-20 h-20';
    default: return 'w-24 h-24';
  }
});

const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-8 h-8';
    case 'md': return 'w-10 h-10';
    default: return 'w-12 h-12';
  }
});

const buttonClasses = computed(() => {
  const base = 'rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4';
  
  if (props.disabled) {
    return `${base} bg-gray-300 dark:bg-gray-600 cursor-not-allowed`;
  }
  
  if (isRecording.value) {
    return `${base} bg-recording dark:bg-recording-dark hover:bg-recording-dark shadow-lg shadow-recording/50 animate-pulse-slow`;
  }
  
  if (isProcessing.value) {
    return `${base} bg-primary-500 dark:bg-primary-600 cursor-wait`;
  }
  
  // Idle state
  return `${base} bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 shadow-lg hover:shadow-xl focus:ring-primary-300 dark:focus:ring-primary-800`;
});

const handleClick = () => {
  if (props.disabled || isProcessing.value) return;
  
  if (isIdle.value) {
    emit('start');
  } else if (isRecording.value) {
    emit('stop');
  }
};

const ariaLabel = computed(() => {
  if (isProcessing.value) return 'Processing...';
  if (isRecording.value) return 'Stop recording';
  return 'Start recording';
});
</script>

<template>
  <button
    type="button"
    :class="[sizeClasses, buttonClasses]"
    :disabled="disabled || isProcessing"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <!-- Processing spinner -->
    <svg
      v-if="isProcessing"
      :class="iconSizeClasses"
      class="animate-spin text-white"
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

    <!-- Stop icon when recording -->
    <StopIcon
      v-else-if="isRecording"
      :class="iconSizeClasses"
      class="text-white"
    />

    <!-- Microphone icon when idle -->
    <MicrophoneIcon
      v-else
      :class="iconSizeClasses"
      class="text-white"
    />

    <!-- Pulsing ring effect when recording -->
    <span
      v-if="isRecording"
      class="absolute inset-0 rounded-full animate-ping-slow bg-recording opacity-20"
    />
  </button>
</template>

<style scoped>
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

@keyframes ping-slow {
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  75%, 100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-ping-slow {
  animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

button {
  position: relative;
}
</style>
