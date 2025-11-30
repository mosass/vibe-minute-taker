# Data Model: PWA Minute Taker

## Entities

### Meeting

Represents a recorded meeting session.

```typescript
interface Meeting {
  id: string;                    // UUID v4
  title: string;                 // User-provided title
  createdAt: Date;               // When recording started
  updatedAt: Date;               // Last modification
  duration: number;              // Duration in seconds
  transcript: string;            // Full transcript text
  segments: TranscriptSegment[]; // Timestamped segments
  audioFileId: string | null;    // Reference to OPFS audio file
  status: MeetingStatus;         // Recording/transcribing/complete
}

type MeetingStatus = 
  | 'recording'      // Currently recording
  | 'transcribing'   // AI processing
  | 'complete'       // Ready to view
  | 'error';         // Something went wrong

interface TranscriptSegment {
  id: string;
  start: number;     // Start time in seconds
  end: number;       // End time in seconds  
  text: string;      // Segment text
}
```

**Storage**: IndexedDB `meetings` object store
**Key**: `id` (UUID)

### AudioFile (OPFS Reference)

Metadata for audio files stored in OPFS.

```typescript
interface AudioFile {
  id: string;           // UUID, matches OPFS filename
  filename: string;     // Original filename if imported
  mimeType: string;     // audio/webm, audio/wav, etc.
  size: number;         // File size in bytes
  duration: number;     // Duration in seconds
  createdAt: Date;
}
```

**Storage**: IndexedDB `audioFiles` object store (metadata only)
**Key**: `id` (UUID)
**Actual file**: OPFS at `/audio/{id}.webm`

### AIModel (OPFS Reference)

Metadata for cached AI model.

```typescript
interface AIModel {
  id: string;           // Model identifier (e.g., 'whisper-tiny')
  version: string;      // Model version
  size: number;         // Total size in bytes
  downloadedAt: Date;
  lastUsedAt: Date;
  status: ModelStatus;
}

type ModelStatus = 
  | 'not_downloaded'
  | 'downloading'
  | 'ready'
  | 'error';
```

**Storage**: IndexedDB `models` object store (metadata only)
**Key**: `id`
**Actual files**: OPFS at `/models/{id}/`

### AppSettings

User preferences.

```typescript
interface AppSettings {
  id: 'settings';           // Singleton
  theme: 'light' | 'dark' | 'system';
  preferLiveTranscription: boolean;
  autoSave: boolean;
  language: string;         // Preferred transcription language
}
```

**Storage**: IndexedDB `settings` object store
**Key**: `id` ('settings' - singleton)

## IndexedDB Schema

```typescript
// Database: minute-taker-db
// Version: 1

const dbSchema = {
  meetings: {
    keyPath: 'id',
    indexes: [
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'status', keyPath: 'status' }
    ]
  },
  audioFiles: {
    keyPath: 'id',
    indexes: [
      { name: 'createdAt', keyPath: 'createdAt' }
    ]
  },
  models: {
    keyPath: 'id'
  },
  settings: {
    keyPath: 'id'
  }
};
```

## OPFS Structure

```text
/ (OPFS root for this origin)
├── audio/
│   ├── {uuid1}.webm          # Recorded audio
│   ├── {uuid2}.webm
│   └── ...
└── models/
    └── whisper-tiny/
        ├── config.json
        ├── tokenizer.json
        ├── model.onnx
        └── ...
```

## Data Flow

### Recording Flow

```
1. User starts recording
   └─> Create Meeting (status: 'recording')
   
2. Audio chunks collected
   └─> Stored in memory during recording
   
3. User stops recording
   └─> Write audio to OPFS as {meetingId}.webm
   └─> Create AudioFile record
   └─> Update Meeting (audioFileId, status: 'transcribing')
   
4. Transcription completes
   └─> Update Meeting (transcript, segments, status: 'complete')
```

### Import Flow

```
1. User imports audio file
   └─> Write to OPFS as {newId}.webm
   └─> Create AudioFile record
   └─> Create Meeting (status: 'transcribing')
   
2. Transcription completes
   └─> Update Meeting (transcript, segments, status: 'complete')
```

## Relationships

```
┌─────────────┐       1:1       ┌─────────────┐
│   Meeting   │─────────────────│  AudioFile  │
│             │  audioFileId    │   (OPFS)    │
└─────────────┘                 └─────────────┘
      │
      │ 1:many
      ▼
┌─────────────────┐
│ TranscriptSegment │ (embedded in Meeting)
└─────────────────┘
```
