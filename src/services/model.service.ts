/**
 * AI Model Service
 * Handles downloading, caching, and managing Whisper models for transcription
 * Models are stored in OPFS for offline access
 */

import { MODEL_CONFIG } from '@/utils/constants';
import {
  saveModel,
  getModel,
  updateModelStatus,
  deleteModel as deleteModelRecord,
} from './db.service';
import {
  listModelFiles,
  deleteModelFiles,
  getModelStorageUsed,
  isOPFSSupported,
} from './opfs.service';
import type { AIModel, ModelStatus, DownloadProgress } from '@/types/transcription';

/**
 * Progress callback type for model operations
 */
export type ModelProgressCallback = (progress: DownloadProgress) => void;

/**
 * Model information returned by service
 */
export interface ModelInfo {
  id: string;
  displayName: string;
  size: number;
  status: ModelStatus;
  downloadedAt?: Date;
  lastUsedAt?: Date;
}

/**
 * Get the display name for a model
 */
function getModelDisplayName(modelId: string): string {
  const modelNames: Record<string, string> = {
    'Xenova/whisper-tiny': 'Whisper Tiny (~39 MB)',
    'Xenova/whisper-base': 'Whisper Base (~74 MB)',
    'Xenova/whisper-small': 'Whisper Small (~244 MB)',
  };
  return modelNames[modelId] || modelId;
}

/**
 * Get the estimated size for a model
 */
function getModelEstimatedSize(modelId: string): number {
  const modelSizes: Record<string, number> = {
    'Xenova/whisper-tiny': 39 * 1024 * 1024, // 39 MB
    'Xenova/whisper-base': 74 * 1024 * 1024, // 74 MB
    'Xenova/whisper-small': 244 * 1024 * 1024, // 244 MB
  };
  return modelSizes[modelId] || 100 * 1024 * 1024; // Default to 100 MB
}

/**
 * Check if OPFS is available for model storage
 */
export function isModelStorageAvailable(): boolean {
  return isOPFSSupported();
}

/**
 * Get the default model ID
 */
export function getDefaultModelId(): string {
  return MODEL_CONFIG.DEFAULT_MODEL_ID;
}

/**
 * Get information about a specific model
 */
export async function getModelInfo(modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID): Promise<ModelInfo> {
  const model = await getModel(modelId);
  
  if (model) {
    return {
      id: model.id,
      displayName: getModelDisplayName(model.id),
      size: model.size,
      status: model.status,
      downloadedAt: model.downloadedAt,
      lastUsedAt: model.lastUsedAt,
    };
  }

  // Model not in database yet
  return {
    id: modelId,
    displayName: getModelDisplayName(modelId),
    size: getModelEstimatedSize(modelId),
    status: 'not_downloaded',
  };
}

/**
 * Check if a model is ready for use
 */
export async function isModelReady(modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID): Promise<boolean> {
  const model = await getModel(modelId);
  return model?.status === 'ready';
}

/**
 * Check if a model exists (downloaded or downloading)
 */
export async function modelExists(modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID): Promise<boolean> {
  const model = await getModel(modelId);
  return !!model && (model.status === 'ready' || model.status === 'downloading');
}

/**
 * Create initial model record when starting download
 * Note: Actual download is handled by Transformers.js in the worker
 * This service tracks the model state in IndexedDB
 */
export async function initializeModelDownload(
  modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID
): Promise<void> {
  const existingModel = await getModel(modelId);
  
  if (existingModel?.status === 'ready') {
    // Model already downloaded
    return;
  }

  if (existingModel?.status === 'downloading') {
    // Download already in progress
    return;
  }

  // Create or update model record
  const now = new Date();
  const model: AIModel = {
    id: modelId,
    version: '1.0', // Transformers.js handles versioning internally
    size: getModelEstimatedSize(modelId),
    downloadedAt: now,
    lastUsedAt: now,
    status: 'downloading',
  };

  await saveModel(model);
}

/**
 * Mark model as ready after successful download
 */
export async function markModelReady(
  modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID,
  actualSize?: number
): Promise<void> {
  const model = await getModel(modelId);
  const now = new Date();

  if (model) {
    await saveModel({
      ...model,
      status: 'ready',
      size: actualSize ?? model.size,
      lastUsedAt: now,
    });
  } else {
    // Create new record if it doesn't exist
    await saveModel({
      id: modelId,
      version: '1.0',
      size: actualSize ?? getModelEstimatedSize(modelId),
      downloadedAt: now,
      lastUsedAt: now,
      status: 'ready',
    });
  }
}

