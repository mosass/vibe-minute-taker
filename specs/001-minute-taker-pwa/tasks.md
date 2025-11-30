# Tasks: PWA Minute Taker

**Input**: Design documents from `/specs/001-minute-taker-pwa/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization, build configuration, and PWA setup

- [x] T001 Initialize Vue 3 + Vite project with TypeScript at repository root
- [x] T002 Configure Tailwind CSS with custom theme colors
- [x] T003 [P] Configure vite-plugin-pwa with manifest and service worker
- [x] T004 [P] Create PWA icons (192x192, 512x512, maskable) in `public/icons/`
- [x] T005 [P] Create TypeScript type definitions in `src/types/meeting.ts`, `src/types/audio.ts`, `src/types/transcription.ts`
- [x] T006 [P] Set up Vue Router with routes for Home, Meetings, MeetingDetail, Settings in `src/router/index.ts`
- [x] T007 [P] Create utility functions in `src/utils/formatters.ts` (date, duration formatting)
- [x] T008 [P] Create constants in `src/utils/constants.ts` (DB name, model IDs, etc.)

**Checkpoint**: ✅ Project builds, runs dev server, PWA manifest visible in DevTools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for storage and services - MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Implement IndexedDB service in `src/services/db.service.ts` using idb library
- [x] T010 Implement OPFS service in `src/services/opfs.service.ts` for file operations
- [x] T011 [P] Create `useOnlineStatus` composable in `src/composables/useOnlineStatus.ts`
- [x] T012 [P] Create `useInstallPrompt` composable in `src/composables/useInstallPrompt.ts`
- [x] T013 Create base layout components:
  - `src/components/common/AppHeader.vue` - Header with title and status
  - `src/components/common/BottomNav.vue` - Navigation tabs
  - `src/components/common/ProgressBar.vue` - Reusable progress
  - `src/components/common/EmptyState.vue` - Empty list placeholder
- [x] T014 Create `src/App.vue` with layout structure and router-view
- [x] T015 Create `src/components/setup/OfflineIndicator.vue` for network status

**Checkpoint**: Foundation ready - can store/retrieve data in IndexedDB and OPFS, app shell renders

---

## Phase 3: User Story 1 - Record and Transcribe Meeting (Priority: P1) 🎯 MVP

**Goal**: User can record audio and get automatic transcription using edge AI

**Independent Test**: Open app → Press record → Speak → Stop → See transcript

### Core Recording Implementation

- [x] T016 [US1] Create audio recording service in `src/services/audio.service.ts`:
  - MediaRecorder setup with audio constraints
  - Start/stop/pause/resume controls
  - Chunk collection and blob creation
- [x] T017 [US1] Create `useAudioRecorder` composable in `src/composables/useAudioRecorder.ts`:
  - Expose reactive recording state
  - Handle microphone permissions
  - Track elapsed time

### AI Model & Transcription

- [x] T018 [US1] Create transcription worker in `src/workers/transcription.worker.ts`:
  - Load Whisper model from Transformers.js
  - Handle init, transcribe, progress messages
  - Return transcription with timestamps
- [x] T019 [US1] Create model service in `src/services/model.service.ts`:
  - Download model to OPFS on first use
  - Track download progress
  - Check if model exists
- [x] T020 [US1] Create `useModelManager` composable in `src/composables/useModelManager.ts`:
  - Model status (downloading, ready, error)
  - Progress percentage
  - Retry functionality
- [x] T021 [US1] Create transcription service in `src/services/transcription.service.ts`:
  - Initialize worker
  - Convert WebM to WAV for Whisper
  - Handle transcription result

### Recording UI Components

- [x] T022 [P] [US1] Create `src/components/recording/RecordButton.vue`:
  - Large FAB-style record button
  - Visual states: idle, recording, processing
- [x] T023 [P] [US1] Create `src/components/recording/RecordingTimer.vue`:
  - Elapsed time display (MM:SS)
  - Pulsing recording indicator
- [x] T024 [P] [US1] Create `src/components/recording/WaveformVisualizer.vue`:
  - Real-time audio amplitude visualization
  - Canvas-based animation
- [x] T025 [P] [US1] Create `src/components/recording/RecordingControls.vue`:
  - Pause/resume button
  - Stop button
  - Cancel button

### Transcription UI Components

- [x] T026 [P] [US1] Create `src/components/transcription/TranscriptionProgress.vue`:
  - Processing spinner/animation
  - Progress percentage
  - Status messages
- [x] T027 [P] [US1] Create `src/components/transcription/TranscriptView.vue`:
  - Display transcript text
  - Show timestamps for segments
  - Scrollable container

### Model Download UI

- [x] T028 [US1] Create `src/components/setup/ModelDownloader.vue`:
  - First-run experience
  - Download progress bar
  - Size estimate and ETA
  - Error handling with retry

### Main Recording View

- [x] T029 [US1] Create `src/views/HomeView.vue`:
  - Check model status on mount
  - Show ModelDownloader if needed
  - Recording interface when ready
  - Transition to transcription
  - Save result to meeting

**Checkpoint US1**: Can record meeting, transcribe offline, save result

---

## Phase 4: User Story 2 - Manage Meeting Notes (Priority: P2)

**Goal**: User can save, view, edit, and delete meeting transcripts

**Independent Test**: View meeting list → Open meeting → Edit title → Delete meeting

### Meeting Data Service

- [ ] T030 [US2] Create `useMeetings` composable in `src/composables/useMeetings.ts`:
  - CRUD operations for meetings
  - Load all meetings sorted by date
  - Get single meeting by ID
  - Update meeting (title, transcript)
  - Delete meeting and associated audio

### Meeting List Components

- [ ] T031 [P] [US2] Create `src/components/meetings/MeetingCard.vue`:
  - Meeting title, date, duration
  - Transcript preview (first 100 chars)
  - Status indicator
  - Swipe-to-delete gesture
- [ ] T032 [US2] Create `src/components/meetings/MeetingList.vue`:
  - List of MeetingCard components
  - Empty state when no meetings
  - Loading state

### Meeting Detail Components

- [ ] T033 [P] [US2] Create `src/components/transcription/TranscriptEditor.vue`:
  - Editable textarea for transcript
  - Auto-save on blur
  - Character count
- [ ] T034 [US2] Create `src/components/meetings/MeetingDetail.vue`:
  - Meeting header (title, date, duration)
  - Full transcript view
  - Edit mode toggle
  - Delete confirmation
  - Audio playback button

### Meeting Views

- [ ] T035 [US2] Create `src/views/MeetingsView.vue`:
  - Header with title
  - MeetingList component
  - Navigation to detail
- [ ] T036 [US2] Create `src/views/MeetingDetailView.vue`:
  - Load meeting by route param
  - MeetingDetail component
  - Back navigation

**Checkpoint US2**: Full meeting CRUD working, all data persists offline

---

## Phase 5: User Story 3 - Install and Use Offline (Priority: P3)

**Goal**: App is installable as PWA and works completely offline

**Independent Test**: Install to home screen → Airplane mode → Full functionality

### PWA Install Experience

- [ ] T037 [US3] Create `src/components/setup/InstallPrompt.vue`:
  - Banner prompting install
  - Install button with proper handling
  - Dismiss/later option
  - Show only on supported browsers
- [ ] T038 [US3] Integrate InstallPrompt in App.vue:
  - Show after first successful recording
  - Persist dismissal preference
  - Handle already installed state

### Offline Enhancements

- [ ] T039 [US3] Enhance service worker configuration in `vite.config.ts`:
  - Precache all app assets
  - Cache Transformers.js CDN resources
  - Handle offline fallback
- [ ] T040 [US3] Add offline-aware UI throughout app:
  - Show OfflineIndicator in header when offline
  - Disable model download button when offline
  - Show "Works offline" badge when model ready

### Settings View

- [ ] T041 [US3] Create `src/views/SettingsView.vue`:
  - App info section
  - Model status (downloaded/size)
  - Storage usage display
  - Clear data option
  - Install button (if not installed)
  - PWA debug info for demo

**Checkpoint US3**: App installable, fully functional offline after model download

---

## Phase 6: User Story 4 - Live Real-Time Transcription (Priority: P4)

**Goal**: See transcription appearing in real-time as user speaks

**Independent Test**: Start recording with live mode → Speak → Text appears progressively

### Streaming Transcription

- [ ] T042 [US4] Enhance transcription worker for streaming in `src/workers/transcription.worker.ts`:
  - Process audio in chunks
  - Send partial results
  - Merge final transcript
- [ ] T043 [US4] Create `useTranscription` composable in `src/composables/useTranscription.ts`:
  - Support both batch and streaming modes
  - Reactive partial transcript
  - Combine chunks into full transcript
- [ ] T044 [US4] Update HomeView for live transcription:
  - Toggle switch for live mode
  - Show partial transcript during recording
  - Handle mode preference

**Checkpoint US4**: Real-time transcription working during recording

---

## Phase 7: User Story 5 - Import Audio Files (Priority: P5)

**Goal**: Import existing audio files for transcription

**Independent Test**: Import audio file → See it transcribed → Saved as meeting

### File Import

- [ ] T045 [US5] Create `useOPFS` composable in `src/composables/useOPFS.ts`:
  - Save file to OPFS
  - Read file from OPFS
  - Delete file from OPFS
  - List files
- [ ] T046 [US5] Add import functionality to HomeView:
  - File picker button
  - Accept audio/* files
  - Show import progress
  - Trigger transcription
- [ ] T047 [US5] Handle Share Target in service worker:
  - Receive shared audio files
  - Store in temp location
  - Notify app to process

### Import UI

- [ ] T048 [P] [US5] Create import button component in HomeView:
  - Secondary action below record button
  - File picker trigger
  - Supported format hints

**Checkpoint US5**: Can import audio files and share from other apps

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final polish, demo preparation, and cross-cutting improvements

- [ ] T049 [P] Add Media Session API integration for recording controls:
  - Update `src/services/audio.service.ts`
  - Show metadata when recording
  - Handle media key events
- [ ] T050 [P] Add loading skeletons for async content:
  - Meeting list skeleton
  - Meeting detail skeleton
- [ ] T051 [P] Add error handling and toast notifications:
  - Create toast composable
  - Show errors for recording/transcription failures
  - Success messages for save/delete
- [ ] T052 Add onboarding/welcome screen for first-time users:
  - Brief app introduction
  - Model download prompt
  - Microphone permission request
- [ ] T053 [P] Add audio playback for saved recordings:
  - Play button in MeetingDetail
  - Simple audio player controls
- [ ] T054 Create `specs/001-minute-taker-pwa/pwa-demo-guide.md`:
  - Step-by-step demo script
  - Each PWA feature to highlight
  - Talking points for 2-hour session
- [ ] T055 Final testing and bug fixes:
  - Test offline mode completely
  - Test on Chrome, Edge, Safari
  - Test install flow on mobile

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: Depend on Foundational completion
  - US1 (P1): Core MVP - implement first
  - US2 (P2): Needs US1 for testing with real meetings
  - US3 (P3): Can start after US1, benefits from US2
  - US4 (P4): Needs US1 transcription infrastructure
  - US5 (P5): Needs US1 transcription, can run parallel to US4
- **Polish (Phase 8)**: After all user stories desired are complete

### Critical Path for Demo-Ready MVP

```
Setup → Foundational → US1 (Record/Transcribe) → US3 (Install/Offline) → Demo Ready
                                ↓
                          US2 (Manage Notes) ← Nice to have for demo
