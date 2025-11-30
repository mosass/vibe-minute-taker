<script setup lang="ts">
/**
 * InstallPrompt Component
 * 
 * Displays a banner prompting the user to install the PWA.
 * Shows only on supported browsers when install prompt is available.
 * Can be dismissed and remembers the user's preference.
 */

import { computed } from 'vue';
import { useInstallPrompt } from '@/composables/useInstallPrompt';

interface Props {
  /** Whether to show in a compact card style vs full banner */
  variant?: 'banner' | 'card';
}

withDefaults(defineProps<Props>(), {
  variant: 'banner'
});

const emit = defineEmits<{
  installed: [];
  dismissed: [];
}>();

const {
  installState,
  isInstalled,
  canPrompt,
  promptInstall,
  dismissPrompt
} = useInstallPrompt();

/**
 * Whether the prompt should be shown
 */
const showPrompt = computed(() => {
  return canPrompt.value && !isInstalled.value && installState.value === 'available';
});

/**
 * Handle install button click
 */
async function handleInstall(): Promise<void> {
  const success = await promptInstall();
  if (success) {
    emit('installed');
  }
}

/**
 * Handle dismiss button click
 */
function handleDismiss(): void {
  dismissPrompt();
  emit('dismissed');
}
</script>

<template>
  <!-- Banner variant (full width, fixed at bottom or inline) -->
  <div 
    v-if="showPrompt && variant === 'banner'"
    class="bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-lg"
    role="alert"
    aria-live="polite"
  >
    <div class="px-4 py-3 flex items-center gap-3">
      <!-- Icon -->
      <div class="shrink-0">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </div>
      
      <!-- Text content -->
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm">
          Install Minute Taker
        </p>
        <p class="text-xs text-white/80 truncate">
          Add to home screen for offline access
        </p>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          @click="handleDismiss"
          class="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss install prompt"
        >
          Later
        </button>
        <button
          @click="handleInstall"
          class="px-4 py-1.5 bg-white text-primary-600 rounded-full text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm"
          aria-label="Install app"
        >
          Install
        </button>
      </div>
    </div>
  </div>

  <!-- Card variant (for settings page or inline use) -->
  <div 
    v-else-if="showPrompt && variant === 'card'"
    class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
    role="alert"
    aria-live="polite"
  >
    <div class="p-4">
      <div class="flex items-start gap-3">
        <!-- Icon -->
        <div class="shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </div>
        
        <!-- Text content -->
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
            Install Minute Taker
          </h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Install as an app for faster access and offline functionality
          </p>
        </div>
        
        <!-- Dismiss button -->
        <button
          @click="handleDismiss"
          class="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Dismiss install prompt"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Install button -->
      <div class="mt-3 flex justify-end">
        <button
          @click="handleInstall"
          class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          aria-label="Install app"
        >
          Install App
        </button>
      </div>
    </div>
  </div>

  <!-- Already installed badge (can be shown in settings) -->
  <div 
    v-else-if="isInstalled && variant === 'card'"
    class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-4"
    role="status"
  >
    <div class="flex items-center gap-3">
      <div class="shrink-0 w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
        <svg class="w-5 h-5 text-success-600 dark:text-success-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p class="font-medium text-success-800 dark:text-success-200 text-sm">
          App Installed
        </p>
        <p class="text-xs text-success-600 dark:text-success-400">
          Minute Taker is installed and ready to use
        </p>
      </div>
    </div>
  </div>
</template>
