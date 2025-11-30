# Feature Specification: PWA Minute Taker

**Feature Branch**: `001-minute-taker-pwa`  
**Created**: 2025-12-01  
**Status**: Draft  
**Input**: User description: "Build minute taker (meeting note taker) app for demo in session about PWA (~2 hour). The app is SPA and fully works offline, uses edge AI model for transcript text from recorded audio file or real-time live transcription."

## User Scenarios & Testing

### User Story 1 - Record and Transcribe Meeting (Priority: P1)

As a meeting participant, I want to record audio during a meeting and have it automatically transcribed to text, so I can focus on the discussion instead of taking notes.

**Why this priority**: This is the core value proposition of the app. Without recording and transcription, the app has no purpose. This demonstrates the most impressive PWA capabilities: offline AI, OPFS storage, and Web Audio API.

**Independent Test**: Can be fully tested by opening the app, pressing record, speaking for 30 seconds, stopping, and seeing the transcribed text appear. Works without network connection.

**Acceptance Scenarios**:

1. **Given** I am on the main screen, **When** I tap the record button, **Then** the app starts recording audio and shows a recording indicator with elapsed time
2. **Given** I am recording, **When** I speak into the microphone, **Then** the audio is captured and temporarily stored
3. **Given** I am recording, **When** I tap stop, **Then** the recording stops and transcription begins automatically
4. **Given** transcription is processing, **When** the AI model processes audio, **Then** I see a progress indicator and the transcript appears when complete
5. **Given** transcription is complete, **When** I view the result, **Then** I see the full text transcript with timestamps

---

### User Story 2 - Manage Meeting Notes (Priority: P2)

As a user, I want to save, view, edit, and organize my meeting transcripts, so I can reference them later and keep them organized by meeting.

**Why this priority**: After recording, users need to access their notes. This demonstrates OPFS for persistent storage and offline data management.

**Independent Test**: Can be tested by creating a meeting, viewing the list of meetings, opening one to see details, and editing the transcript. All works offline.

**Acceptance Scenarios**:

1. **Given** I have a new transcript, **When** I save it, **Then** I can provide a meeting title and it's stored persistently
2. **Given** I have saved meetings, **When** I open the app, **Then** I see a list of all my meetings with titles and dates
3. **Given** I am viewing a meeting, **When** I tap edit, **Then** I can modify the transcript text
4. **Given** I am viewing the meeting list, **When** I swipe or tap delete, **Then** I can remove a meeting and its associated audio

---

### User Story 3 - Install and Use Offline (Priority: P3)

As a user, I want to install the app on my device and use it completely offline, so I can take meeting notes anywhere without needing internet.

**Why this priority**: This is the core PWA demo feature. It showcases installability, service worker caching, and true offline capability - all essential for the PWA talk.

**Independent Test**: Install the app to home screen, turn on airplane mode, open the app, and verify all features work. Record a meeting, transcribe, and save - all offline.

**Acceptance Scenarios**:

1. **Given** I am on a supported browser, **When** I visit the app, **Then** I see an "Install" prompt or can access install from browser menu
2. **Given** I have installed the app, **When** I open it from home screen, **Then** it opens in standalone mode without browser chrome
3. **Given** the AI model has been downloaded, **When** I go offline, **Then** I can still record, transcribe, and manage notes
4. **Given** I have never used the app, **When** I first open it online, **Then** the AI model downloads with progress indication and is cached for offline use

---

### User Story 4 - Live Real-Time Transcription (Priority: P4)

As a meeting participant in a long meeting, I want to see live transcription as I speak, so I can verify the transcript is accurate in real-time.

**Why this priority**: Advanced feature that demonstrates WebRTC/streaming audio processing. Nice-to-have after core recording works.

**Independent Test**: Start recording, speak continuously, and see text appearing in real-time as you speak.

**Acceptance Scenarios**:

1. **Given** I start recording with live mode enabled, **When** I speak, **Then** I see text appearing progressively as I talk
2. **Given** live transcription is running, **When** the AI processes audio chunks, **Then** the display updates smoothly without freezing

---

### User Story 5 - Import Audio Files (Priority: P5)

As a user, I want to import existing audio files to transcribe, so I can get transcripts of recordings made with other apps.

**Why this priority**: Extends utility and demonstrates Share Target API for PWA.

**Independent Test**: Share an audio file from another app to Minute Taker, or use file picker to import, and see it transcribed.

**Acceptance Scenarios**:

1. **Given** I have an audio file on my device, **When** I use the import button, **Then** I can select the file and it begins transcription
2. **Given** Minute Taker is installed, **When** I share an audio file from another app, **Then** Minute Taker opens and offers to transcribe it

---

### Edge Cases

- What happens when microphone permission is denied? → Show clear error with instructions to enable
- What happens when storage is full (OPFS quota)? → Show warning and suggest deleting old meetings
- What happens when transcription fails? → Keep audio file, allow retry, show error message
- What happens with very long recordings (1+ hour)? → Process in chunks, show progress
- What happens when user closes app during recording? → Use beforeunload warning, save partial recording
- What happens when AI model download fails? → Retry with exponential backoff, allow manual retry

## Requirements

### Functional Requirements

- **FR-001**: System MUST record audio using Web Audio API with MediaRecorder
- **FR-002**: System MUST transcribe audio to text using Transformers.js Whisper model
- **FR-003**: System MUST store audio files in OPFS (Origin Private File System)
- **FR-004**: System MUST store AI model in OPFS for offline use
- **FR-005**: System MUST persist meeting data (title, transcript, date, audio reference) in IndexedDB
- **FR-006**: System MUST work completely offline after initial model download
- **FR-007**: System MUST be installable as a PWA with web app manifest
- **FR-008**: System MUST cache all assets via service worker for offline access
- **FR-009**: Users MUST be able to create, read, update, and delete meeting notes
- **FR-010**: System MUST show model download progress on first use
- **FR-011**: System MUST support audio file import via file picker
- **FR-012**: System SHOULD support Share Target API for receiving audio files
- **FR-013**: System SHOULD support live/streaming transcription
- **FR-014**: System SHOULD use Media Session API for recording controls

### Key Entities

- **Meeting**: Represents a recorded meeting session (id, title, date, transcript, audioFileId, duration)
- **AudioFile**: Audio recording stored in OPFS (id, filename, size, duration, mimeType)
- **TranscriptionResult**: Output from AI model (text, segments with timestamps, language)
- **AppSettings**: User preferences (preferLiveTranscription, theme, language)

## Success Criteria

### Measurable Outcomes

- **SC-001**: App installs successfully on Chrome, Edge, and Safari (iOS 16.4+)
- **SC-002**: Recording and transcription works completely offline after model download
- **SC-003**: Transcription accuracy > 85% for clear English speech
- **SC-004**: Model download and caching completes in < 60 seconds on 10Mbps connection
- **SC-005**: Demo audience can follow along and understand each PWA capability demonstrated
- **SC-006**: All core features (record, transcribe, save, view) work in airplane mode

### PWA Demo Capabilities Checklist

| PWA Feature | Demonstrated By | Demo Action |
|-------------|-----------------|-------------|
| Service Worker | Offline app shell | Turn off network, reload app |
| Web Manifest | Install prompt | Click install, show standalone mode |
| OPFS | Model storage | Show model persists across sessions |
| IndexedDB | Meeting storage | Close app, reopen, meetings persist |
| Web Audio API | Recording | Record audio in app |
| Transformers.js | Edge AI | Transcribe without network |
| Media Session | Lock screen controls | Show controls while recording |
| Share Target | Receive files | Share audio from Files app |
