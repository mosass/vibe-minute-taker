<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default 100) */
  max?: number;
  /** Show percentage text */
  showLabel?: boolean;
  /** Custom label text (overrides percentage) */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Whether the progress is indeterminate */
  indeterminate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  showLabel: false,
  size: 'md',
  variant: 'primary',
  indeterminate: false
});

const percentage = computed(() => {
  if (props.indeterminate) return 0;
  return Math.min(100, Math.max(0, (props.value / props.max) * 100));
});

const displayLabel = computed(() => {
  if (props.label) return props.label;
  return `${Math.round(percentage.value)}%`;
});

const heightClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-1';
    case 'lg': return 'h-3';
    default: return 'h-2';
  }
});

const colorClass = computed(() => {
  switch (props.variant) {
    case 'success': return 'bg-success-500';
    case 'warning': return 'bg-warning-500';
    case 'error': return 'bg-recording-500';
    default: return 'bg-primary-500';
  }
});
</script>

<template>
  <div class="w-full">
    <!-- Label -->
    <div v-if="showLabel" class="flex justify-between mb-1">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        <slot name="label">Progress</slot>
      </span>
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ displayLabel }}
      </span>
    </div>
    
    <!-- Progress bar container -->
    <div 
      class="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      :class="heightClass"
      role="progressbar"
      :aria-valuenow="indeterminate ? undefined : value"
      :aria-valuemin="0"
      :aria-valuemax="max"
    >
      <!-- Determinate progress -->
      <div 
        v-if="!indeterminate"
        class="h-full rounded-full transition-all duration-300 ease-out"
        :class="colorClass"
        :style="{ width: `${percentage}%` }"
      />
      
      <!-- Indeterminate progress -->
      <div 
        v-else
        class="h-full rounded-full animate-progress-indeterminate"
        :class="colorClass"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes progress-indeterminate {
  0% {
    width: 0%;
    margin-left: 0%;
  }
  50% {
    width: 30%;
    margin-left: 35%;
  }
  100% {
    width: 0%;
    margin-left: 100%;
  }
}

.animate-progress-indeterminate {
  animation: progress-indeterminate 1.5s ease-in-out infinite;
}
</style>
