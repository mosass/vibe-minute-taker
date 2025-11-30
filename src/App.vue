<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import AppHeader from '@/components/common/AppHeader.vue';
import BottomNav from '@/components/common/BottomNav.vue';
import OfflineIndicator from '@/components/setup/OfflineIndicator.vue';
import { useOnlineStatus } from '@/composables/useOnlineStatus';

const route = useRoute();
const router = useRouter();
const { isOnline } = useOnlineStatus();

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
