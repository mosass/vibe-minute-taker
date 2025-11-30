<script setup lang="ts">
import { useOnlineStatus } from '@/composables/useOnlineStatus';
import OfflineIndicator from '@/components/setup/OfflineIndicator.vue';

interface Props {
  title?: string;
  showBack?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: 'Minute Taker',
  showBack: false
});

const emit = defineEmits<{
  back: [];
}>();

const { isOnline } = useOnlineStatus();

const handleBack = () => {
  emit('back');
};
</script>

<template>
  <header class="safe-area-top bg-primary-500 text-white sticky top-0 z-50">
    <div class="px-4 py-3 flex items-center justify-between min-h-14">
      <!-- Left: Back button or spacer -->
      <div class="w-10 shrink-0">
        <button
          v-if="showBack"
          @click="handleBack"
          class="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Go back"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      
      <!-- Center: Title -->
      <h1 class="text-lg font-semibold truncate text-center flex-1">
        {{ title }}
      </h1>
      
      <!-- Right: Status indicators -->
      <div class="w-10 shrink-0 flex justify-end">
        <OfflineIndicator v-if="!isOnline" compact />
      </div>
    </div>
  </header>
</template>
