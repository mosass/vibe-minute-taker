<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- App Header will be added in Phase 2 -->
    <header class="safe-area-top bg-primary-500 text-white">
      <div class="px-4 py-3 flex items-center justify-between">
        <h1 class="text-lg font-semibold">Minute Taker</h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col">
      <RouterView />
    </main>

    <!-- Bottom Navigation will be added in Phase 2 -->
    <nav class="safe-area-bottom bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div class="flex justify-around py-2">
        <RouterLink 
          to="/" 
          class="flex flex-col items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-primary-500"
          active-class="text-primary-500"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span class="text-xs mt-1">Record</span>
        </RouterLink>
        <RouterLink 
          to="/meetings" 
          class="flex flex-col items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-primary-500"
          active-class="text-primary-500"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-xs mt-1">Meetings</span>
        </RouterLink>
        <RouterLink 
          to="/settings" 
          class="flex flex-col items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-primary-500"
          active-class="text-primary-500"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-xs mt-1">Settings</span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>
