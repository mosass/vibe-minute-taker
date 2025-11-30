<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router';
import { computed, ref, onMounted } from 'vue';
import AppHeader from '@/components/common/AppHeader.vue';
import BottomNav from '@/components/common/BottomNav.vue';
import OfflineIndicator from '@/components/setup/OfflineIndicator.vue';
import InstallPrompt from '@/components/setup/InstallPrompt.vue';
import { useOnlineStatus } from '@/composables/useOnlineStatus';
import { useInstallPrompt } from '@/composables/useInstallPrompt';

const route = useRoute();
const router = useRouter();
const { isOnline } = useOnlineStatus();
const { isInstalled, installState } = useInstallPrompt();

// Track whether to show install prompt
const showInstallBanner = ref(false);

/**
 * Check if user has completed at least one recording
 * Used to show install prompt after first success
 */
function hasCompletedRecording(): boolean {
  try {
    return localStorage.getItem('first-recording-complete') === 'true';
  } catch {
    return false;
  }
}

/**
 * Check if install prompt should be shown
 */
function shouldShowInstallPrompt(): boolean {
  // Don't show if already installed
  if (isInstalled.value) return false;
  
  // Don't show if dismissed
  if (installState.value === 'dismissed') return false;
  
  // Show if available and user has completed first recording
  return installState.value === 'available' && hasCompletedRecording();
}

// Compute page title from route meta
const pageTitle = computed(() => {
  return (route.meta?.title as string) ?? 'Minute Taker';
});

// Show back button on detail pages
const showBack = computed(() => {
  return route.path.includes('/meetings/') && route.path !== '/meetings';
});

const handleBack = () => {
  router.back();
};

const handleInstalled = () => {
  showInstallBanner.value = false;
};

const handleDismissed = () => {
  showInstallBanner.value = false;
};

// Check on mount and when route changes
onMounted(() => {
  showInstallBanner.value = shouldShowInstallPrompt();
  
  // Also listen for storage events (when recording completes in HomeView)
  window.addEventListener('storage', () => {
    showInstallBanner.value = shouldShowInstallPrompt();
  });
});

// Watch for route changes to potentially show install prompt
router.afterEach(() => {
  showInstallBanner.value = shouldShowInstallPrompt();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Offline Banner (full width, above header) -->
    <OfflineIndicator v-if="!isOnline" />
    
    <!-- App Header -->
    <AppHeader 
      :title="pageTitle" 
      :show-back="showBack"
      @back="handleBack"
    />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <!-- Install Prompt Banner (above bottom nav) -->
    <InstallPrompt 
      v-if="showInstallBanner"
      variant="banner"
      @installed="handleInstalled"
      @dismissed="handleDismissed"
    />

    <!-- Bottom Navigation -->
    <BottomNav />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
