/**
 * useInstallPrompt Composable
 * Handles PWA installation prompt using the beforeinstallprompt event
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';
import { STORAGE_KEYS } from '@/utils/constants';

/**
 * BeforeInstallPromptEvent type definition
 * Not all browsers support this yet, so we define it ourselves
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Installation state
 */
export type InstallState = 
  | 'unknown'        // Initial state, waiting for browser signals
  | 'available'      // Install prompt is available
  | 'dismissed'      // User dismissed the prompt
  | 'installed';     // App is already installed

/**
 * Reactive composable for PWA installation prompt handling
 */
export function useInstallPrompt() {
  const installPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const installState = ref<InstallState>('unknown');
  const isInstalled = ref(false);

  /**
   * Whether the install prompt can be shown
   */
  const canPrompt = computed(() => {
    return installPrompt.value !== null && 
           installState.value === 'available' &&
           !isDismissed();
  });

  /**
   * Check if user has previously dismissed the install prompt
   */
  function isDismissed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Mark the install prompt as dismissed
   */
  function dismissPrompt(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED, 'true');
    } catch {
      // Storage not available
    }
    installState.value = 'dismissed';
  }

  /**
   * Reset dismissed state (for testing or settings)
   */
  function resetDismissed(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.INSTALL_DISMISSED);
    } catch {
      // Storage not available
    }
    if (installPrompt.value) {
      installState.value = 'available';
    }
  }

  /**
   * Trigger the install prompt
   */
  async function promptInstall(): Promise<boolean> {
    if (!installPrompt.value) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      // Show the install prompt
      await installPrompt.value.prompt();
      
      // Wait for user choice
      const { outcome } = await installPrompt.value.userChoice;
      
      if (outcome === 'accepted') {
        installState.value = 'installed';
        isInstalled.value = true;
        return true;
      } else {
        // User dismissed, but don't auto-dismiss for future sessions
        // Let them decide when to show again
        return false;
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  /**
   * Handle the beforeinstallprompt event
   */
  function handleBeforeInstallPrompt(event: Event): void {
    // Prevent the default browser install prompt
    event.preventDefault();
    
    // Store the event for later use
    installPrompt.value = event as BeforeInstallPromptEvent;
    
    // Update state if not previously dismissed
    if (!isDismissed()) {
      installState.value = 'available';
    }
  }

  /**
   * Handle the appinstalled event
   */
  function handleAppInstalled(): void {
    installPrompt.value = null;
    installState.value = 'installed';
    isInstalled.value = true;
  }

  /**
   * Check if app is running in standalone mode (already installed)
   */
  function checkStandaloneMode(): void {
    // Check if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true) {
      isInstalled.value = true;
      installState.value = 'installed';
    }
  }

  onMounted(() => {
    // Listen for the install prompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for successful installation
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Check if already installed
    checkStandaloneMode();
    
    // Handle display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', (e) => {
      if (e.matches) {
        isInstalled.value = true;
        installState.value = 'installed';
      }
    });
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });

  return {
    /**
     * Current installation state
     */
    installState,
    
    /**
     * Whether the app is installed (running in standalone mode)
     */
    isInstalled,
    
    /**
     * Whether the install prompt can be shown
     */
    canPrompt,
    
    /**
     * Trigger the install prompt
     * @returns Promise<boolean> - true if installed, false if dismissed or failed
     */
    promptInstall,
    
    /**
     * Dismiss the install prompt (won't show again)
     */
    dismissPrompt,
    
    /**
     * Reset the dismissed state
     */
    resetDismissed
  };
}