/**
 * Mark model as loading (into memory)
 */
export async function markModelLoading(modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID): Promise<void> {
  await updateModelStatus(modelId, 'loading');
}

/**
 * Mark model download/load as failed
 */
export async function markModelError(
  modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID,
  error?: string
): Promise<void> {
  console.error(`Model ${modelId} error:`, error);
  await updateModelStatus(modelId, 'error');
}

/**
 * Update the last used timestamp for a model
 */
export async function touchModel(modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID): Promise<void> {
  const model = await getModel(modelId);
  if (model) {
    await saveModel({
      ...model,
      lastUsedAt: new Date(),
    });
  }
}

/**
 * Delete a model and its files
 */
export async function deleteModelData(modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID): Promise<boolean> {
  try {
    // Delete files from OPFS
    await deleteModelFiles(modelId);
    
    // Delete record from IndexedDB
    await deleteModelRecord(modelId);
    
    return true;
  } catch (error) {
    console.error(`Failed to delete model ${modelId}:`, error);
    return false;
  }
}

/**
 * Get the storage size used by a model
 */
export async function getModelSize(modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID): Promise<number> {
  // First check OPFS for actual size
  const opfsSize = await getModelStorageUsed(modelId);
  if (opfsSize > 0) {
    return opfsSize;
  }

  // Fall back to database record
  const model = await getModel(modelId);
  return model?.size ?? getModelEstimatedSize(modelId);
}

/**
 * Get list of all downloaded models
 */
export async function getDownloadedModels(): Promise<ModelInfo[]> {
  const models: ModelInfo[] = [];
  
  // Check both configured models
  const modelIds = [MODEL_CONFIG.DEFAULT_MODEL_ID, MODEL_CONFIG.LARGE_MODEL_ID];
  
  for (const modelId of modelIds) {
    const model = await getModel(modelId);
    if (model && model.status === 'ready') {
      models.push({
        id: model.id,
        displayName: getModelDisplayName(model.id),
        size: model.size,
        status: model.status,
        downloadedAt: model.downloadedAt,
        lastUsedAt: model.lastUsedAt,
      });
    }
  }
  
  return models;
}

/**
 * Get available models (including not downloaded)
 */
export function getAvailableModels(): { id: string; displayName: string; size: number }[] {
  return [
    {
      id: MODEL_CONFIG.DEFAULT_MODEL_ID,
      displayName: getModelDisplayName(MODEL_CONFIG.DEFAULT_MODEL_ID),
      size: getModelEstimatedSize(MODEL_CONFIG.DEFAULT_MODEL_ID),
    },
    {
      id: MODEL_CONFIG.LARGE_MODEL_ID,
      displayName: getModelDisplayName(MODEL_CONFIG.LARGE_MODEL_ID),
      size: getModelEstimatedSize(MODEL_CONFIG.LARGE_MODEL_ID),
    },
  ];
}

/**
 * Check storage quota for model download
 */
export async function checkStorageQuota(): Promise<{ available: boolean; quota: number; usage: number }> {
  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota ?? 0;
    const usage = estimate.usage ?? 0;
    const available = quota - usage;
    
    return {
      available: available > 100 * 1024 * 1024, // At least 100MB free
      quota,
      usage,
    };
  } catch {
    // Storage estimation not available
    return {
      available: true, // Assume available if we can't check
      quota: 0,
      usage: 0,
    };
  }
}

/**
 * Request persistent storage for model data
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Verify model files are intact
 * Note: Transformers.js handles caching internally, so we mainly check the database record
 */
export async function verifyModelIntegrity(modelId: string = MODEL_CONFIG.DEFAULT_MODEL_ID): Promise<boolean> {
  const model = await getModel(modelId);
  
  if (!model) {
    return false;
  }

  if (model.status !== 'ready') {
    return false;
  }

  // Check if any model files exist in OPFS (our backup storage)
  // Transformers.js uses its own cache, but we track in OPFS as well
  // We can verify by checking the files list if needed
  // const files = await listModelFiles(modelId);
  void listModelFiles; // Reference to avoid unused import warning
  
  // If we have the database record marked as ready, trust it
  // Transformers.js will handle redownloading if cache is corrupted
  return true;
}
