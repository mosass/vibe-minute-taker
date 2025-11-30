<script setup lang="ts">
/**
 * RecordingTimer - Elapsed time display with recording indicator
 * Shows MM:SS or HH:MM:SS format with pulsing recording dot
 */

import { computed } from 'vue';

interface Props {
  /** Elapsed time in seconds */
  seconds: number;
  /** Whether currently recording (shows pulsing indicator) */
  isRecording?: boolean;
  /** Whether paused (shows different indicator style) */
  isPaused?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  isRecording: false,
  isPaused: false,
  size: 'md'
});

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
const formattedTime = computed(() => {
  const totalSeconds = Math.floor(props.seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return { text: 'text-xl', dot: 'w-2 h-2' };
    case 'lg': return { text: 'text-5xl', dot: 'w-4 h-4' };
    default: return { text: 'text-3xl', dot: 'w-3 h-3' };
  }
});

const indicatorClasses = computed(() => {
  const base = `${sizeClasses.value.dot} rounded-full`;
  
  if (props.isPaused) {
    return `${base} bg-warning`;
  }
  
  if (props.isRecording) {
    return `${base} bg-recording animate-pulse`;
  }
  
  return `${base} bg-gray-400 dark:bg-gray-500`;
});
</script>

<template>
  <div 
    class="flex items-center justify-center gap-3"
    role="timer"
    :aria-label="`Recording time: ${formattedTime}`"
  >
    <!-- Recording indicator dot -->
    <span 
      :class="indicatorClasses"
      :aria-hidden="true"
    />
    
    <!-- Time display -->
    <span 
      :class="sizeClasses.text"
      class="font-mono font-semibold text-gray-900 dark:text-white tabular-nums tracking-wide"
    >
      {{ formattedTime }}
    </span>
    
    <!-- Paused indicator text -->
    <span
      v-if="isPaused"
      class="text-sm font-medium text-warning uppercase tracking-wide"
    >
      Paused
    </span>
  </div>
</template>

<style scoped>
/* Ensure numbers don't shift when changing */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
