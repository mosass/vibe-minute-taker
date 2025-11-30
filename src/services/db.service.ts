/**
 * IndexedDB Service
 * Provides database operations for meetings, audio files, models, and settings
 * Uses the idb library for a cleaner Promise-based API
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import { DB_NAME, DB_VERSION, STORES } from '@/utils/constants';
import type { Meeting } from '@/types/meeting';
import type { AudioFile } from '@/types/audio';
import type { AIModel, ModelStatus } from '@/types/transcription';

/**
 * App settings stored in IndexedDB
 */
export interface AppSettings {
  id: 'settings';
  theme: 'light' | 'dark' | 'system';
  preferLiveTranscription: boolean;
  autoSave: boolean;
  language: string;
}

/**
 * Default app settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  theme: 'system',
  preferLiveTranscription: false,
  autoSave: true,
  language: 'en'
};

/**
 * IndexedDB schema definition
 */
interface MinuteTakerDB extends DBSchema {
  meetings: {
    key: string;
    value: Meeting;
    indexes: {
      'createdAt': Date;
      'status': string;
    };
  };
  audioFiles: {
    key: string;
    value: AudioFile;
    indexes: {
      'createdAt': Date;
    };
  };
  models: {
    key: string;
    value: AIModel;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

/**
 * Database instance singleton
 */
let dbInstance: IDBPDatabase<MinuteTakerDB> | null = null;

/**
 * Initialize and get the database instance
 */
async function getDB(): Promise<IDBPDatabase<MinuteTakerDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<MinuteTakerDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, _transaction) {
      // Create object stores if they don't exist
      if (oldVersion < 1) {
        // Meetings store
        const meetingsStore = db.createObjectStore(STORES.MEETINGS, { keyPath: 'id' });
        meetingsStore.createIndex('createdAt', 'createdAt');
        meetingsStore.createIndex('status', 'status');

        // Audio files store
        const audioStore = db.createObjectStore(STORES.AUDIO_FILES, { keyPath: 'id' });
        audioStore.createIndex('createdAt', 'createdAt');

        // Models store
        db.createObjectStore(STORES.MODELS, { keyPath: 'id' });

        // Settings store
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
      }
    },
    blocked() {
      console.warn('Database upgrade blocked. Please close other tabs with this app.');
    },
    blocking() {
      // Close the database to allow upgrade to proceed
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      console.error('Database connection unexpectedly terminated');
      dbInstance = null;
    }
  });

  return dbInstance;
}

// ============================================================================
// MEETINGS CRUD OPERATIONS
// ============================================================================

/**
 * Create a new meeting
 */
export async function createMeeting(meeting: Meeting): Promise<string> {
  const db = await getDB();
  await db.put(STORES.MEETINGS, meeting);
  return meeting.id;
}

/**
 * Get a meeting by ID
 */
export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const db = await getDB();
  return db.get(STORES.MEETINGS, id);
}

/**
 * Get all meetings, sorted by createdAt descending (newest first)
 */
export async function getAllMeetings(): Promise<Meeting[]> {
  const db = await getDB();
  const meetings = await db.getAllFromIndex(STORES.MEETINGS, 'createdAt');
  return meetings.reverse(); // Newest first
}

/**
 * Get meetings by status
 */
export async function getMeetingsByStatus(status: string): Promise<Meeting[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORES.MEETINGS, 'status', status);
}

/**
 * Update a meeting
 */
export async function updateMeeting(id: string, updates: Partial<Meeting>): Promise<void> {
  const db = await getDB();
  const existing = await db.get(STORES.MEETINGS, id);
  
  if (!existing) {
    throw new Error(`Meeting with id ${id} not found`);
  }

  const updated: Meeting = {
    ...existing,
    ...updates,
    id, // Ensure ID is not overwritten
    updatedAt: new Date()
  };

  await db.put(STORES.MEETINGS, updated);
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.MEETINGS, id);
}

/**
 * Count meetings
 */
export async function countMeetings(): Promise<number> {
  const db = await getDB();
  return db.count(STORES.MEETINGS);
}

