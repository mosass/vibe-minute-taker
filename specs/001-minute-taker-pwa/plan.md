# Implementation Plan: PWA Minute Taker

**Branch**: `001-minute-taker-pwa` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-minute-taker-pwa/spec.md`

## Summary

Build a Progressive Web App for taking meeting notes via audio recording and AI-powered transcription. The app must work completely offline, using Transformers.js for edge AI processing and OPFS for storing the AI model and audio files. Primary focus is demonstrating PWA capabilities for a 2-hour session.

## Technical Context

**Language/Version**: TypeScript 5.x, JavaScript ES2022+
**Primary Dependencies**: Vue 3.4+, Tailwind CSS 3.4+, Transformers.js 2.x, Vite 5.x, vite-plugin-pwa
**Storage**: OPFS (audio/model files), IndexedDB (meeting metadata)
**Testing**: Vitest for unit tests, Playwright for E2E (optional for demo)
**Target Platform**: Modern browsers (Chrome 102+, Edge 102+, Safari 16.4+, Firefox 111+)
**Project Type**: Single SPA
**Performance Goals**: < 3s first load, < 5s time to interactive, smooth 60fps UI during recording
**Constraints**: Fully offline capable, < 200MB model size, works on mobile
**Scale/Scope**: Demo app for ~50 meeting notes, single user

## Constitution Check

*GATE: All principles verified before implementation*

| Principle | Compliance |
|-----------|------------|
| I. PWA-First | ✅ All features use PWA APIs (Service Worker, OPFS, Web Audio) |
| II. Edge AI | ✅ Transformers.js runs locally, no external API calls |
| III. Offline-Complete | ✅ Full functionality without network after model download |
| IV. Demo-Ready | ✅ Clear code, visible PWA features for demonstration |
| V. Simplicity | ✅ Straightforward Vue 3 Composition API, no complex state management |

## Project Structure

### Documentation (this feature)

```text
specs/001-minute-taker-pwa/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical research on PWA APIs
├── data-model.md        # Entity definitions
├── tasks.md             # Implementation tasks
└── pwa-demo-guide.md    # Guide for demonstrating PWA features
```

### Source Code (repository root)

```text
src/
├── main.ts                     # App entry point
├── App.vue                     # Root component
├── assets/
│   └── styles/
│       └── main.css            # Tailwind imports
├── components/
│   ├── common/
│   │   ├── AppHeader.vue       # Header with app title
│   │   ├── BottomNav.vue       # Bottom navigation
│   │   ├── ProgressBar.vue     # Reusable progress indicator
│   │   └── EmptyState.vue      # Empty list placeholder
│   ├── recording/
│   │   ├── RecordButton.vue    # Main record FAB
│   │   ├── RecordingTimer.vue  # Elapsed time display
│   │   ├── WaveformVisualizer.vue # Audio visualization
│   │   └── RecordingControls.vue  # Pause/stop controls
│   ├── transcription/
│   │   ├── TranscriptionProgress.vue # AI processing indicator
│   │   ├── TranscriptView.vue  # Display transcript with timestamps
│   │   └── TranscriptEditor.vue # Edit transcript text
│   ├── meetings/
│   │   ├── MeetingList.vue     # List of saved meetings
│   │   ├── MeetingCard.vue     # Single meeting preview
│   │   └── MeetingDetail.vue   # Full meeting view
│   └── setup/
│       ├── ModelDownloader.vue # First-run model download UI
│       ├── InstallPrompt.vue   # PWA install banner
│       └── OfflineIndicator.vue # Network status display
├── composables/
│   ├── useAudioRecorder.ts     # Web Audio API recording
│   ├── useTranscription.ts     # Transformers.js integration
│   ├── useMeetings.ts          # Meeting CRUD operations
│   ├── useOPFS.ts              # OPFS file operations
│   ├── useModelManager.ts      # AI model download/cache
│   ├── useOnlineStatus.ts      # Network connectivity
│   └── useInstallPrompt.ts     # PWA install handling
├── services/
│   ├── opfs.service.ts         # OPFS abstraction layer
│   ├── db.service.ts           # IndexedDB operations
│   ├── audio.service.ts        # Audio recording/playback
│   ├── transcription.service.ts # Whisper model wrapper
│   └── model.service.ts        # Model download/storage
├── workers/
│   ├── transcription.worker.ts # Web Worker for AI processing
│   └── sw.ts                   # Service Worker (via vite-plugin-pwa)
├── types/
│   ├── meeting.ts              # Meeting type definitions
│   ├── audio.ts                # Audio-related types
│   └── transcription.ts        # Transcription types
├── router/
│   └── index.ts                # Vue Router setup
├── views/
│   ├── HomeView.vue            # Main recording view
│   ├── MeetingsView.vue        # Meetings list view
│   ├── MeetingDetailView.vue   # Single meeting view
│   └── SettingsView.vue        # App settings
└── utils/
    ├── formatters.ts           # Date/time formatting
    └── constants.ts            # App constants

public/
├── manifest.json               # PWA manifest (generated)
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── maskable-icon.png
└── splash/
    └── apple-splash.png

tests/
├── unit/
│   ├── composables/
│   └── services/
└── e2e/
    └── recording.spec.ts

index.html                      # HTML entry
vite.config.ts                  # Vite + PWA config
tailwind.config.js              # Tailwind config
tsconfig.json                   # TypeScript config
package.json                    # Dependencies
```

**Structure Decision**: Single SPA project with Vue 3 Composition API. All code in `src/` with clear separation between components (UI), composables (logic hooks), services (business logic), and workers (background processing).

## Research Notes

### Transformers.js Whisper Integration

- Use `@huggingface/transformers` package
- Model: `Xenova/whisper-tiny` (39MB) or `Xenova/whisper-small` (244MB)
- For demo, use `whisper-tiny` for faster downloads
- Process audio in Web Worker to avoid blocking UI
- Input: 16kHz mono Float32Array
- Output: Text with timestamps

### OPFS (Origin Private File System)

- Access via `navigator.storage.getDirectory()`
- Stores files persistently, survives clear browsing data
- Good for large files (audio, ML models)
- Must use File System Access API handles
- Storage quota: typically 60% of free disk space

### PWA Configuration (vite-plugin-pwa)

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Minute Taker',
        short_name: 'Minutes',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [/* ... */],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [{ name: 'audio', accept: ['audio/*'] }]
          }
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [/* ... */]
      }
    })
  ]
}
```

### Web Audio Recording

```typescript
// Key APIs
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
// Collect chunks, then convert to WAV for Whisper
```

### Media Session API

```typescript
navigator.mediaSession.metadata = new MediaMetadata({
  title: 'Recording Meeting',
  artist: 'Minute Taker'
});
navigator.mediaSession.setActionHandler('pause', () => pauseRecording());
```

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State Management | Vue Composables | Simple enough for demo, no need for Pinia/Vuex |
| AI Model | whisper-tiny | Fast download (39MB), good enough for demo |
| Audio Format | WebM → WAV conversion | Whisper requires WAV, WebM is native to MediaRecorder |
| Router | Vue Router 4 | Standard for Vue 3 SPAs |
| Styling | Tailwind CSS | Rapid UI development, consistent design |
| Icons | Heroicons | Works well with Tailwind |
| PWA Plugin | vite-plugin-pwa | Best integration with Vite |
