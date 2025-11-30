<script setup lang="ts">
/**
 * MeetingDetail - Full meeting view with transcript
 * 
 * Shows meeting header, full transcript, edit mode toggle,
 * delete confirmation, and audio playback button.
 */

import { ref, computed } from 'vue';
import type { Meeting } from '@/types/meeting';
import { formatDateTime, formatDurationHuman } from '@/utils/formatters';
import TranscriptEditor from '@/components/transcription/TranscriptEditor.vue';
import TranscriptView from '@/components/transcription/TranscriptView.vue';

interface Props {
  /** The meeting to display */
  meeting: Meeting;
  /** Whether the meeting is being saved */
  isSaving?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSaving: false
});

const emit = defineEmits<{
  /** Emitted when title is updated */
  'update:title': [title: string];
  /** Emitted when transcript is updated */
  'update:transcript': [transcript: string];
  /** Emitted when delete is requested */
  delete: [];
  /** Emitted when play audio is requested */
  playAudio: [];
}>();

// Local state
const isEditMode = ref(false);
const showDeleteConfirm = ref(false);
const editedTitle = ref(props.meeting.title);

// Status indicator color
const statusColor = computed(() => {
  switch (props.meeting.status) {
    case 'recording':
      return 'bg-red-500';
    case 'transcribing':
      return 'bg-amber-500 animate-pulse';
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
  switch (props.meeting.status) {
    case 'recording':
      return 'Recording in progress';
    case 'transcribing':
      return 'Transcription in progress';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error occurred';
    default:
      return 'Unknown';
  }
});

// Can edit (only if complete)
const canEdit = computed(() => props.meeting.status === 'complete');

// Has audio file
const hasAudio = computed(() => !!props.meeting.audioFileId);

// Toggle edit mode
function toggleEditMode() {
  if (!canEdit.value) return;
  
  if (isEditMode.value) {
    // Save title if changed
    if (editedTitle.value !== props.meeting.title) {
      emit('update:title', editedTitle.value);
    }
  }
  
  isEditMode.value = !isEditMode.value;
}

// Handle transcript save
function handleTranscriptSave(transcript: string) {
  emit('update:transcript', transcript);
}

// Handle title input
function handleTitleInput(event: Event) {
  editedTitle.value = (event.target as HTMLInputElement).value;
}

// Handle title blur
function handleTitleBlur() {
  if (editedTitle.value !== props.meeting.title) {
    emit('update:title', editedTitle.value);
  }
}

// Show delete confirmation
function confirmDelete() {
  showDeleteConfirm.value = true;
}

// Cancel delete
function cancelDelete() {
  showDeleteConfirm.value = false;
}

// Confirm delete
function handleDelete() {
  showDeleteConfirm.value = false;
  emit('delete');
}

// Play audio
function handlePlayAudio() {
  emit('playAudio');
}
</script>

<template>
  <div class="meeting-detail flex flex-col h-full">
    <!-- Meeting header -->
    <div class="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
      <!-- Title row -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex-1">
          <!-- Editable title -->
          <input
            v-if="isEditMode"
            :value="editedTitle"
            @input="handleTitleInput"
            @blur="handleTitleBlur"
            class="w-full text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-primary-500 focus:outline-none pb-1"
            placeholder="Meeting title"
          />
          <!-- Display title -->
          <h1 
            v-else
            class="text-xl font-semibold text-gray-900 dark:text-white"
          >
            {{ meeting.title }}
          </h1>
        </div>
        
        <!-- Status badge -->
        <div class="flex items-center gap-2 shrink-0">
          <span 
            class="w-2.5 h-2.5 rounded-full"
            :class="statusColor"
          ></span>
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- Meta row -->
      <div class="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
        <div class="flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{{ formatDateTime(new Date(meeting.createdAt)) }}</span>
        </div>
        
        <div class="flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ formatDurationHuman(meeting.duration) }}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2 mt-4">
        <!-- Play audio button -->
        <button
          v-if="hasAudio"
          @click="handlePlayAudio"
          class="flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Play Audio</span>
        </button>
        
        <!-- Edit toggle button -->
        <button
          v-if="canEdit"
          @click="toggleEditMode"
          class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          :class="isEditMode 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
        >
          <svg v-if="!isEditMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ isEditMode ? 'Done' : 'Edit' }}</span>
        </button>
        
        <!-- Delete button -->
        <button
          @click="confirmDelete"
          class="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors ml-auto"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span class="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>

    <!-- Transcript section -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white">
          Transcript
        </h2>
        
        <!-- Saving indicator -->
        <div 
          v-if="isSaving"
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        >
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        </div>
      </div>

      <!-- Editor mode -->
      <TranscriptEditor
        v-if="isEditMode"
        :model-value="meeting.transcript"
        @save="handleTranscriptSave"
        min-height="300px"
        max-height="none"
      />
      
      <!-- View mode -->
      <TranscriptView
        v-else
        :text="meeting.transcript"
        :segments="meeting.segments"
        :show-timestamps="meeting.segments.length > 0"
        max-height="none"
      />
    </div>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div 
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="cancelDelete"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
          <div class="text-center">
            <!-- Warning icon -->
            <div class="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Meeting?
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-6">
              This will permanently delete the meeting and its audio recording. This action cannot be undone.
            </p>
            
            <!-- Actions -->
            <div class="flex gap-3">
              <button
                @click="cancelDelete"
                class="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                @click="handleDelete"
                class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
