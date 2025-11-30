/**
 * useModelManager Composable
 * Manages AI model lifecycle including download, initialization, and status tracking
 * Provides reactive state for model status, progress, and error handling
 */

import { ref, computed, readonly, onUnmounted, type Ref, type ComputedRef } from 'vue';
import {
  getModelInfo,
  isModelReady,
  initializeModelDownload,
  markModelReady,
  markModelError,
  deleteModelData,
  getDefaultModelId,
  checkStorageQuota,
  requestPersistentStorage,
  type ModelInfo,
} from '@/services/model.service';
import type { ModelStatus, DownloadProgress, TranscriptionWorkerResponse } from '@/types/transcription';

/**
 * Model manager state
 */
export interface ModelManagerState {
  /** Current model status */
  status: Ref<ModelStatus>;
  /** Model information */
  modelInfo: Ref<ModelInfo | null>;
  /** Download/load progress */
  progress: Ref<DownloadProgress | null>;
  /** Error message if any */
  error: Ref<string | null>;
  /** Whether the model is ready for transcription */
  isReady: ComputedRef<boolean>;
  /** Whether the model is currently loading/downloading */
  isLoading: ComputedRef<boolean>;
  /** Whether there's an error */
  hasError: ComputedRef<boolean>;
  /** Progress percentage (0-100) */
  progressPercent: ComputedRef<number>;
}

/**
 * Model manager actions
 */
export interface ModelManagerActions {
  /** Initialize and download the model if needed */
  initializeModel: (modelId?: string) => Promise<void>;
  /** Retry after an error */
  retry: () => Promise<void>;
  /** Delete model data */
  deleteModel: () => Promise<boolean>;
  /** Check if model is ready without initializing */
  checkModelStatus: () => Promise<boolean>;
  /** Refresh model info */
  refreshModelInfo: () => Promise<void>;
  /** Handle worker progress messages */
  handleWorkerProgress: (message: TranscriptionWorkerResponse) => void;
}

// Singleton worker instance for model initialization
let workerInstance: Worker | null = null;

/**
 * Get or create the transcription worker
 */
function getOrCreateWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('@/workers/transcription.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return workerInstance;
}

/**
 * Terminate the worker instance
 */
function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

/**
 * useModelManager composable
 * Provides reactive model management with download, status tracking, and error handling
 */
