<script setup lang="ts">
/**
 * MeetingList - List of meeting cards
 * 
 * Displays a list of MeetingCard components with empty state and loading state.
 */

import { computed } from 'vue';
import type { MeetingListItem } from '@/types/meeting';
import MeetingCard from './MeetingCard.vue';
import EmptyState from '@/components/common/EmptyState.vue';

interface Props {
  /** List of meetings to display */
  meetings: MeetingListItem[];
  /** Whether the list is loading */
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
});

const emit = defineEmits<{
  /** Emitted when a meeting card is clicked */
  select: [id: string];
  /** Emitted when delete is triggered on a meeting */
  delete: [id: string];
}>();

// Check if list is empty
const isEmpty = computed(() => props.meetings.length === 0);

// Handle meeting selection
function handleMeetingClick(id: string) {
  emit('select', id);
}

// Handle meeting deletion
function handleMeetingDelete(id: string) {
  emit('delete', id);
}
</script>

<template>
  <div class="flex-1 flex flex-col">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-3 p-4">
      <div 
        v-for="i in 3" 
        :key="i"
        class="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse"
      >
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div class="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div class="flex items-center gap-3 mb-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
        <div class="space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState 
      v-else-if="isEmpty"
      icon="microphone"
      title="No meetings yet"
      description="Record your first meeting to get started. Tap the record button on the Home tab."
      size="lg"
    />

    <!-- Meeting list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div class="space-y-2 p-4">
        <MeetingCard
          v-for="meeting in meetings"
          :key="meeting.id"
          :id="meeting.id"
          :title="meeting.title"
          :created-at="meeting.createdAt"
          :duration="meeting.duration"
          :status="meeting.status"
          :transcript-preview="meeting.transcriptPreview"
          @click="handleMeetingClick"
          @delete="handleMeetingDelete"
        />
      </div>
    </div>
  </div>
</template>
