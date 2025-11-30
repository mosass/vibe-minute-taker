<script setup lang="ts">
interface Props {
  /** Whether to show in compact mode (just an icon) */
  compact?: boolean;
}

withDefaults(defineProps<Props>(), {
  compact: false
});
</script>

<template>
  <!-- Compact version (icon only) -->
  <div 
    v-if="compact"
    class="flex items-center justify-center text-white/80"
    title="You are offline"
    role="status"
    aria-label="Offline"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="2" 
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
      />
    </svg>
  </div>
  
  <!-- Full version (banner style) -->
  <div 
    v-else
    class="bg-warning-100 dark:bg-warning-900/30 border-b border-warning-200 dark:border-warning-800"
    role="alert"
  >
    <div class="px-4 py-2 flex items-center gap-2 text-warning-800 dark:text-warning-200">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
        />
      </svg>
      <span class="text-sm font-medium">
        You are offline. Some features may be limited.
      </span>
    </div>
  </div>
</template>