// ============================================================================
// AUDIO FILES OPERATIONS
// ============================================================================

/**
 * Create an audio file record
 */
export async function createAudioFile(audioFile: AudioFile): Promise<string> {
  const db = await getDB();
  await db.put(STORES.AUDIO_FILES, audioFile);
  return audioFile.id;
}

/**
 * Get an audio file record by ID
 */
export async function getAudioFile(id: string): Promise<AudioFile | undefined> {
  const db = await getDB();
  return db.get(STORES.AUDIO_FILES, id);
}

/**
 * Get all audio file records
 */
export async function getAllAudioFiles(): Promise<AudioFile[]> {
  const db = await getDB();
  return db.getAll(STORES.AUDIO_FILES);
}

/**
 * Delete an audio file record
 */
export async function deleteAudioFile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.AUDIO_FILES, id);
}

/**
 * Calculate total audio storage used
 */
export async function getTotalAudioSize(): Promise<number> {
  const files = await getAllAudioFiles();
  return files.reduce((total, file) => total + file.size, 0);
}

// ============================================================================
// AI MODELS OPERATIONS
// ============================================================================

/**
 * Create or update an AI model record
 */
export async function saveModel(model: AIModel): Promise<string> {
  const db = await getDB();
  await db.put(STORES.MODELS, model);
  return model.id;
}

/**
 * Get an AI model record by ID
 */
export async function getModel(id: string): Promise<AIModel | undefined> {
  const db = await getDB();
  return db.get(STORES.MODELS, id);
}

/**
 * Get all AI model records
 */
export async function getAllModels(): Promise<AIModel[]> {
  const db = await getDB();
  return db.getAll(STORES.MODELS);
}

/**
 * Delete an AI model record
 */
export async function deleteModel(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.MODELS, id);
}

/**
 * Check if a model is ready (downloaded and available)
 */
export async function isModelReady(id: string): Promise<boolean> {
  const model = await getModel(id);
  return model?.status === 'ready';
}

/**
 * Update model status
 */
export async function updateModelStatus(id: string, status: ModelStatus): Promise<void> {
  const db = await getDB();
  const model = await db.get(STORES.MODELS, id);
  
  if (model) {
    model.status = status;
    model.lastUsedAt = new Date();
    await db.put(STORES.MODELS, model);
  }
}

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

/**
 * Get app settings
 */
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get(STORES.SETTINGS, 'settings');
  return settings ?? DEFAULT_SETTINGS;
}

/**
 * Save app settings
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const db = await getDB();
  const existing = await getSettings();
  const updated: AppSettings = {
    ...existing,
    ...settings,
    id: 'settings' // Ensure singleton key
  };
  await db.put(STORES.SETTINGS, updated);
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  const db = await getDB();
  await db.put(STORES.SETTINGS, DEFAULT_SETTINGS);
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

/**
 * Close the database connection
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Clear all data from the database
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  
  const tx = db.transaction(
    [STORES.MEETINGS, STORES.AUDIO_FILES, STORES.MODELS, STORES.SETTINGS],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore(STORES.MEETINGS).clear(),
    tx.objectStore(STORES.AUDIO_FILES).clear(),
    tx.objectStore(STORES.MODELS).clear(),
    tx.objectStore(STORES.SETTINGS).clear(),
    tx.done
  ]);
}

/**
 * Get storage usage estimate
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0
    };
  }
  return { usage: 0, quota: 0 };
}

/**
 * Export the database service as a namespace
 */
export const dbService = {
  // Meetings
  createMeeting,
  getMeeting,
  getAllMeetings,
  getMeetingsByStatus,
  updateMeeting,
  deleteMeeting,
  countMeetings,
  
  // Audio Files
  createAudioFile,
  getAudioFile,
  getAllAudioFiles,
  deleteAudioFile,
  getTotalAudioSize,
  
  // Models
  saveModel,
  getModel,
  getAllModels,
  deleteModel,
  isModelReady,
  updateModelStatus,
  
  // Settings
  getSettings,
  saveSettings,
  resetSettings,
  
  // Utilities
  closeDB,
  clearAllData,
  getStorageEstimate
};
