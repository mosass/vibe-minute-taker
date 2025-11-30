<script setup lang="ts">
/**
 * MeetingDetailSkeleton - Loading skeleton for meeting detail view
 * 
 * Displays animated placeholder content while loading meeting details.
 */
</script>

<template>
  <div class="meeting-detail-skeleton flex flex-col h-full animate-pulse">
    <!-- Header skeleton -->
    <div class="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
      <!-- Title row -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </div>

      <!-- Meta row -->
      <div class="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4">
        <div class="flex items-center gap-1.5">
          <div class="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2">
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-28"></div>
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-10 ml-auto"></div>
      </div>
    </div>

    <!-- Transcript skeleton -->
    <div class="flex-1 p-4">
      <!-- Section header -->
      <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
      
      <!-- Transcript lines -->
      <div class="space-y-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    </div>
  </div>
</template>
