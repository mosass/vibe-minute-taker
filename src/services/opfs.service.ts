/**
 * Origin Private File System (OPFS) Service
 * Provides file operations for storing audio files and AI models
 * Uses the File System Access API for private, performant storage
 */

import { OPFS_PATHS } from '@/utils/constants';

/**
 * Check if OPFS is supported in the current browser
 */
export function isOPFSSupported(): boolean {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

/**
 * Get the root directory handle for OPFS
 */
async function getRootDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isOPFSSupported()) {
    throw new Error('OPFS is not supported in this browser');
  }
  return navigator.storage.getDirectory();
}

/**
 * Get or create a directory within OPFS
 */
async function getOrCreateDirectory(path: string): Promise<FileSystemDirectoryHandle> {
  const root = await getRootDirectory();
  const parts = path.split('/').filter(Boolean);
  
  let currentDir = root;
  for (const part of parts) {
    currentDir = await currentDir.getDirectoryHandle(part, { create: true });
  }
  
  return currentDir;
}

/**
 * Get a directory handle (without creating if it doesn't exist)
 */
async function getDirectory(path: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await getRootDirectory();
    const parts = path.split('/').filter(Boolean);
    
    let currentDir = root;
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: false });
    }
    
    return currentDir;
  } catch {
    return null;
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Save a file to OPFS
 */
export async function saveFile(
  directory: string,
  filename: string,
  data: Blob | ArrayBuffer
): Promise<void> {
  const dir = await getOrCreateDirectory(directory);
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * Read a file from OPFS
 */
export async function readFile(
  directory: string,
  filename: string
): Promise<File | null> {
  try {
    const dir = await getDirectory(directory);
    if (!dir) return null;
    
    const fileHandle = await dir.getFileHandle(filename, { create: false });
    return fileHandle.getFile();
  } catch {
    return null;
  }
}

/**
 * Read a file as Blob
 */
export async function readFileAsBlob(
  directory: string,
  filename: string
): Promise<Blob | null> {
  const file = await readFile(directory, filename);
  return file ? new Blob([await file.arrayBuffer()], { type: file.type }) : null;
}

/**
 * Read a file as ArrayBuffer
 */
export async function readFileAsArrayBuffer(
  directory: string,
  filename: string
): Promise<ArrayBuffer | null> {
  const file = await readFile(directory, filename);
  return file ? file.arrayBuffer() : null;
}

/**
 * Check if a file exists
 */
export async function fileExists(
  directory: string,
  filename: string
): Promise<boolean> {
  try {
    const dir = await getDirectory(directory);
    if (!dir) return false;
    
    await dir.getFileHandle(filename, { create: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file from OPFS
 */
export async function deleteFile(
  directory: string,
  filename: string
): Promise<boolean> {
  try {
    const dir = await getDirectory(directory);
    if (!dir) return false;
    
    await dir.removeEntry(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size
 */
export async function getFileSize(
  directory: string,
  filename: string
): Promise<number | null> {
  const file = await readFile(directory, filename);
  return file ? file.size : null;
}

/**
 * List all files in a directory
 */
export async function listFiles(directory: string): Promise<string[]> {
  try {
    const dir = await getDirectory(directory);
    if (!dir) return [];
    
    const files: string[] = [];
    // Use entries() and cast to async iterable for compatibility
    for await (const [name, handle] of (dir as unknown as AsyncIterable<[string, FileSystemHandle]>)) {
      if (handle.kind === 'file') {
        files.push(name);
      }
    }
    return files;
  } catch {
    return [];
  }
}

/**
 * List all subdirectories in a directory
 */
export async function listDirectories(directory: string): Promise<string[]> {
  try {
    const dir = await getDirectory(directory);
    if (!dir) return [];
    
    const dirs: string[] = [];
    // Use entries() and cast to async iterable for compatibility
    for await (const [name, handle] of (dir as unknown as AsyncIterable<[string, FileSystemHandle]>)) {
      if (handle.kind === 'directory') {
        dirs.push(name);
      }
    }
    return dirs;
  } catch {
    return [];
  }
}

// ============================================================================
// AUDIO FILE OPERATIONS
// ============================================================================

/**
 * Save an audio file
 */
export async function saveAudioFile(
  id: string,
  blob: Blob,
  extension: string = 'webm'
): Promise<void> {
  await saveFile(OPFS_PATHS.AUDIO, `${id}.${extension}`, blob);
}

/**
 * Read an audio file
 */
export async function readAudioFile(
  id: string,
  extension: string = 'webm'
): Promise<Blob | null> {
  return readFileAsBlob(OPFS_PATHS.AUDIO, `${id}.${extension}`);
}

/**
 * Delete an audio file
 */
export async function deleteAudioFile(
  id: string,
  extension: string = 'webm'
): Promise<boolean> {
  return deleteFile(OPFS_PATHS.AUDIO, `${id}.${extension}`);
}

/**
 * Check if an audio file exists
 */
export async function audioFileExists(
  id: string,
  extension: string = 'webm'
): Promise<boolean> {
  return fileExists(OPFS_PATHS.AUDIO, `${id}.${extension}`);
}

/**
 * List all audio files
 */
export async function listAudioFiles(): Promise<string[]> {
  return listFiles(OPFS_PATHS.AUDIO);
}

/**
 * Get total audio storage used in bytes
 */
export async function getAudioStorageUsed(): Promise<number> {
  const files = await listAudioFiles();
  let total = 0;
  
  for (const filename of files) {
    const size = await getFileSize(OPFS_PATHS.AUDIO, filename);
    if (size) total += size;
  }
  
  return total;
}

/**
 * Delete all audio files
 */
export async function deleteAllAudioFiles(): Promise<void> {
  const files = await listAudioFiles();
  
  for (const filename of files) {
    await deleteFile(OPFS_PATHS.AUDIO, filename);
  }
}

// ============================================================================
// MODEL FILE OPERATIONS
// ============================================================================

/**
 * Get the model directory path
 */
function getModelPath(modelId: string): string {
  // Convert model ID like "Xenova/whisper-tiny" to safe path "whisper-tiny"
  const safeName = modelId.split('/').pop() ?? modelId;
  return `${OPFS_PATHS.MODELS}/${safeName}`;
}

/**
 * Save a model file
 */
export async function saveModelFile(
  modelId: string,
  filename: string,
  data: Blob | ArrayBuffer
): Promise<void> {
  const modelPath = getModelPath(modelId);
  await saveFile(modelPath, filename, data);
}

/**
 * Read a model file
 */
export async function readModelFile(
  modelId: string,
  filename: string
): Promise<ArrayBuffer | null> {
  const modelPath = getModelPath(modelId);
  return readFileAsArrayBuffer(modelPath, filename);
}

/**
 * Check if all required model files exist
 */
export async function modelFilesExist(
  modelId: string,
  requiredFiles: string[]
): Promise<boolean> {
  const modelPath = getModelPath(modelId);
  
  for (const filename of requiredFiles) {
    const exists = await fileExists(modelPath, filename);
    if (!exists) return false;
  }
  
  return true;
}

/**
 * List all model files
 */
export async function listModelFiles(modelId: string): Promise<string[]> {
  const modelPath = getModelPath(modelId);
  return listFiles(modelPath);
}

/**
 * Delete all files for a model
 */
export async function deleteModelFiles(modelId: string): Promise<boolean> {
  try {
    const modelPath = getModelPath(modelId);
    const dir = await getDirectory(modelPath);
    if (!dir) return true;
    
    // Delete all files in the model directory
    for await (const [name, handle] of (dir as unknown as AsyncIterable<[string, FileSystemHandle]>)) {
      if (handle.kind === 'file') {
        await dir.removeEntry(name);
      }
    }
    
    // Delete the model directory itself
    const modelsDir = await getDirectory(OPFS_PATHS.MODELS);
    if (modelsDir) {
      const safeName = modelId.split('/').pop() ?? modelId;
      await modelsDir.removeEntry(safeName);
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get total model storage used in bytes
 */
export async function getModelStorageUsed(modelId: string): Promise<number> {
  const files = await listModelFiles(modelId);
  let total = 0;
  
  const modelPath = getModelPath(modelId);
  for (const filename of files) {
    const size = await getFileSize(modelPath, filename);
    if (size) total += size;
  }
  
  return total;
}

// ============================================================================
// DIRECTORY OPERATIONS
// ============================================================================

/**
 * Initialize the OPFS directory structure
 */
export async function initializeOPFS(): Promise<void> {
  // Create audio and models directories
  await getOrCreateDirectory(OPFS_PATHS.AUDIO);
  await getOrCreateDirectory(OPFS_PATHS.MODELS);
}

/**
 * Clear all OPFS data
 */
export async function clearAllOPFS(): Promise<void> {
  const root = await getRootDirectory();
  
  // Delete audio directory
  try {
    await root.removeEntry(OPFS_PATHS.AUDIO, { recursive: true });
  } catch {
    // Directory may not exist
  }
  
  // Delete models directory
  try {
    await root.removeEntry(OPFS_PATHS.MODELS, { recursive: true });
  } catch {
    // Directory may not exist
  }
  
  // Re-initialize the structure
  await initializeOPFS();
}

/**
 * Get total OPFS storage used
 */
export async function getTotalStorageUsed(): Promise<number> {
  const audioUsed = await getAudioStorageUsed();
  
  // Get model storage for all models
  const modelDirs = await listDirectories(OPFS_PATHS.MODELS);
  let modelUsed = 0;
  
  for (const dir of modelDirs) {
    modelUsed += await getModelStorageUsed(dir);
  }
  
  return audioUsed + modelUsed;
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

/**
 * Export the OPFS service as a namespace
 */
export const opfsService = {
  // Support check
  isSupported: isOPFSSupported,
  
  // Generic file operations
  saveFile,
  readFile,
  readFileAsBlob,
  readFileAsArrayBuffer,
  fileExists,
  deleteFile,
  getFileSize,
  listFiles,
  listDirectories,
  
  // Audio file operations
  saveAudioFile,
  readAudioFile,
  deleteAudioFile,
  audioFileExists,
  listAudioFiles,
  getAudioStorageUsed,
  deleteAllAudioFiles,
  
  // Model file operations
  saveModelFile,
  readModelFile,
  modelFilesExist,
  listModelFiles,
  deleteModelFiles,
  getModelStorageUsed,
  
  // Directory operations
  initialize: initializeOPFS,
  clearAll: clearAllOPFS,
  getTotalStorageUsed
};
