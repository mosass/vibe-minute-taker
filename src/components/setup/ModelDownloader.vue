<script setup lang="ts">
/**
 * ModelDownloader - First-run experience for downloading AI model
 * Shows download progress, size estimate, ETA, and error handling with retry
 */

import { ref, computed, onMounted, watch } from 'vue';
import { useModelManager } from '@/composables/useModelManager';
import { useOnlineStatus } from '@/composables/useOnlineStatus';
import ProgressBar from '@/components/common/ProgressBar.vue';
import { formatFileSize } from '@/utils/formatters';
import { checkTranscriptionCompatibility, detectBrowser, type TranscriptionCompatibility, type BrowserInfo } from '@/utils/browserDetect';
import { CloudArrowDownIcon, ExclamationTriangleIcon, CheckCircleIcon, WifiIcon, DevicePhoneMobileIcon } from '@heroicons/vue/24/outline';

interface Props {
  /** Model ID to download (optional, uses default) */
  modelId?: string;
  /** Whether to auto-start download */
  autoStart?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoStart: false
});

const emit = defineEmits<{
  /** Emitted when model is ready for use */
  ready: [];
  /** Emitted when download starts */
  started: [];
  /** Emitted when download fails */
  error: [error: string];
}>();

// Composables
const {
  modelInfo,
  progress,
  error,
  isReady,
  isLoading,
  hasError,
  progressPercent,
  initializeModel,
  retry,
  checkModelStatus
} = useModelManager(props.modelId);

const { isOnline } = useOnlineStatus();

// Local state
const downloadStartTime = ref<number | null>(null);
const hasStartedDownload = ref(false);

// Browser compatibility
const browserInfo = ref<BrowserInfo>(detectBrowser());
const compatibility = ref<TranscriptionCompatibility>(checkTranscriptionCompatibility());

// Computed for compatibility warnings
const showCompatibilityWarning = computed(() => {
  return compatibility.value.hasWarnings || (browserInfo.value.isIOS && !isReady.value);
});

const compatibilityMessage = computed(() => {
  if (!compatibility.value.isSupported) {
    return compatibility.value.errors[0] || 'Transcription may not work on this device.';
  }
  if (browserInfo.value.isIOS) {
    return 'iOS Safari has limited support. Transcription may be slower or require more memory.';
  }
  if (compatibility.value.hasWarnings) {
    return compatibility.value.warnings[0];
  }
  return null;
});

// Computed
const estimatedSize = computed(() => {
  return modelInfo.value?.size ?? 39 * 1024 * 1024; // Default 39MB for whisper-tiny
});

const formattedSize = computed(() => {
  return formatFileSize(estimatedSize.value);
});

const etaSeconds = computed(() => {
  if (!downloadStartTime.value || !progress.value) return null;
  if (progressPercent.value <= 0) return null;
  
  const elapsed = (Date.now() - downloadStartTime.value) / 1000;
  const remaining = (elapsed / progressPercent.value) * (100 - progressPercent.value);
  return Math.ceil(remaining);
});

const formattedEta = computed(() => {
  if (!etaSeconds.value) return null;
  
  const eta = etaSeconds.value;
  if (eta < 60) return `${eta}s remaining`;
  if (eta < 3600) return `${Math.ceil(eta / 60)} min remaining`;
  return `${Math.ceil(eta / 3600)} hr remaining`;
});

const statusMessage = computed(() => {
  if (!isOnline.value) return 'No internet connection';
  if (hasError.value) return error.value || 'Download failed';
  if (isReady.value) return 'AI model ready!';
  if (isLoading.value) {
    return progress.value?.status || 'Downloading AI model...';
  }
  return 'Ready to download';
});

const canDownload = computed(() => {
  return isOnline.value && !isLoading.value && !isReady.value;
});

/**
 * Start the model download
 */
async function startDownload(): Promise<void> {
  console.log('[ModelDownloader] startDownload called, canDownload:', canDownload.value);
  if (!canDownload.value) return;
  
  hasStartedDownload.value = true;
  downloadStartTime.value = Date.now();
  emit('started');
  
  console.log('[ModelDownloader] calling initializeModel...');
  try {
    await initializeModel();
    console.log('[ModelDownloader] initializeModel completed');
  } catch (err) {
    console.error('[ModelDownloader] initializeModel error:', err);
    emit('error', err instanceof Error ? err.message : 'Download failed');
  }
}

/**
 * Retry after an error
 */
async function handleRetry(): Promise<void> {
  downloadStartTime.value = Date.now();
  await retry();
}

// Watch for ready state
watch(isReady, (ready) => {
  if (ready) {
    emit('ready');
  }
});

