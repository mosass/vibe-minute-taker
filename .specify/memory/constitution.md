# PWA Minute Taker Constitution

## Core Principles

### I. PWA-First Development
Every feature must leverage Progressive Web App capabilities to the fullest. The app must work completely offline, be installable, and provide a native-like experience. PWA features are not afterthoughts but core requirements.

### II. Edge AI Processing
All AI processing happens locally in the browser using Transformers.js. No data is sent to external servers. User privacy is paramount - audio and transcripts never leave the device.

### III. Offline-Complete Functionality
The app must be fully functional without network connectivity. All features including recording, transcription, and note management must work offline. Online connectivity should only enhance, never be required.

### IV. Demo-Ready Development
This app serves as a demo for a ~2 hour PWA session. Code should be clear, well-documented, and showcase PWA capabilities in a way that's easy to explain and demonstrate. Each PWA feature should be visibly demonstrable.

### V. Simplicity & Clarity
Since this is a demo app, prioritize clarity over complexity. Use straightforward implementations that clearly demonstrate PWA concepts. Avoid over-engineering - the goal is education, not production scale.

## Technical Constraints

### Technology Stack
- **Framework**: Vue.js 3 (Composition API, SPA)
- **Styling**: Tailwind CSS
- **AI**: Transformers.js (Whisper model for speech-to-text)
- **Storage**: OPFS (Origin Private File System) for models and audio
- **Build**: Vite with PWA plugin

### PWA Requirements (Must Demonstrate)
1. **Service Worker**: Offline caching of all app assets
2. **Web App Manifest**: Installable with app icon and splash
3. **OPFS**: Store large files (AI models, audio recordings)
4. **Web Audio API**: Recording and audio processing
5. **Background Sync** (optional): Queue actions when offline
6. **Push Notifications** (optional): Meeting reminders
7. **Media Session API**: Control recording from lock screen
8. **Share Target**: Receive shared audio files

### Performance Standards
- First load: < 3 seconds on 3G
- Time to interactive: < 5 seconds
- Model loading: Progressive with status indicator
- Audio recording: Real-time without drops

## Development Workflow

### Code Organization
Single-project Vue.js SPA structure with clear component separation. Keep related code together for demo clarity.

### Documentation
All PWA features must be documented with:
- What capability it demonstrates
- How to trigger/show in demo
- Why it matters for PWA

## Governance

This constitution guides all development decisions. When in doubt:
1. Does it work offline? (must)
2. Does it demonstrate a PWA feature? (should)
3. Is it easy to explain in a demo? (should)
4. Is it the simplest solution? (prefer)

**Version**: 1.0.0 | **Ratified**: 2025-12-01 | **Last Amended**: 2025-12-01
