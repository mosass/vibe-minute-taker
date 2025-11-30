<script setup lang="ts">
/**
 * MeetingCard - Single meeting preview card
 * 
 * Displays meeting title, date, duration, transcript preview.
 * Supports swipe-to-delete gesture on touch devices.
 */

import { ref, computed } from 'vue';
import type { MeetingStatus } from '@/types/meeting';
import { formatDateTime, formatDurationHuman, truncateText } from '@/utils/formatters';

interface Props {
  /** Meeting ID */
  id: string;
  /** Meeting title */
  title: string;
  /** Creation date */
  createdAt: Date;
  /** Duration in seconds */
  duration: number;
  /** Meeting status */
  status: MeetingStatus;
  /** Transcript preview text */
  transcriptPreview?: string;
}

const props = withDefaults(defineProps<Props>(), {
  transcriptPreview: ''
});

const emit = defineEmits<{
  /** Emitted when card is clicked */
  click: [id: string];
  /** Emitted when delete is triggered */
  delete: [id: string];
}>();

// Swipe-to-delete state
const touchStartX = ref(0);
const touchCurrentX = ref(0);
const isSwiping = ref(false);
const showDeleteButton = ref(false);

// Calculate swipe offset
const swipeOffset = computed(() => {
  if (!isSwiping.value) return showDeleteButton.value ? -80 : 0;
  const diff = touchCurrentX.value - touchStartX.value;
  // Only allow swiping left
  return Math.min(0, Math.max(-100, diff));
});

// Status indicator color
const statusColor = computed(() => {
  switch (props.status) {
    case 'recording':
      return 'bg-red-500';
    case 'transcribing':
      return 'bg-amber-500';
    case 'complete':
      return 'bg-green-500';
    case 'error':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
});

// Status text
const statusText = computed(() => {
  switch (props.status) {
    case 'recording':
      return 'Recording';
    case 'transcribing':
      return 'Transcribing';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
});

// Handle touch start
function handleTouchStart(event: TouchEvent) {
  const touch = event.touches[0];
  if (touch) {
    touchStartX.value = touch.clientX;
    touchCurrentX.value = touch.clientX;
    isSwiping.value = true;
  }
}

// Handle touch move
function handleTouchMove(event: TouchEvent) {
  if (!isSwiping.value) return;
  const touch = event.touches[0];
  if (touch) {
    touchCurrentX.value = touch.clientX;
  }
}

// Handle touch end
function handleTouchEnd() {
  if (!isSwiping.value) return;
  
  const diff = touchCurrentX.value - touchStartX.value;
  
  // If swiped left more than 50px, show delete button
  if (diff < -50) {
    showDeleteButton.value = true;
  } else if (diff > 30) {
    // If swiped right, hide delete button
    showDeleteButton.value = false;
  }
  
  isSwiping.value = false;
}

// Handle card click
function handleClick() {
  if (showDeleteButton.value) {
    // Close the delete button if open
    showDeleteButton.value = false;
    return;
  }
  emit('click', props.id);
}

// Handle delete
function handleDelete() {
  emit('delete', props.id);
  showDeleteButton.value = false;
}
</script>

<template>
  <div class="relative overflow-hidden rounded-lg">
    <!-- Delete button (revealed by swipe) -->
    <div 
      class="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white"
      :class="showDeleteButton ? 'w-20' : 'w-0'"
      style="transition: width 0.2s ease-out;"
    >
      <button 
        @click="handleDelete"
        class="flex flex-col items-center justify-center w-full h-full"
        aria-label="Delete meeting"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span class="text-xs mt-1">Delete</span>
      </button>
    </div>

    <!-- Card content -->
    <div 
      @click="handleClick"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      class="bg-white dark:bg-gray-800 p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-750 relative"
      :style="{ transform: `translateX(${swipeOffset}px)`, transition: isSwiping ? 'none' : 'transform 0.2s ease-out' }"
    >
      <!-- Top row: Title and status -->
      <div class="flex items-start justify-between gap-3 mb-2">
        <h3 class="font-medium text-gray-900 dark:text-white line-clamp-1 flex-1">
          {{ title }}
        </h3>
        
        <!-- Status indicator -->
        <div class="flex items-center gap-1.5 shrink-0">
          <span 
            class="w-2 h-2 rounded-full"
            :class="statusColor"
            :aria-label="statusText"
          ></span>
          <span 
            v-if="status !== 'complete'" 
            class="text-xs text-gray-500 dark:text-gray-400"
          >
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- Middle row: Date and duration -->
      <div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
        <span>{{ formatDateTime(new Date(createdAt)) }}</span>
        <span class="text-gray-300 dark:text-gray-600">•</span>
        <span>{{ formatDurationHuman(duration) }}</span>
      </div>

      <!-- Bottom row: Transcript preview -->
      <p 
        v-if="transcriptPreview"
        class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2"
      >
        {{ truncateText(transcriptPreview, 100) }}
      </p>
      <p 
        v-else
        class="text-sm text-gray-400 dark:text-gray-500 italic"
      >
        No transcript available
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Ensure line clamping works */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Custom hover state for dark mode */
.dark .hover\:bg-gray-750:hover {
  background-color: rgb(40, 44, 52);
}
</style>