export function useModelManager(initialModelId?: string) {
  // State
  const status = ref<ModelStatus>('not_downloaded');
  const modelInfo = ref<ModelInfo | null>(null);
  const progress = ref<DownloadProgress | null>(null);
  const error = ref<string | null>(null);
  const currentModelId = ref<string>(initialModelId ?? getDefaultModelId());
  const isInitializing = ref(false);

  // Computed
  const isReady = computed(() => status.value === 'ready');
  const isLoading = computed(() => 
    status.value === 'downloading' || 
    status.value === 'loading' ||
    isInitializing.value
  );
  const hasError = computed(() => status.value === 'error' || !!error.value);
  const progressPercent = computed(() => progress.value?.percentage ?? 0);

  /**
   * Refresh model information from the database
   */
  async function refreshModelInfo(): Promise<void> {
    try {
      const info = await getModelInfo(currentModelId.value);
      modelInfo.value = info;
      status.value = info.status;
    } catch (err) {
      console.error('Failed to refresh model info:', err);
    }
  }

  /**
   * Check if the model is ready without initializing
   */
  async function checkModelStatus(): Promise<boolean> {
    const ready = await isModelReady(currentModelId.value);
    if (ready) {
      status.value = 'ready';
    }
    await refreshModelInfo();
    return ready;
  }

  /**
   * Handle progress updates from the worker
   */
  function handleWorkerProgress(message: TranscriptionWorkerResponse): void {
    switch (message.type) {
      case 'progress':
        progress.value = message.progress;
        if (status.value !== 'downloading') {
          status.value = 'downloading';
        }
        break;

      case 'ready':
        status.value = 'ready';
        progress.value = {
          loaded: 100,
          total: 100,
          percentage: 100,
          status: 'Model ready',
        };
        error.value = null;
        markModelReady(currentModelId.value).catch(console.error);
        refreshModelInfo().catch(console.error);
        break;

      case 'error':
        status.value = 'error';
        error.value = message.error;
        markModelError(currentModelId.value, message.error).catch(console.error);
        break;
    }
  }

  /**
   * Initialize the model (download if needed, then load)
   */
  async function initializeModel(modelId?: string): Promise<void> {
    if (isInitializing.value) {
      console.warn('Model initialization already in progress');
      return;
    }

    const targetModelId = modelId ?? currentModelId.value;
    currentModelId.value = targetModelId;
    isInitializing.value = true;
    error.value = null;

    try {
      // Check storage availability
      const storage = await checkStorageQuota();
      if (!storage.available) {
        throw new Error('Not enough storage space for the AI model. Please free up some space.');
      }

      // Request persistent storage
      await requestPersistentStorage();

      // Check if already ready
      const ready = await isModelReady(targetModelId);
      if (ready) {
        status.value = 'ready';
        await refreshModelInfo();
        isInitializing.value = false;
        return;
      }

      // Mark as downloading in database
      await initializeModelDownload(targetModelId);
      status.value = 'downloading';
      progress.value = {
        loaded: 0,
        total: 100,
        percentage: 0,
        status: 'Initializing model download...',
      };

      // Get or create worker
      const worker = getOrCreateWorker();

      // Set up message handler
      return new Promise<void>((resolve, reject) => {
        const handleMessage = (event: MessageEvent<TranscriptionWorkerResponse>) => {
          handleWorkerProgress(event.data);

          if (event.data.type === 'ready') {
            worker.removeEventListener('message', handleMessage);
            isInitializing.value = false;
            resolve();
          } else if (event.data.type === 'error') {
            worker.removeEventListener('message', handleMessage);
            isInitializing.value = false;
            reject(new Error(event.data.error));
          }
        };

        worker.addEventListener('message', handleMessage);

        // Send init message to worker
        worker.postMessage({ type: 'init', modelId: targetModelId });
      });
    } catch (err) {
      status.value = 'error';
      error.value = err instanceof Error ? err.message : 'Failed to initialize model';
      await markModelError(currentModelId.value, error.value);
      isInitializing.value = false;
      throw err;
    }
  }

  /**
   * Retry model initialization after an error
   */
  async function retry(): Promise<void> {
    error.value = null;
    status.value = 'not_downloaded';
    progress.value = null;
    
    // Terminate existing worker to start fresh
    terminateWorker();
    
    await initializeModel(currentModelId.value);
  }

  /**
   * Delete the model and its data
   */
  async function deleteModel(): Promise<boolean> {
    try {
      const success = await deleteModelData(currentModelId.value);
      if (success) {
        status.value = 'not_downloaded';
        progress.value = null;
        error.value = null;
        modelInfo.value = null;
        terminateWorker();
      }
      return success;
    } catch (err) {
      console.error('Failed to delete model:', err);
      error.value = err instanceof Error ? err.message : 'Failed to delete model';
      return false;
    }
  }

  // Initialize model info on mount
  refreshModelInfo().catch(console.error);

  // Cleanup on unmount
  onUnmounted(() => {
    // Don't terminate worker on unmount as it's shared
    // Worker will be terminated when explicitly deleted
  });

  return {
    // State (readonly refs for external use)
    status: readonly(status),
    modelInfo: readonly(modelInfo),
    progress: readonly(progress),
    error: readonly(error),
    isReady,
    isLoading,
    hasError,
    progressPercent,
    currentModelId: readonly(currentModelId),

    // Actions
    initializeModel,
    retry,
    deleteModel,
    checkModelStatus,
    refreshModelInfo,
    handleWorkerProgress,
  };
}

/**
 * Get the shared worker instance (for use by transcription service)
 */
export function getTranscriptionWorker(): Worker {
  return getOrCreateWorker();
}

/**
 * Cleanup function for application shutdown
 */
export function cleanupModelManager(): void {
  terminateWorker();
}

export type UseModelManagerReturn = ReturnType<typeof useModelManager>;
