<script setup lang="ts">
/**
 * OnboardingView - First-time user welcome screen
 * 
 * Provides:
 * - App introduction
 * - Model download prompt
 * - Microphone permission request
 */

import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useModelManager } from '@/composables/useModelManager';
import { useOnlineStatus } from '@/composables/useOnlineStatus';
import { useToast } from '@/composables/useToast';
import { AudioRecordingService } from '@/services/audio.service';
import ProgressBar from '@/components/common/ProgressBar.vue';
import { formatFileSize } from '@/utils/formatters';
import { MODEL_CONFIG } from '@/utils/constants';

const router = useRouter();
const toast = useToast();
const { isOnline } = useOnlineStatus();
const { 
  isReady: modelReady, 
  isLoading: isDownloading, 
  progressPercent: downloadProgress,
  initializeModel: downloadModel 
} = useModelManager();

// Onboarding steps
type OnboardingStep = 'welcome' | 'features' | 'microphone' | 'model' | 'complete';

// State
const currentStep = ref<OnboardingStep>('welcome');
const micPermission = ref<PermissionState>('prompt');
const isRequestingMic = ref(false);

// Step navigation
const steps: OnboardingStep[] = ['welcome', 'features', 'microphone', 'model', 'complete'];
const currentStepIndex = computed(() => steps.indexOf(currentStep.value));
const isFirstStep = computed(() => currentStepIndex.value === 0);
const isLastStep = computed(() => currentStep.value === 'complete');

// Check if we can skip model step (already downloaded)
const canSkipModel = computed(() => modelReady.value);

// Features list
const features = [
  {
    icon: 'microphone',
    title: 'Record Meetings',
    description: 'Capture audio with a single tap'
  },
  {
    icon: 'ai',
    title: 'AI Transcription',
    description: 'Automatic speech-to-text using edge AI'
  },
  {
    icon: 'offline',
    title: 'Works Offline',
    description: 'Full functionality without internet'
  },
  {
    icon: 'lock',
    title: 'Private & Secure',
    description: 'All data stays on your device'
  }
];

/**
 * Check if onboarding should be shown
 */
function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem('onboarding-complete') === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as complete
 */
function completeOnboarding(): void {
  try {
    localStorage.setItem('onboarding-complete', 'true');
  } catch {
    // Storage not available
  }
  router.replace('/');
}

/**
 * Go to next step
 */
function nextStep(): void {
  const index = currentStepIndex.value;
  if (index < steps.length - 1) {
    // Skip model step if already downloaded
    if (steps[index + 1] === 'model' && canSkipModel.value) {
      currentStep.value = 'complete';
    } else {
      currentStep.value = steps[index + 1]!;
    }
  }
}

/**
 * Go to previous step
 */
function prevStep(): void {
  const index = currentStepIndex.value;
  if (index > 0) {
    currentStep.value = steps[index - 1]!;
  }
}

/**
 * Skip onboarding
 */
function skipOnboarding(): void {
  toast.info('You can set up later in Settings');
  completeOnboarding();
}

/**
 * Request microphone permission
 */
async function requestMicPermission(): Promise<void> {
  isRequestingMic.value = true;
  
  try {
    const permission = await AudioRecordingService.checkMicrophonePermission();
    micPermission.value = permission;

    console.log('Microphone permission:', permission);
    
    if (permission === 'granted') {
      toast.success('Microphone access granted');
      // Auto-advance after a short delay
      setTimeout(nextStep, 500);
    } else if (permission === 'denied') {
      toast.error('Microphone access denied. You can enable it in browser settings.');
    } else if (permission === 'prompt') {
      // This should not happen as we just requested
      const newPermission = await AudioRecordingService.requestMicrophonePermission();
      if (newPermission === 'granted') {
        micPermission.value = 'granted';
        toast.success('Microphone access granted');
        setTimeout(nextStep, 500);
      } else {
        micPermission.value = 'denied';
        toast.error('Microphone access denied. You can enable it in browser settings.');
      }
    }
  } catch (error) {
    console.error('Error checking mic permission:', error);
    toast.error('Failed to check microphone permission');
  } finally {
    isRequestingMic.value = false;
  }
}

/**
 * Start model download
 */
async function startModelDownload(): Promise<void> {
  if (!isOnline.value) {
    toast.warning('You need an internet connection to download the AI model');
    return;
  }
  
  try {
    await downloadModel();
    toast.success('AI model downloaded successfully');
    // Auto-advance after a short delay
    setTimeout(nextStep, 500);
  } catch (error) {
    console.error('Model download failed:', error);
    toast.error('Failed to download AI model. Please try again.');
  }
}

// Check initial state on mount
onMounted(async () => {
  // Check if already completed onboarding
  if (hasCompletedOnboarding()) {
    router.replace('/');
    return;
  }
  
  // Check microphone permission
  try {
    micPermission.value = await AudioRecordingService.checkMicrophonePermission();
  } catch {
    // Ignore errors
  }
});
</script>