```

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:
- T003, T004, T005, T006, T007, T008 (Setup)
- T011, T012 (Foundation)
- T022-T027 (US1 UI components)
- T031, T033 (US2 components)

---

## Time Estimates (for planning)

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1: Setup | T001-T008 | 2-3h |
| Phase 2: Foundational | T009-T015 | 3-4h |
| Phase 3: US1 Recording | T016-T029 | 6-8h |
| Phase 4: US2 Meetings | T030-T036 | 3-4h |
| Phase 5: US3 PWA/Offline | T037-T041 | 2-3h |
| Phase 6: US4 Live Transcription | T042-T044 | 2-3h |
| Phase 7: US5 Import | T045-T048 | 2h |
| Phase 8: Polish | T049-T055 | 3-4h |
| **Total** | 55 tasks | **23-31h** |

### Minimum Demo MVP

For a working demo focusing on PWA capabilities:
- Phase 1 + Phase 2 + Phase 3 (US1) + Phase 5 (US3) = ~13-18h
- This gives: Recording, Transcription, Offline, Install

---

## Notes

- All paths are relative to repository root
- Use `idb` library for IndexedDB (simpler API)
- Use `@huggingface/transformers` for Whisper
- Test on HTTPS (required for Service Worker and MediaRecorder)
- Use `npx serve dist` to test production build locally with HTTPS
