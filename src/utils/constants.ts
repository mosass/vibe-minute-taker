/**
 * Application constants
 */

// IndexedDB configuration
export const DB_NAME = 'minute-taker-db';
export const DB_VERSION = 1;

// Object store names
export const STORES = {
  MEETINGS: 'meetings',
  AUDIO_FILES: 'audioFiles',
  MODELS: 'models',
  SETTINGS: 'settings'
} as const;

// OPFS directory structure
export const OPFS_PATHS = {
  AUDIO: 'audio',
  MODELS: 'models'
} as const;

// AI Model configuration
export const MODEL_CONFIG = {
  // Using whisper-tiny for faster downloads in demo
  DEFAULT_MODEL_ID: 'Xenova/whisper-tiny',
  // Alternative larger model for better accuracy
  LARGE_MODEL_ID: 'Xenova/whisper-small',
  // Model file patterns for OPFS storage
  MODEL_FILES: ['config.json', 'tokenizer.json', 'model.onnx'],
  // Estimated model size in bytes (whisper-tiny ~40MB)
  ESTIMATED_SIZE: 40 * 1024 * 1024
} as const;

// Audio recording configuration
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,        // Required for Whisper
  CHANNEL_COUNT: 1,          // Mono audio
  MIME_TYPE: 'audio/webm;codecs=opus',
  FALLBACK_MIME_TYPE: 'audio/webm',
  // Maximum recording duration (2 hours)
  MAX_DURATION_SECONDS: 7200,
  // Audio chunk duration for streaming transcription (seconds)
  CHUNK_DURATION: 30
} as const;

// UI configuration
export const UI_CONFIG = {
  // Maximum characters for transcript preview
  PREVIEW_LENGTH: 100,
  // Debounce delay for auto-save (ms)
  AUTO_SAVE_DELAY: 1000,
  // Toast notification duration (ms)
  TOAST_DURATION: 3000,
  // Animation durations (ms)
  ANIMATION_DURATION: 200
} as const;

// PWA configuration
export const PWA_CONFIG = {
  // App display name
  APP_NAME: 'Minute Taker',
  // Short name for home screen
  SHORT_NAME: 'Minutes',
  // Theme color
  THEME_COLOR: '#3b82f6',
  // Background color
  BACKGROUND_COLOR: '#ffffff'
} as const;

// Storage keys for localStorage/sessionStorage
export const STORAGE_KEYS = {
  INSTALL_DISMISSED: 'pwa-install-dismissed',
  ONBOARDING_COMPLETE: 'onboarding-complete',
  LIVE_TRANSCRIPTION: 'prefer-live-transcription',
  THEME: 'theme-preference'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  MICROPHONE_DENIED: 'Microphone access is required for recording. Please enable it in your browser settings.',
  MICROPHONE_NOT_FOUND: 'No microphone found. Please connect a microphone and try again.',
  RECORDING_FAILED: 'Recording failed. Please try again.',
  TRANSCRIPTION_FAILED: 'Transcription failed. Please try again.',
  MODEL_DOWNLOAD_FAILED: 'Failed to download AI model. Please check your connection and try again.',
  STORAGE_FULL: 'Storage is full. Please delete some meetings to free up space.',
  OFFLINE: 'You are offline. Some features may not be available.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  MEETING_SAVED: 'Meeting saved successfully',
  MEETING_DELETED: 'Meeting deleted',
  TRANSCRIPT_UPDATED: 'Transcript updated',
  MODEL_READY: 'AI model ready for transcription'
} as const;
