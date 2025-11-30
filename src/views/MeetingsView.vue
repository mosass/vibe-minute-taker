<script setup lang="ts">
/**
 * MeetingsView - List of all saved meetings
 * 
 * Displays meeting history with search and filter capabilities.
 */

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSharedMeetings } from '@/composables/useMeetings';
import MeetingList from '@/components/meetings/MeetingList.vue';

const router = useRouter();
const { meetings, meetingsAsListItems, isLoading, loadMeetings, removeMeeting } = useSharedMeetings();

// Delete confirmation state
const deletingId = ref<string | null>(null);

// Load meetings on mount
onMounted(async () => {
  await loadMeetings();
});

// Navigate to meeting detail
function handleSelect(id: string) {
  router.push(`/meetings/${id}`);
}

// Handle delete request
async function handleDelete(id: string) {
  deletingId.value = id;
  const success = await removeMeeting(id);
  deletingId.value = null;
  
  if (!success) {
    // Could show an error toast here
    console.error('Failed to delete meeting');
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Header section -->
    <div class="px-4 pt-4 pb-2">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Your Meetings
          </h1>
          <p 
            v-if="meetings.length > 0" 
            class="text-sm text-gray-500 dark:text-gray-400 mt-1"
          >
            {{ meetings.length }} meeting{{ meetings.length === 1 ? '' : 's' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Meeting list -->
    <MeetingList
      :meetings="meetingsAsListItems"
      :is-loading="isLoading"
      @select="handleSelect"
      @delete="handleDelete"
    />
  </div>
</template>
