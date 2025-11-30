<script setup lang="ts">
/**
 * MeetingList - List of meeting cards
 * 
 * Displays a list of MeetingCard components with empty state and loading state.
 */

import { computed } from 'vue';
import type { MeetingListItem } from '@/types/meeting';
import MeetingCard from './MeetingCard.vue';
import MeetingListSkeleton from '@/components/common/MeetingListSkeleton.vue';
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
    <MeetingListSkeleton v-if="isLoading" :count="3" />

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
