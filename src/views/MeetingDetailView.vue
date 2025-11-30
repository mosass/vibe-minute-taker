<script setup lang="ts">
/**
 * MeetingDetailView - Single meeting view with transcript
 * 
 * Shows full meeting details, transcript, and playback controls.
 */

import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMeetings } from '@/composables/useMeetings';
import { useToast } from '@/composables/useToast';
import { readAudioFile } from '@/services/opfs.service';
import MeetingDetail from '@/components/meetings/MeetingDetail.vue';
import MeetingDetailSkeleton from '@/components/common/MeetingDetailSkeleton.vue';
import AudioPlayer from '@/components/common/AudioPlayer.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import type { Meeting } from '@/types/meeting';

const route = useRoute();
const router = useRouter();
const { getMeetingById, updateTitle, updateTranscript, removeMeeting, isLoading, error } = useMeetings();
const toast = useToast();

// Local state
const meeting = ref<Meeting | null>(null);
const isSaving = ref(false);
const notFound = ref(false);

// Audio playback state
const showAudioPlayer = ref(false);
const audioBlob = ref<Blob | null>(null);
const isLoadingAudio = ref(false);

// Get meeting ID from route
const meetingId = route.params.id as string;

// Load meeting on mount
async function loadMeeting(id: string) {
  notFound.value = false;
  showAudioPlayer.value = false;
  audioBlob.value = null;
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
    toast.success('Title updated');
  } else {
    toast.error('Failed to update title');
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
    toast.success('Transcript saved');
  } else {
    toast.error('Failed to save transcript');
  }
}

// Handle delete
async function handleDelete() {
  if (!meeting.value) return;
  
  const success = await removeMeeting(meeting.value.id);
  
  if (success) {
    toast.success('Meeting deleted');
    // Navigate back to meetings list
    router.push('/meetings');
  } else {
    toast.error('Failed to delete meeting');
  }
}

// Handle play audio
async function handlePlayAudio() {
  if (!meeting.value?.audioFileId) {
    toast.error('No audio file available');
    return;
  }
  
  // If already loaded, just show the player
  if (audioBlob.value) {
    showAudioPlayer.value = true;
    return;
  }
  
  isLoadingAudio.value = true;
  
  try {
    const blob = await readAudioFile(meeting.value.audioFileId);
    if (blob) {
      audioBlob.value = blob;
      showAudioPlayer.value = true;
    } else {
      toast.error('Audio file not found');
    }
  } catch (err) {
    console.error('Failed to load audio:', err);
    toast.error('Failed to load audio file');
  } finally {
    isLoadingAudio.value = false;
  }
}

// Handle audio player close
function handleAudioPlayerClose() {
  showAudioPlayer.value = false;
}

// Handle audio player error
function handleAudioError(err: Error) {
  console.error('Audio playback error:', err);
  toast.error('Audio playback failed');
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Loading skeleton -->
    <MeetingDetailSkeleton v-if="isLoading && !meeting" />

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

    <!-- Audio player overlay -->
    <Teleport to="body">
      <div 
        v-if="showAudioPlayer && audioBlob"
        class="fixed inset-x-0 bottom-0 z-50 p-4 pb-20 bg-black/50"
        @click.self="handleAudioPlayerClose"
      >
        <AudioPlayer
          :audio-blob="audioBlob"
          @close="handleAudioPlayerClose"
          @error="handleAudioError"
        />
      </div>
    </Teleport>

    <!-- Loading audio indicator -->
    <div 
      v-if="isLoadingAudio"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
        <svg class="w-6 h-6 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-gray-700 dark:text-gray-300">Loading audio...</span>
      </div>
    </div>
  </div>
</template>
