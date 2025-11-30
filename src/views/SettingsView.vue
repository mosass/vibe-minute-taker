<script setup lang="ts">
/**
 * SettingsView - App settings and configuration
 * 
 * Includes model status, storage usage, PWA install options, and debug info.
 */

import { ref, onMounted, computed } from 'vue';
import { useInstallPrompt } from '@/composables/useInstallPrompt';
import { useOnlineStatus } from '@/composables/useOnlineStatus';
import { useModelManager } from '@/composables/useModelManager';
import { getStorageEstimate, clearAllData, countMeetings } from '@/services/db.service';
import { getModelSize, deleteModelData } from '@/services/model.service';
import { deleteAllAudioFiles, getAudioStorageUsed } from '@/services/opfs.service';
import InstallPrompt from '@/components/setup/InstallPrompt.vue';
import { formatFileSize } from '@/utils/formatters';
import { PWA_CONFIG } from '@/utils/constants';

// Composables
const { isInstalled, installState, canPrompt, resetDismissed } = useInstallPrompt();
const { isOnline } = useOnlineStatus();
const { isReady: modelReady } = useModelManager();

// Storage info
const storageUsage = ref(0);
const storageQuota = ref(0);
const audioStorageUsed = ref(0);
const modelStorageUsed = ref(0);
const meetingsCount = ref(0);
const isLoadingStorage = ref(true);

// Confirm dialogs
const showClearDataConfirm = ref(false);
const showDeleteModelConfirm = ref(false);
const isClearingData = ref(false);
const isDeletingModel = ref(false);

// Version info
const appVersion = '1.0.0';
const buildDate = new Date().toLocaleDateString();

// Computed
const formattedStorageUsage = computed(() => formatFileSize(storageUsage.value));
const formattedStorageQuota = computed(() => formatFileSize(storageQuota.value));
const formattedAudioStorage = computed(() => formatFileSize(audioStorageUsed.value));
const formattedModelStorage = computed(() => formatFileSize(modelStorageUsed.value));
const storagePercent = computed(() => {
  if (!storageQuota.value) return 0;
  return Math.round((storageUsage.value / storageQuota.value) * 100);
});

// PWA Debug info
const displayMode = computed(() => {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  return 'browser';
});

const serviceWorkerStatus = ref<'active' | 'installing' | 'waiting' | 'none'>('none');

/**
 * Load storage information
 */
async function loadStorageInfo(): Promise<void> {
  isLoadingStorage.value = true;
  
  try {
    // Get storage estimate
    const estimate = await getStorageEstimate();
    storageUsage.value = estimate.usage;
    storageQuota.value = estimate.quota;
    
    // Get audio storage
    audioStorageUsed.value = await getAudioStorageUsed();
    
    // Get model storage
    modelStorageUsed.value = await getModelSize();
    
    // Get meetings count
    meetingsCount.value = await countMeetings();
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        if (registration.active) {
          serviceWorkerStatus.value = 'active';
        } else if (registration.installing) {
          serviceWorkerStatus.value = 'installing';
        } else if (registration.waiting) {
          serviceWorkerStatus.value = 'waiting';
        }
      }
    }
  } catch (error) {
    console.error('Failed to load storage info:', error);
  } finally {
    isLoadingStorage.value = false;
  }
}

/**
 * Clear all app data
 */
async function handleClearData(): Promise<void> {
  isClearingData.value = true;
  
  try {
    // Clear IndexedDB
    await clearAllData();
    
    // Clear audio files from OPFS
    await deleteAllAudioFiles();
    
    // Clear localStorage
    localStorage.clear();
    
    // Reload to reset app state
    window.location.reload();
  } catch (error) {
    console.error('Failed to clear data:', error);
    alert('Failed to clear data. Please try again.');
  } finally {
    isClearingData.value = false;
    showClearDataConfirm.value = false;
  }
}

/**
 * Delete the AI model
 */
async function handleDeleteModel(): Promise<void> {
  isDeletingModel.value = true;
  
  try {
    await deleteModelData();
    
    // Reload to show download screen
    window.location.reload();
  } catch (error) {
    console.error('Failed to delete model:', error);
    alert('Failed to delete model. Please try again.');
  } finally {
    isDeletingModel.value = false;
    showDeleteModelConfirm.value = false;
  }
}

/**
 * Reset install prompt (for testing)
 */
function handleResetInstall(): void {
  resetDismissed();
  alert('Install prompt will show again on next eligible page.');
}

onMounted(() => {
  loadStorageInfo();
});
</script>

