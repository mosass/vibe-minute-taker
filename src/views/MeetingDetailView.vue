<script setup lang="ts">
import { useRoute } from 'vue-router';

/**
 * MeetingDetailView - Single meeting view with transcript
 * 
 * Shows full meeting details, transcript, and playback controls.
 */

const route = useRoute();
const meetingId = route.params.id as string;
</script>

<template>
  <div class="flex-1 flex flex-col p-4">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
      Meeting Details
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Meeting ID: {{ meetingId }}
    </p>
    <!-- Meeting detail components will be added in Phase 4 -->
  </div>
</template>
