/**
 * useOPFS Composable
 * 
 * Vue composable wrapper for OPFS (Origin Private File System) operations.
 * Provides reactive state and convenient methods for file management.
 */

import { ref, readonly } from 'vue';
import {
  isOPFSSupported,
  saveFile,
  readFile,
  readFileAsBlob,
  readFileAsArrayBuffer,
  deleteFile,
  fileExists,
  listFiles,
  getFileSize,
  saveAudioFile,
  readAudioFile,
  deleteAudioFile,
  audioFileExists,
  listAudioFiles,
  getAudioStorageUsed,
  getTotalStorageUsed,
  initializeOPFS,
  clearAllOPFS
} from '@/services/opfs.service';
import { OPFS_PATHS } from '@/utils/constants';

/**
 * File info type for listing operations
 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

/**
 * OPFS operation result
 */
export interface OPFSResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Import file options
 */
export interface ImportFileOptions {
  /** Custom directory to save to (defaults to audio) */
  directory?: string;
  /** Custom filename (defaults to generated UUID) */
  filename?: string;
  /** File extension */
  extension?: string;
}

/**
 * useOPFS composable
 */
export function useOPFS() {
  // Reactive state
  const isSupported = ref(isOPFSSupported());
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const storageUsed = ref(0);

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Initialize OPFS directory structure
   */
  async function initialize(): Promise<OPFSResult> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      await initializeOPFS();
      return { success: true };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize OPFS';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Save a file to OPFS
   */
  async function save(
    directory: string,
    filename: string,
    data: Blob | ArrayBuffer
  ): Promise<OPFSResult> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      await saveFile(directory, filename, data);
      return { success: true };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Read a file from OPFS
   */
  async function read(
    directory: string,
    filename: string
  ): Promise<OPFSResult<File | null>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const file = await readFile(directory, filename);
      return { success: true, data: file };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to read file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Read a file as Blob
   */
  async function readAsBlob(
    directory: string,
    filename: string
  ): Promise<OPFSResult<Blob | null>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const blob = await readFileAsBlob(directory, filename);
      return { success: true, data: blob };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to read file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Read a file as ArrayBuffer
   */
  async function readAsArrayBuffer(
    directory: string,
    filename: string
  ): Promise<OPFSResult<ArrayBuffer | null>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const buffer = await readFileAsArrayBuffer(directory, filename);
      return { success: true, data: buffer };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to read file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Delete a file from OPFS
   */
  async function remove(
    directory: string,
    filename: string
  ): Promise<OPFSResult<boolean>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const result = await deleteFile(directory, filename);
      return { success: true, data: result };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Check if a file exists
   */
  async function exists(
    directory: string,
    filename: string
  ): Promise<OPFSResult<boolean>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    try {
      const result = await fileExists(directory, filename);
      return { success: true, data: result };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to check file';
      return { success: false, error: error.value };
    }
  }

  /**
   * List files in a directory
   */
  async function list(directory: string): Promise<OPFSResult<string[]>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const files = await listFiles(directory);
      return { success: true, data: files };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list files';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get file size
   */
  async function size(
    directory: string,
    filename: string
  ): Promise<OPFSResult<number | null>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    try {
      const fileSize = await getFileSize(directory, filename);
      return { success: true, data: fileSize };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get file size';
      return { success: false, error: error.value };
    }
  }

  // ============================================================================
  // AUDIO FILE OPERATIONS
  // ============================================================================

  /**
   * Save an audio file
   */
  async function saveAudio(
    id: string,
    blob: Blob,
    extension: string = 'webm'
  ): Promise<OPFSResult> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      await saveAudioFile(id, blob, extension);
      return { success: true };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save audio file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Read an audio file
   */
  async function readAudio(
    id: string,
    extension: string = 'webm'
  ): Promise<OPFSResult<Blob | null>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const blob = await readAudioFile(id, extension);
      return { success: true, data: blob };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to read audio file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Delete an audio file
   */
  async function removeAudio(
    id: string,
    extension: string = 'webm'
  ): Promise<OPFSResult<boolean>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const result = await deleteAudioFile(id, extension);
      return { success: true, data: result };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete audio file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Check if an audio file exists
   */
  async function audioExists(
    id: string,
    extension: string = 'webm'
  ): Promise<OPFSResult<boolean>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    try {
      const result = await audioFileExists(id, extension);
      return { success: true, data: result };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to check audio file';
      return { success: false, error: error.value };
    }
  }

  /**
   * List all audio files
   */
  async function listAudio(): Promise<OPFSResult<string[]>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const files = await listAudioFiles();
      return { success: true, data: files };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to list audio files';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get audio storage used
   */
  async function getAudioUsage(): Promise<OPFSResult<number>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    try {
      const used = await getAudioStorageUsed();
      return { success: true, data: used };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get audio storage';
      return { success: false, error: error.value };
    }
  }

  // ============================================================================
  // IMPORT OPERATIONS
  // ============================================================================

  /**
   * Import a file from a File object (e.g., from file picker or share target)
   */
  async function importFile(
    file: File,
    options: ImportFileOptions = {}
  ): Promise<OPFSResult<{ id: string; filename: string }>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const id = crypto.randomUUID();
      const directory = options.directory ?? OPFS_PATHS.AUDIO;
      
      // Determine extension from file name or type
      let extension = options.extension;
      if (!extension) {
        const nameParts = file.name.split('.');
        extension = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'webm';
      }
      
      const filename = options.filename ?? `${id}.${extension}`;
      
      // Read file as ArrayBuffer and save
      const buffer = await file.arrayBuffer();
      await saveFile(directory, filename, buffer);
      
      return { success: true, data: { id, filename } };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to import file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Import an audio file specifically
   */
  async function importAudioFile(
    file: File
  ): Promise<OPFSResult<{ id: string; filename: string; duration?: number }>> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    // Validate audio file type
    if (!file.type.startsWith('audio/')) {
      error.value = 'File is not an audio file';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      const id = crypto.randomUUID();
      
      // Determine extension from file type
      let extension = 'webm';
      if (file.type.includes('mp3') || file.type.includes('mpeg')) {
        extension = 'mp3';
      } else if (file.type.includes('wav')) {
        extension = 'wav';
      } else if (file.type.includes('ogg')) {
        extension = 'ogg';
      } else if (file.type.includes('m4a') || file.type.includes('mp4')) {
        extension = 'm4a';
      } else if (file.type.includes('webm')) {
        extension = 'webm';
      }
      
      const filename = `${id}.${extension}`;
      
      // Save to OPFS
      await saveAudioFile(id, file, extension);
      
      return { 
        success: true, 
        data: { 
          id, 
          filename
        } 
      };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to import audio file';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // ============================================================================
  // STORAGE OPERATIONS
  // ============================================================================

  /**
   * Update storage used value
   */
  async function updateStorageUsed(): Promise<void> {
    if (!isSupported.value) return;

    try {
      storageUsed.value = await getTotalStorageUsed();
    } catch {
      // Ignore errors
    }
  }

  /**
   * Clear all OPFS data
   */
  async function clearAll(): Promise<OPFSResult> {
    if (!isSupported.value) {
      error.value = 'OPFS is not supported in this browser';
      return { success: false, error: error.value };
    }

    isLoading.value = true;
    clearError();

    try {
      await clearAllOPFS();
      storageUsed.value = 0;
      return { success: true };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to clear OPFS';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    isSupported: readonly(isSupported),
    isLoading: readonly(isLoading),
    error: readonly(error),
    storageUsed: readonly(storageUsed),
    
    // Methods
    clearError,
    initialize,
    updateStorageUsed,
    clearAll,
    
    // Generic file operations
    save,
    read,
    readAsBlob,
    readAsArrayBuffer,
    remove,
    exists,
    list,
    size,
    
    // Audio file operations
    saveAudio,
    readAudio,
    removeAudio,
    audioExists,
    listAudio,
    getAudioUsage,
    
    // Import operations
    importFile,
    importAudioFile
  };
}

export default useOPFS;
