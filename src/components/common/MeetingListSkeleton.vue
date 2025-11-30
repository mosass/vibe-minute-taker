<script setup lang="ts">
/**
 * MeetingListSkeleton - Loading skeleton for meeting list
 * 
 * Displays animated placeholder cards while loading meetings.
 */

interface Props {
  /** Number of skeleton cards to show */
  count?: number;
}

withDefaults(defineProps<Props>(), {
  count: 3
});
</script>

<template>
  <div class="space-y-3 p-4">
    <div 
      v-for="i in count" 
      :key="i"
      class="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse"
    >
      <!-- Title row -->
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        <div class="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
      
      <!-- Meta row -->
      <div class="flex items-center gap-3 mb-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
      
      <!-- Transcript preview -->
      <div class="space-y-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
      </div>
    </div>
  </div>
</template>
