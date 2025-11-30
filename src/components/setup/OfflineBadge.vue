<script setup lang="ts">
/**
 * OfflineBadge Component
 * 
 * Shows a badge indicating the app works offline.
 * Displayed when the AI model has been downloaded.
 */

interface Props {
  /** Badge variant */
  variant?: 'success' | 'info';
  /** Size of the badge */
  size?: 'sm' | 'md';
}

withDefaults(defineProps<Props>(), {
  variant: 'success',
  size: 'sm'
});
</script>

<template>
  <div 
    class="inline-flex items-center gap-1.5 rounded-full font-medium"
    :class="[
      variant === 'success' 
        ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' 
        : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    ]"
    role="status"
    aria-label="Works offline"
  >
    <!-- Checkmark icon -->
    <svg 
      class="shrink-0" 
      :class="size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'"
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
    </svg>
    <span>Works offline</span>
  </div>
</template>