<template>
  <div class="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- App Info Section -->
    <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h2 class="font-semibold text-gray-900 dark:text-white">About</h2>
      </div>
      <div class="p-4 space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ PWA_CONFIG.APP_NAME }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Version {{ appVersion }}</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Record and transcribe meetings with AI-powered speech recognition. Works completely offline.
        </p>
      </div>
    </section>

    <!-- AI Model Section -->
    <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h2 class="font-semibold text-gray-900 dark:text-white">AI Model</h2>
      </div>
      <div class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Status</span>
          <span 
            class="text-sm font-medium"
            :class="modelReady ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'"
          >
            {{ modelReady ? '✓ Ready' : 'Not downloaded' }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Model</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">Whisper Tiny</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Storage used</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ isLoadingStorage ? '...' : formattedModelStorage }}
          </span>
        </div>
        
        <!-- Delete Model Button -->
        <button
          v-if="modelReady"
          type="button"
          class="w-full mt-2 px-4 py-2 text-sm font-medium text-recording-600 dark:text-recording-400 
                 bg-recording-50 dark:bg-recording-900/20 rounded-lg hover:bg-recording-100 dark:hover:bg-recording-900/30
                 transition-colors"
          @click="showDeleteModelConfirm = true"
        >
          Delete Model
        </button>
      </div>
    </section>

    <!-- Storage Section -->
    <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h2 class="font-semibold text-gray-900 dark:text-white">Storage</h2>
      </div>
      <div class="p-4 space-y-3">
        <!-- Storage bar -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-600 dark:text-gray-400">Used</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ isLoadingStorage ? '...' : `${formattedStorageUsage} of ${formattedStorageQuota}` }}
            </span>
          </div>
          <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-primary-500 rounded-full transition-all duration-300"
              :style="{ width: `${storagePercent}%` }"
            />
          </div>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Meetings</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ isLoadingStorage ? '...' : meetingsCount }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Audio files</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ isLoadingStorage ? '...' : formattedAudioStorage }}
          </span>
        </div>
        
        <!-- Clear Data Button -->
        <button
          type="button"
          class="w-full mt-2 px-4 py-2 text-sm font-medium text-recording-600 dark:text-recording-400 
                 bg-recording-50 dark:bg-recording-900/20 rounded-lg hover:bg-recording-100 dark:hover:bg-recording-900/30
                 transition-colors"
          @click="showClearDataConfirm = true"
        >
          Clear All Data
        </button>
      </div>
    </section>

    <!-- Install Section -->
    <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h2 class="font-semibold text-gray-900 dark:text-white">Installation</h2>
      </div>
      <div class="p-4">
        <InstallPrompt variant="card" />
        
        <!-- Already installed message -->
        <div 
          v-if="isInstalled"
          class="flex items-center gap-3 bg-success-50 dark:bg-success-900/20 rounded-lg p-3"
        >
          <svg class="w-5 h-5 text-success-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-sm text-success-700 dark:text-success-400">
            App is installed
          </span>
        </div>
        
        <!-- Reset install prompt (for testing) -->
        <button
          v-if="installState === 'dismissed'"
          type="button"
          class="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          @click="handleResetInstall"
        >
          Reset install prompt
        </button>
      </div>
    </section>

    <!-- PWA Debug Info Section -->
    <section class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h2 class="font-semibold text-gray-900 dark:text-white">PWA Debug Info</h2>
      </div>
      <div class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Display mode</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{ displayMode }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Service Worker</span>
          <span 
            class="text-sm font-medium capitalize"
            :class="serviceWorkerStatus === 'active' ? 'text-success-600 dark:text-success-400' : 'text-gray-900 dark:text-white'"
          >
            {{ serviceWorkerStatus }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Online status</span>
          <span 
            class="text-sm font-medium"
            :class="isOnline ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'"
          >
            {{ isOnline ? 'Online' : 'Offline' }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Install state</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{ installState }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Can prompt install</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ canPrompt ? 'Yes' : 'No' }}</span>
        </div>
      </div>
    </section>

    <!-- Version Info -->
    <div class="text-center py-4 text-xs text-gray-400 dark:text-gray-600">
      {{ PWA_CONFIG.APP_NAME }} v{{ appVersion }} • Built {{ buildDate }}
    </div>

    <!-- Clear Data Confirmation Dialog -->
    <Teleport to="body">
      <div 
        v-if="showClearDataConfirm"
        class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        @click.self="showClearDataConfirm = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Clear All Data?
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            This will delete all your meetings, recordings, and settings. This action cannot be undone.
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                     bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600
                     transition-colors"
              :disabled="isClearingData"
              @click="showClearDataConfirm = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-white 
                     bg-recording-500 rounded-lg hover:bg-recording-600
                     transition-colors disabled:opacity-50"
              :disabled="isClearingData"
              @click="handleClearData"
            >
              {{ isClearingData ? 'Clearing...' : 'Clear Data' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Model Confirmation Dialog -->
    <Teleport to="body">
      <div 
        v-if="showDeleteModelConfirm"
        class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        @click.self="showDeleteModelConfirm = false"
      >
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Delete AI Model?
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            You will need to download the model again to use transcription. This frees up {{ formattedModelStorage }} of storage.
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                     bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600
                     transition-colors"
              :disabled="isDeletingModel"
              @click="showDeleteModelConfirm = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2 text-sm font-medium text-white 
                     bg-recording-500 rounded-lg hover:bg-recording-600
                     transition-colors disabled:opacity-50"
              :disabled="isDeletingModel"
              @click="handleDeleteModel"
            >
              {{ isDeletingModel ? 'Deleting...' : 'Delete Model' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
