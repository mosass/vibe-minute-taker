# PWA Demo Guide: Minute Taker

**Session Duration**: ~2 hours
**Audience**: Developers learning about Progressive Web Apps
**Goal**: Demonstrate PWA capabilities through a real-world meeting notes app
**Last Updated**: December 2025

---

## Pre-Demo Setup

### Prepare Environment
1. Clear browser data for fresh install experience (or use Incognito)
2. Have Chrome DevTools ready (Application tab)
3. Prepare a second device (phone) for mobile demo
4. Have airplane mode ready to toggle
5. Prepare a sample audio file for import demo
6. **Reset onboarding**: Clear `onboarding-complete` from localStorage

### Network Setup
- Start with online connection
- Be ready to toggle airplane mode for offline demos
- Consider using Chrome DevTools Network throttling for slow connection demo

---

## Demo Script

### Part 0: Onboarding Experience (5 min) ✨ NEW

#### Demo Action: First-Time User Flow
1. Open app in a fresh browser/incognito
2. **Show onboarding wizard**:
   - Welcome screen with app introduction
   - Feature highlights (recording, AI, offline, privacy)
   - Microphone permission request
   - AI model download prompt
3. "This guided setup ensures users understand the app and have everything ready"

**Key Message**: "First impressions matter - a good onboarding reduces confusion and support requests."

---

### Part 1: Introduction to PWA (15 min)

#### Talking Points
- "What makes a Progressive Web App?"
  - Works offline
  - Installable
  - App-like experience
  - Push notifications (optional)
  - Access to device APIs

- "Why PWA for a Meeting Notes app?"
  - Works in meeting rooms with poor WiFi
  - No app store approval needed
  - Cross-platform from single codebase
  - Privacy - data stays on device

#### Demo Action: First Visit
1. Open app in browser (show URL bar)
2. **DevTools → Application → Manifest**
   - Show manifest.json properties
   - Point out icons, theme color, display mode
3. **DevTools → Application → Service Workers**
   - Show service worker registration
   - Explain caching strategy

**Key Message**: "This is a website, but it has all the metadata to become an app."

---

### Part 2: The Service Worker (20 min)

#### Talking Points
- "Service Worker = Programmable network proxy"
- "Intercepts all network requests"
- "Can serve cached responses when offline"
- "Runs in background, separate from page"

#### Demo Action: Caching in Action
1. **DevTools → Network tab**
2. Reload page, show requests being served
3. **DevTools → Application → Cache Storage**
   - Show what's cached (HTML, JS, CSS, icons)
   - Explain precaching vs runtime caching

```javascript
// Show code snippet (don't run, just explain)
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
  runtimeCaching: [/* CDN resources */]
}
```

#### Demo Action: Offline Mode
1. **DevTools → Network → Offline** (or airplane mode)
2. Reload page
3. "App still loads! From cache."
4. Navigate around the app
5. Show "Offline" indicator in UI

**Key Message**: "The app shell loads instantly from cache, even offline."

---

### Part 3: Installation (15 min)

#### Talking Points
- "PWAs can be installed like native apps"
- "No app store, instant install"
- "Criteria: HTTPS, manifest, service worker"
- "Browser shows install prompt automatically"

#### Demo Action: Install Flow
1. Show install prompt banner in app (if visible)
2. Click three-dot menu → "Install Minute Taker"
3. Show installation dialog
4. Complete installation
5. **Close browser completely**
6. Open from dock/home screen
7. "No URL bar! Standalone mode!"

#### Demo Action: Mobile Install
1. On phone, open the app URL
2. Show "Add to Home Screen" flow
3. Open from home screen
4. Show full-screen app experience

**Key Message**: "Users get the app experience, you keep web deployment flexibility."

---

### Part 4: Edge AI with Transformers.js (25 min)

#### Talking Points
- "AI models running in the browser"
- "No server needed, complete privacy"
- "Whisper model for speech-to-text"
- "ONNX Runtime Web + WebAssembly"

#### Demo Action: Model Download
1. On first use, show model download progress
2. Explain model size (~39MB for whisper-tiny)
3. **DevTools → Application → Storage**
   - Show OPFS (Origin Private File System)
   - Model files stored persistently
4. "Model downloads once, cached forever"

#### Demo Action: Recording
1. Click record button
2. Speak for 30 seconds
3. Show waveform visualization (Web Audio API)
4. Click stop
5. Watch transcription progress
6. See transcript appear

```javascript
// Show key code (explain, don't type)
const transcriber = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-tiny'
);
const result = await transcriber(audioData);
```

#### Demo Action: Offline Transcription
1. Toggle airplane mode ON
2. Record new audio
3. Stop and transcribe
4. "AI runs completely offline!"

**Key Message**: "Edge AI = privacy + offline capability. Data never leaves the device."

---

### Part 5: OPFS - Origin Private File System (15 min)

#### Talking Points
- "New storage API for large files"
- "Persistent, survives clear browsing data"
- "Better performance than IndexedDB for files"
- "Private to origin, not visible in file manager"

#### Demo Action: Storage Inspection
1. **DevTools → Application → Storage**
2. Show OPFS section
3. Navigate structure: `/audio/`, `/models/`
4. Explain storage quota

```javascript
// Key code
const root = await navigator.storage.getDirectory();
const audioDir = await root.getDirectoryHandle('audio', { create: true });
const fileHandle = await audioDir.getFileHandle('recording.webm', { create: true });
```

