/**
 * useOnlineStatus Composable
 * Provides reactive online/offline status tracking
 */

import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Reactive composable for tracking browser online/offline status
 * @returns Object with isOnline ref that updates automatically
 */
export function useOnlineStatus() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const wasOffline = ref(false);

  function updateOnlineStatus() {
    const online = navigator.onLine;
    
    // Track if user just came back online
    if (online && !isOnline.value) {
      wasOffline.value = true;
    }
    
    isOnline.value = online;
  }

  function clearWasOffline() {
    wasOffline.value = false;
  }

  onMounted(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  });

  onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  });

  return {
    /**
     * Whether the browser is currently online
     */
    isOnline,
    
    /**
     * Whether the browser was recently offline (useful for showing reconnection messages)
     */
    wasOffline,
    
    /**
     * Clear the wasOffline flag (call after showing reconnection message)
     */
    clearWasOffline
  };
}
