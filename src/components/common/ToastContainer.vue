<script setup lang="ts">
/**
 * ToastContainer - Container for displaying toast notifications
 * 
 * Renders all active toasts with animations and dismiss functionality.
 * Should be placed once in the app root (App.vue).
 */

import { useToast, type Toast, type ToastType } from '@/composables/useToast';

const { toasts, remove } = useToast();

/**
 * Get icon for toast type
 */
function getIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'check-circle';
    case 'error':
      return 'x-circle';
    case 'warning':
      return 'exclamation-triangle';
    case 'info':
    default:
      return 'information-circle';
  }
}

/**
 * Get colors for toast type
 */
function getColors(type: ToastType): { bg: string; icon: string; text: string } {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        icon: 'text-green-500 dark:text-green-400',
        text: 'text-green-800 dark:text-green-200'
      };
    case 'error':
      return {
        bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
        icon: 'text-red-500 dark:text-red-400',
        text: 'text-red-800 dark:text-red-200'
      };
    case 'warning':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
        icon: 'text-amber-500 dark:text-amber-400',
        text: 'text-amber-800 dark:text-amber-200'
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
        icon: 'text-blue-500 dark:text-blue-400',
        text: 'text-blue-800 dark:text-blue-200'
      };
  }
}

/**
 * Dismiss a toast
 */
function dismissToast(toast: Toast): void {
  remove(toast.id);
}
</script>

<template>
  <Teleport to="body">
    <div 
      class="fixed top-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg',
            getColors(toast.type).bg
          ]"
          role="alert"
        >
          <!-- Icon -->
          <div :class="['shrink-0', getColors(toast.type).icon]">
            <!-- Success icon -->
            <svg 
              v-if="getIcon(toast.type) === 'check-circle'" 
              class="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            
            <!-- Error icon -->
            <svg 
              v-else-if="getIcon(toast.type) === 'x-circle'" 
              class="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            
            <!-- Warning icon -->
            <svg 
              v-else-if="getIcon(toast.type) === 'exclamation-triangle'" 
              class="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            
            <!-- Info icon -->
            <svg 
              v-else 
              class="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <!-- Message -->
          <p :class="['flex-1 text-sm font-medium', getColors(toast.type).text]">
            {{ toast.message }}
          </p>
          
          <!-- Dismiss button -->
          <button
            @click="dismissToast(toast)"
            :class="['shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors', getColors(toast.type).icon]"
            aria-label="Dismiss notification"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