#### Demo Action: Storage Estimate
1. Show Settings page with storage info
2. Explain quota (typically 60% of free space)
3. Discuss when to clean up old files

**Key Message**: "OPFS is perfect for ML models and media files - large, persistent, fast."

---

### Part 6: Web APIs in Action (15 min)

#### Media Session API
1. Start recording
2. Show lock screen / notification controls
3. Pause/resume from outside the app

```javascript
navigator.mediaSession.metadata = new MediaMetadata({
  title: 'Recording Meeting',
  artist: 'Minute Taker'
});
navigator.mediaSession.setActionHandler('pause', () => {...});
```

#### Share Target API
1. From another app, share an audio file
2. Minute Taker appears as share option
3. Audio imports and transcribes

```json
// In manifest.json
"share_target": {
  "action": "/share-target",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": { "files": [{ "name": "audio", "accept": ["audio/*"] }] }
}
```

#### Online/Offline Events
```javascript
window.addEventListener('online', updateUI);
window.addEventListener('offline', updateUI);
```

**Key Message**: "PWAs have access to many native-like APIs."

---

### Part 7: Meeting Management (10 min)

#### Demo Action: CRUD Operations
1. Show list of saved meetings
2. Open a meeting, show transcript
3. Edit transcript, auto-save
4. Delete a meeting
5. Show data persists after app close

#### Demo Action: Audio Playback ✨ NEW
1. Open a saved meeting
2. Click "Play Audio" button
3. **Show audio player controls**:
   - Play/pause toggle
   - Seek bar with time display
   - Skip forward/backward 10s
   - Close button
4. "Original audio is preserved in OPFS alongside the transcript"

#### IndexedDB
1. **DevTools → Application → IndexedDB**
2. Show `minute-taker-db`
3. Explore `meetings` and `audioFiles` object stores

**Key Message**: "Structured data in IndexedDB, files in OPFS - best of both worlds."

---

### Part 8: Performance & Best Practices (10 min)

#### Lighthouse Audit
1. **DevTools → Lighthouse → Progressive Web App**
2. Run audit
3. Review PWA checklist items

#### Key Performance Metrics
- First Contentful Paint
- Time to Interactive
- Offline capability

#### Best Practices Discussed
- Precache app shell
- Lazy load AI model
- Use Web Workers for heavy processing
- Progressive enhancement

**Key Message**: "PWAs should be fast, reliable, and installable."

---

## PWA Features Checklist

| Feature | Demo Action | Talking Point |
|---------|-------------|---------------|
| ✅ Service Worker | Show SW in DevTools | Network proxy, caching |
| ✅ Web Manifest | Show manifest.json | App metadata, icons |
| ✅ Installable | Install to home screen | No app store needed |
| ✅ Offline Mode | Airplane mode test | Works without network |
| ✅ OPFS | Storage in DevTools | Large file storage |
| ✅ IndexedDB | Show databases | Structured data |
| ✅ Web Audio | Recording waveform | Audio capture |
| ✅ Transformers.js | Transcription | Edge AI |
| ✅ Media Session | Lock screen controls | Native integration |
| ✅ Share Target | Share from Files | Receive shared files |
| ✅ Responsive | Desktop + Mobile | One codebase |
| ✅ Onboarding | First-run wizard | User guidance |
| ✅ Audio Playback | Play saved recordings | OPFS audio streaming |
| ✅ Toast Notifications | Success/error feedback | User feedback |
| ✅ Loading Skeletons | Async content placeholders | Perceived performance |

---

## Troubleshooting

### Common Issues

**Install prompt doesn't appear**
- Already installed
- Not on HTTPS
- Manifest invalid
- Check Chrome://flags for PWA settings

**Offline doesn't work**
- Service worker not registered
- Cache not populated
- Check DevTools Application tab

**Model download fails**
- Check network connectivity
- Verify CDN accessibility
- Check CORS headers

**Recording fails**
- Microphone permission denied
- Check browser settings
- HTTPS required

---

## Code Highlights for Deep Dives

### Service Worker Registration
```javascript
// vite-plugin-pwa handles this automatically
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });
```

### OPFS Write
```javascript
const root = await navigator.storage.getDirectory();
const file = await root.getFileHandle('data.json', { create: true });
const writable = await file.createWritable();
await writable.write(JSON.stringify(data));
await writable.close();
```

### Web Audio Recording
```javascript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.start(1000); // Collect every second
```

### Transformers.js Pipeline
```javascript
import { pipeline } from '@huggingface/transformers';
const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
const result = await transcriber(audioBuffer, { return_timestamps: true });
```

---

## Q&A Topics to Prepare

1. **PWA vs Native Apps** - When to choose each
2. **Browser Support** - Which features work where
3. **iOS Limitations** - Push notifications, storage quota
4. **Security** - HTTPS requirement, origin isolation
5. **Updates** - How service worker updates work
6. **Debugging** - DevTools tips and tricks
7. **Model Size** - Tradeoffs for edge AI
8. **OPFS vs Cache API** - When to use which

---

## Resources to Share

- [web.dev/learn/pwa](https://web.dev/learn/pwa/)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [OPFS Explainer](https://web.dev/file-system-access/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developer.chrome.com/docs/workbox/)
