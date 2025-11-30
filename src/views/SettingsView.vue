<script setup lang="ts">
/**
 * SettingsView - App settings and configuration
 * 
 * Includes model status, storage usage, and PWA install options.
 */
</script>

<template>
  <div class="flex-1 flex flex-col p-4">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
      Settings
    </h1>
    <div class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h2 class="font-semibold text-gray-900 dark:text-white mb-2">AI Model</h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          Model status and download options will appear here.
        </p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h2 class="font-semibold text-gray-900 dark:text-white mb-2">Storage</h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          Storage usage information will appear here.
        </p>
      </div>
    </div>
    <!-- Settings components will be added in Phase 5 -->
  </div>
</template>
