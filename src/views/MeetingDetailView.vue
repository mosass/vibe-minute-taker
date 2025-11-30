<script setup lang="ts">
/**
 * MeetingDetailView - Single meeting view with transcript
 * 
 * Shows full meeting details, transcript, and playback controls.
 */

import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMeetings } from '@/composables/useMeetings';
import MeetingDetail from '@/components/meetings/MeetingDetail.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import type { Meeting } from '@/types/meeting';

const route = useRoute();
const router = useRouter();
const { getMeetingById, updateTitle, updateTranscript, removeMeeting, isLoading, error } = useMeetings();

// Local state
const meeting = ref<Meeting | null>(null);
const isSaving = ref(false);
const notFound = ref(false);

// Get meeting ID from route
const meetingId = route.params.id as string;

// Load meeting on mount
async function loadMeeting(id: string) {
  notFound.value = false;
  const result = await getMeetingById(id);
  
  if (result) {
    meeting.value = result;
  } else {
    notFound.value = true;
  }
}

onMounted(() => {
  loadMeeting(meetingId);
});

// Watch for route changes (e.g., navigating between meetings)
watch(() => route.params.id, (newId) => {
  if (newId && newId !== meeting.value?.id) {
    loadMeeting(newId as string);
  }
});

// Handle title update
async function handleTitleUpdate(title: string) {
  if (!meeting.value) return;
  
  isSaving.value = true;
  const success = await updateTitle(meeting.value.id, title);
  isSaving.value = false;
  
  if (success && meeting.value) {
    meeting.value = { ...meeting.value, title, updatedAt: new Date() };
  }
}

// Handle transcript update
async function handleTranscriptUpdate(transcript: string) {
  if (!meeting.value) return;
  
  isSaving.value = true;
  const success = await updateTranscript(meeting.value.id, transcript);
  isSaving.value = false;
  
  if (success && meeting.value) {
    meeting.value = { ...meeting.value, transcript, updatedAt: new Date() };
  }
}

// Handle delete
async function handleDelete() {
  if (!meeting.value) return;
  
  const success = await removeMeeting(meeting.value.id);
  
  if (success) {
    // Navigate back to meetings list
    router.push('/meetings');
  } else {
    // Could show an error toast here
    console.error('Failed to delete meeting');
  }
}

// Handle play audio (placeholder - will be implemented in Phase 8)
function handlePlayAudio() {
  // TODO: Implement audio playback in Phase 8
  console.log('Play audio for meeting:', meeting.value?.id);
  alert('Audio playback will be available soon!');
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Loading state -->
    <div 
      v-if="isLoading && !meeting" 
      class="flex-1 flex items-center justify-center"
    >
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Not found state -->
    <EmptyState
      v-else-if="notFound"
      icon="document"
      title="Meeting not found"
      description="This meeting may have been deleted or doesn't exist."
      size="lg"
    >
      <template #action>
        <button
          @click="router.push('/meetings')"
          class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Back to Meetings
        </button>
      </template>
    </EmptyState>

    <!-- Error state -->
    <EmptyState
      v-else-if="error"
      icon="generic"
      title="Something went wrong"
      :description="error.message"
      size="lg"
    >
      <template #action>
        <button
          @click="loadMeeting(meetingId)"
          class="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </template>
    </EmptyState>

    <!-- Meeting detail -->
    <MeetingDetail
      v-else-if="meeting"
      :meeting="meeting"
      :is-saving="isSaving"
      @update:title="handleTitleUpdate"
      @update:transcript="handleTranscriptUpdate"
      @delete="handleDelete"
      @play-audio="handlePlayAudio"
    />
  </div>
</template>