// Check model status on mount
onMounted(async () => {
  await checkModelStatus();
  
  if (isReady.value) {
    emit('ready');
  } else if (props.autoStart && isOnline.value) {
    startDownload();
  }
});
</script>

<template>
  <div class="model-downloader bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-md mx-auto">
    <!-- Header -->
    <div class="text-center mb-6">
      <div 
        class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
        :class="[
          hasError ? 'bg-recording-100 dark:bg-recording-900' :
          isReady ? 'bg-success-100 dark:bg-success-900' :
          'bg-primary-100 dark:bg-primary-900'
        ]"
      >
        <ExclamationTriangleIcon 
          v-if="hasError"
          class="w-8 h-8 text-recording-500"
        />
        <CheckCircleIcon 
          v-else-if="isReady"
          class="w-8 h-8 text-success-500"
        />
        <CloudArrowDownIcon 
          v-else
          class="w-8 h-8 text-primary-500"
          :class="{ 'animate-bounce': isLoading }"
        />
      </div>
      
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {{ isReady ? 'AI Model Ready' : 'Download AI Model' }}
      </h2>
      
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ isReady 
          ? 'Your device is ready for offline transcription!' 
          : 'A small AI model is needed for speech-to-text transcription.'
        }}
      </p>
    </div>

    <!-- Model info -->
    <div 
      v-if="!isReady"
      class="bg-gray-50 dark:bg-gray-750 rounded-lg p-4 mb-6"
    >
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">Model</span>
        <span class="font-medium text-gray-900 dark:text-white">Whisper Tiny</span>
      </div>
      <div class="flex items-center justify-between text-sm mt-2">
        <span class="text-gray-600 dark:text-gray-400">Size</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ formattedSize }}</span>
      </div>
      <div class="flex items-center justify-between text-sm mt-2">
        <span class="text-gray-600 dark:text-gray-400">Works offline</span>
        <span class="font-medium text-success-500">Yes ✓</span>
      </div>
    </div>

    <!-- Compatibility warning for iOS/limited browsers -->
    <div 
      v-if="showCompatibilityWarning && !isReady"
      class="flex items-start gap-2 bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 
             rounded-lg p-3 mb-4"
    >
      <DevicePhoneMobileIcon class="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <span class="text-sm font-medium">Limited Support</span>
        <p class="text-sm mt-0.5">{{ compatibilityMessage }}</p>
        <p v-if="compatibility.recommendation" class="text-xs mt-1 opacity-75">
          {{ compatibility.recommendation }}
        </p>
      </div>
    </div>

    <!-- Offline warning -->
    <div 
      v-if="!isOnline && !isReady"
      class="flex items-center gap-2 bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 
             rounded-lg p-3 mb-4"
    >
      <WifiIcon class="w-5 h-5 shrink-0" />
      <span class="text-sm">Connect to the internet to download the AI model.</span>
    </div>

    <!-- Progress section -->
    <div v-if="isLoading" class="mb-6">
      <ProgressBar
        :value="progressPercent"
        :show-label="true"
        size="lg"
        variant="primary"
      >
        <template #label>Downloading</template>
      </ProgressBar>
      
      <div class="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-500">
        <span>{{ statusMessage }}</span>
        <span v-if="formattedEta">{{ formattedEta }}</span>
      </div>
    </div>

    <!-- Error section -->
    <div 
      v-if="hasError"
      class="bg-recording-50 dark:bg-recording-900/30 rounded-lg p-4 mb-6"
    >
      <p class="text-sm text-recording-700 dark:text-recording-400 mb-2">
        {{ error || 'Failed to download the AI model. Please check your connection and try again.' }}
      </p>
    </div>

    <!-- Action buttons -->
    <div class="space-y-3">
      <!-- Download button -->
      <button
        v-if="!isReady && !isLoading"
        type="button"
        :disabled="!canDownload"
        class="w-full py-3 px-4 rounded-xl font-medium transition-all duration-200
               focus:outline-none focus:ring-2 focus:ring-offset-2"
        :class="[
          canDownload 
            ? 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        ]"
        @click="hasError ? handleRetry() : startDownload()"
      >
        <span class="flex items-center justify-center gap-2">
          <CloudArrowDownIcon class="w-5 h-5" />
          {{ hasError ? 'Retry Download' : 'Download Model' }}
        </span>
      </button>

      <!-- Ready state message -->
      <div 
        v-if="isReady"
        class="text-center py-3"
      >
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Start recording to transcribe your meetings!
        </p>
      </div>
    </div>

    <!-- Privacy note -->
    <p 
      v-if="!isReady"
      class="text-xs text-center text-gray-500 dark:text-gray-500 mt-4"
    >
      🔒 All transcription happens on your device. Your audio never leaves your phone.
    </p>
  </div>
</template>