<template>
  <div class="min-h-screen bg-linear-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
    <!-- Progress indicator -->
    <div class="p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Step {{ currentStepIndex + 1 }} of {{ steps.length }}
        </span>
        <button
          v-if="!isLastStep"
          @click="skipOnboarding"
          class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          Skip
        </button>
      </div>
      <div class="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          class="h-full bg-primary-600 transition-all duration-300"
          :style="{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Content area -->
    <div class="flex-1 flex flex-col items-center justify-center p-6">
      <!-- Welcome step -->
      <div v-if="currentStep === 'welcome'" class="text-center max-w-md">
        <div class="w-24 h-24 mx-auto mb-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <svg class="w-12 h-12 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Welcome to Minute Taker
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Your AI-powered meeting notes assistant that works completely offline.
        </p>
        <button
          @click="nextStep"
          class="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          Get Started
        </button>
      </div>

      <!-- Features step -->
      <div v-else-if="currentStep === 'features'" class="w-full max-w-md">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          What you can do
        </h2>
        <div class="space-y-4 mb-8">
          <div 
            v-for="feature in features"
            :key="feature.title"
            class="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <div class="shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <!-- Microphone icon -->
              <svg v-if="feature.icon === 'microphone'" class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <!-- AI icon -->
              <svg v-else-if="feature.icon === 'ai'" class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <!-- Offline icon -->
              <svg v-else-if="feature.icon === 'offline'" class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
              <!-- Lock icon -->
              <svg v-else class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ feature.title }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>
        <button
          @click="nextStep"
          class="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          Continue
        </button>
      </div>

      <!-- Microphone step -->
      <div v-else-if="currentStep === 'microphone'" class="text-center max-w-md">
        <div class="w-24 h-24 mx-auto mb-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <svg class="w-12 h-12 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Microphone Access
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mb-8">
          We need access to your microphone to record meetings. Your audio is processed locally and never sent to any server.
        </p>
        
        <!-- Permission status -->
        <div 
          v-if="micPermission === 'granted'"
          class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-6"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Microphone access granted</span>
        </div>
        
        <div 
          v-else-if="micPermission === 'denied'"
          class="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-6"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Microphone access denied</span>
        </div>

        <div class="space-y-3">
          <button
            v-if="micPermission !== 'granted'"
            @click="requestMicPermission"
            :disabled="isRequestingMic"
            class="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isRequestingMic ? 'Requesting...' : 'Allow Microphone Access' }}
          </button>
          
          <button
            @click="nextStep"
            class="w-full px-6 py-3 rounded-xl font-medium transition-colors"
            :class="micPermission === 'granted' 
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'"
          >
            {{ micPermission === 'granted' ? 'Continue' : 'Skip for now' }}
          </button>
        </div>
      </div>

      <!-- Model download step -->
      <div v-else-if="currentStep === 'model'" class="text-center max-w-md">
        <div class="w-24 h-24 mx-auto mb-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <svg class="w-12 h-12 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          AI Model Setup
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mb-4">
          Download the AI model for offline transcription. This only needs to be done once.
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Size: ~{{ formatFileSize(MODEL_CONFIG.ESTIMATED_SIZE) }}
        </p>

        <!-- Offline warning -->
        <div 
          v-if="!isOnline"
          class="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 mb-6 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>You're offline. Connect to download the model.</span>
        </div>

        <!-- Download progress -->
        <div v-if="isDownloading" class="mb-6">
          <ProgressBar 
            :value="downloadProgress" 
            :max="100" 
            variant="primary"
            show-label
            label-position="inside"
          />
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Downloading... {{ Math.round(downloadProgress) }}%
          </p>
        </div>

        <!-- Model ready -->
        <div 
          v-else-if="modelReady"
          class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-6"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>AI model ready</span>
        </div>

        <div class="space-y-3">
          <button
            v-if="!modelReady && !isDownloading"
            @click="startModelDownload"
            :disabled="!isOnline"
            class="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Download AI Model
          </button>
          
          <button
            v-if="modelReady"
            @click="nextStep"
            class="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Continue
          </button>
          
          <button
            v-if="!modelReady"
            @click="nextStep"
            class="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>

      <!-- Complete step -->
      <div v-else-if="currentStep === 'complete'" class="text-center max-w-md">
        <div class="w-24 h-24 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg class="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          You're all set!
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mb-8">
          Start recording your first meeting by tapping the record button.
        </p>
        <button
          @click="completeOnboarding"
          class="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          Start Recording
        </button>
      </div>
    </div>

    <!-- Navigation buttons -->
    <div v-if="!isFirstStep && !isLastStep && currentStep !== 'welcome'" class="p-4">
      <button
        @click="prevStep"
        class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>
  </div>
</template>
