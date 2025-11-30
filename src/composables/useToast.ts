/**
 * Toast Composable
 * Vue composable for managing toast notifications
 * Provides methods to show success, error, warning, and info toasts
 */

import { ref, readonly, type Ref, type DeepReadonly } from 'vue';

/**
 * Toast types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast item interface
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

/**
 * Options for creating a toast
 */
export interface ToastOptions {
  /** Duration in milliseconds. Default: 4000 for error, 3000 for others */
  duration?: number;
  /** Unique ID for the toast. Auto-generated if not provided */
  id?: string;
}

// Global toast state
const toasts = ref<Toast[]>([]);
const maxToasts = 5;

// Auto-cleanup timers
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Generate unique ID for toast
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get default duration based on toast type
 */
function getDefaultDuration(type: ToastType): number {
  switch (type) {
    case 'error':
      return 5000; // Errors stay longer
    case 'warning':
      return 4000;
    case 'success':
    case 'info':
    default:
      return 3000;
  }
}

/**
 * Add a toast to the list
 */
function addToast(type: ToastType, message: string, options: ToastOptions = {}): string {
  const id = options.id || generateId();
  const duration = options.duration ?? getDefaultDuration(type);
  
  // Remove existing toast with same ID
  removeToast(id);
  
  const toast: Toast = {
    id,
    type,
    message,
    duration,
    createdAt: Date.now()
  };
  
  // Add to list (newest first for display)
  toasts.value = [toast, ...toasts.value];
  
  // Limit max toasts
  if (toasts.value.length > maxToasts) {
    const removed = toasts.value.pop();
    if (removed) {
      const timer = timers.get(removed.id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(removed.id);
      }
    }
  }
  
  // Set auto-remove timer
  if (duration > 0) {
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);
    timers.set(id, timer);
  }
  
  return id;
}

/**
 * Remove a toast by ID
 */
function removeToast(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts.value = toasts.value.filter(t => t.id !== id);
}

/**
 * Clear all toasts
 */
function clearAllToasts(): void {
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
  toasts.value = [];
}

/**
 * Return type for useToast
 */
export interface UseToastReturn {
  /** Current list of toasts (readonly) */
  toasts: DeepReadonly<Ref<Toast[]>>;
  
  /** Show a success toast */
  success: (message: string, options?: ToastOptions) => string;
  
  /** Show an error toast */
  error: (message: string, options?: ToastOptions) => string;
  
  /** Show a warning toast */
  warning: (message: string, options?: ToastOptions) => string;
  
  /** Show an info toast */
  info: (message: string, options?: ToastOptions) => string;
  
  /** Remove a specific toast */
  remove: (id: string) => void;
  
  /** Clear all toasts */
  clear: () => void;
}

/**
 * Composable for managing toast notifications
 */
export function useToast(): UseToastReturn {
  return {
    toasts: readonly(toasts),
    success: (message: string, options?: ToastOptions) => addToast('success', message, options),
    error: (message: string, options?: ToastOptions) => addToast('error', message, options),
    warning: (message: string, options?: ToastOptions) => addToast('warning', message, options),
    info: (message: string, options?: ToastOptions) => addToast('info', message, options),
    remove: removeToast,
    clear: clearAllToasts
  };
}
