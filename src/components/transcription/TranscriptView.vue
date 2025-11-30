<script setup lang="ts">
/**
 * TranscriptView - Displays transcript text with timestamps
 * Shows transcript segments in a scrollable container
 */

import { computed } from 'vue';
import type { TranscriptionSegment } from '@/types/transcription';
import { formatDuration } from '@/utils/formatters';

interface Props {
  /** Full transcript text */
  text: string;
  /** Timestamped segments */
  segments?: TranscriptionSegment[];
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Whether the transcript is editable */
  editable?: boolean;
  /** Maximum height for scrollable container (CSS value) */
  maxHeight?: string;
  /** Whether to show segment separators */
  showSeparators?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  segments: () => [],
  showTimestamps: true,
  editable: false,
  maxHeight: '400px',
  showSeparators: false
});

const emit = defineEmits<{
  /** Emitted when text is edited */
  update: [text: string];
  /** Emitted when a segment is clicked */
  segmentClick: [segment: TranscriptionSegment];
}>();

const hasSegments = computed(() => props.segments.length > 0);

/**
 * Format a timestamp for display
 */
function formatTimestamp(seconds: number): string {
  return formatDuration(Math.floor(seconds));
}

/**
 * Handle segment click
 */
function handleSegmentClick(segment: TranscriptionSegment): void {
  emit('segmentClick', segment);
}
</script>

<template>
  <div class="transcript-view">
    <!-- Segmented view with timestamps -->
    <div 
      v-if="hasSegments && showTimestamps"
      class="overflow-y-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      :style="{ maxHeight }"
    >
      <div class="divide-y divide-gray-100 dark:divide-gray-700">
        <div
          v-for="segment in segments"
          :key="segment.id"
          class="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
          :class="{ 'border-b border-gray-200 dark:border-gray-700': showSeparators }"
          @click="handleSegmentClick(segment)"
        >
          <div class="flex items-start gap-3">
            <!-- Timestamp badge -->
            <div class="shrink-0">
              <span 
                class="inline-flex items-center px-2 py-1 rounded-md text-xs font-mono 
                       bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                {{ formatTimestamp(segment.start) }}
              </span>
            </div>
            
            <!-- Segment text -->
            <div class="flex-1 min-w-0">
              <p class="text-gray-900 dark:text-white leading-relaxed">
                {{ segment.text }}
              </p>
              
              <!-- Confidence indicator (if available) -->
              <div 
                v-if="segment.confidence !== undefined" 
                class="mt-1 flex items-center gap-1"
              >
                <div 
                  class="h-1 w-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
                >
                  <div 
                    class="h-full rounded-full transition-all"
                    :class="[
                      segment.confidence > 0.8 ? 'bg-success-500' : 
                      segment.confidence > 0.5 ? 'bg-warning-500' : 'bg-recording-500'
                    ]"
                    :style="{ width: `${segment.confidence * 100}%` }"
                  />
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-500">
                  {{ Math.round(segment.confidence * 100) }}%
                </span>
              </div>
            </div>
            
            <!-- Duration badge -->
            <div class="shrink-0 hidden sm:block">
              <span 
                class="text-xs text-gray-400 dark:text-gray-500"
              >
                {{ formatTimestamp(segment.end - segment.start) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Simple text view (no segments or timestamps disabled) -->
    <div 
      v-else
      class="overflow-y-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      :style="{ maxHeight }"
    >
      <div class="p-4">
        <!-- Editable textarea -->
        <textarea
          v-if="editable"
          :value="text"
          class="w-full min-h-[200px] p-0 border-0 bg-transparent text-gray-900 dark:text-white 
                 leading-relaxed resize-none focus:ring-0 focus:outline-none"
          placeholder="Transcript will appear here..."
          @input="emit('update', ($event.target as HTMLTextAreaElement).value)"
        />
        
        <!-- Read-only text -->
        <p 
          v-else
          class="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap"
        >
          {{ text || 'No transcript available.' }}
        </p>
      </div>
    </div>

    <!-- Word count footer -->
    <div 
      v-if="text"
      class="mt-2 text-right"
    >
      <span class="text-xs text-gray-500 dark:text-gray-500">
        {{ text.split(/\s+/).filter(Boolean).length }} words
        <span v-if="segments.length > 0">
          · {{ segments.length }} segments
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for transcript */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.dark .overflow-y-auto {
  scrollbar-color: #4b5563 transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #4b5563;
}
</style>
