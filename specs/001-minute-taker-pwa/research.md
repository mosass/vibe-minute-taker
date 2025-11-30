# Technical Research: PWA Minute Taker

## 1. Transformers.js for Speech-to-Text

### Overview
Transformers.js is a JavaScript library that runs Hugging Face models directly in the browser using WebAssembly (ONNX Runtime). It enables edge AI without sending data to servers.

### Whisper Model Options

| Model | Size | Quality | Download Time (10Mbps) |
|-------|------|---------|------------------------|
| whisper-tiny | 39 MB | Basic | ~30s |
| whisper-base | 74 MB | Good | ~60s |
| whisper-small | 244 MB | Better | ~3min |
| whisper-medium | 769 MB | Great | ~10min |

**Recommendation**: Use `whisper-tiny` for demo (fastest download), with option to upgrade.

### Usage Pattern

```typescript
import { pipeline } from '@huggingface/transformers';

// Initialize (downloads model on first run)
const transcriber = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-tiny',
  { 
    progress_callback: (progress) => console.log(progress),
    // Cache model in OPFS
    cache_dir: '/models'
  }
);

// Transcribe audio
const result = await transcriber(audioData, {
  chunk_length_s: 30,
  stride_length_s: 5,
  return_timestamps: true
});

// Result structure
{
  text: "Hello, this is a test...",
  chunks: [
    { timestamp: [0.0, 2.5], text: "Hello" },
    { timestamp: [2.5, 4.0], text: "this is" },
    // ...
  ]
}
```

### Web Worker Integration

Run transcription in a Web Worker to avoid blocking the UI:

```typescript
// transcription.worker.ts
import { pipeline } from '@huggingface/transformers';

let transcriber = null;

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    self.postMessage({ type: 'ready' });
  }
  
  if (e.data.type === 'transcribe') {
    const result = await transcriber(e.data.audio, { return_timestamps: true });
    self.postMessage({ type: 'result', data: result });
  }
};
```

## 2. OPFS (Origin Private File System)

### Overview
OPFS provides a private file system unique to the origin, perfect for storing large files like AI models and audio recordings.

### Browser Support
- Chrome 102+, Edge 102+, Firefox 111+, Safari 15.2+
- Full synchronous access only in Web Workers

### Basic Operations

```typescript
// Get OPFS root
const root = await navigator.storage.getDirectory();

// Create directory
const audioDir = await root.getDirectoryHandle('audio', { create: true });

// Write file
const fileHandle = await audioDir.getFileHandle('recording.webm', { create: true });
const writable = await fileHandle.createWritable();
await writable.write(audioBlob);
await writable.close();

// Read file
const file = await fileHandle.getFile();
const arrayBuffer = await file.arrayBuffer();

// Delete file
await audioDir.removeEntry('recording.webm');

// List files
for await (const [name, handle] of audioDir.entries()) {
  console.log(name, handle.kind); // 'file' or 'directory'
}
```

### Storage Quota

```typescript
const estimate = await navigator.storage.estimate();
console.log(`Used: ${estimate.usage} bytes`);
console.log(`Available: ${estimate.quota} bytes`);

// Request persistent storage
const persisted = await navigator.storage.persist();
```

## 3. Service Worker & PWA Configuration

### vite-plugin-pwa Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Minute Taker - Meeting Notes',
        short_name: 'Minutes',
        description: 'Record and transcribe meetings with AI',
        theme_color: '#3b82f6',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [{
              name: 'audio',
              accept: ['audio/*']
            }]
          }
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ]
});
```

### Install Prompt Handling

```typescript
// useInstallPrompt.ts
import { ref } from 'vue';

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isInstallable = ref(false);

export function useInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    isInstallable.value = true;
  });

  async function install() {
    if (!deferredPrompt.value) return;
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    deferredPrompt.value = null;
    isInstallable.value = false;
    return outcome;
  }

  return { isInstallable, install };
}
```

## 4. Web Audio API for Recording

### MediaRecorder API

```typescript
export async function createRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000  // Whisper expects 16kHz
    } 
  });

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus'
  });

  const chunks: Blob[] = [];
  
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return {
    start: () => mediaRecorder.start(1000), // Collect every 1s
    stop: () => new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'audio/webm' }));
      };
      mediaRecorder.stop();
      stream.getTracks().forEach(t => t.stop());
    }),
    pause: () => mediaRecorder.pause(),
    resume: () => mediaRecorder.resume()
  };
}
```

### Audio Visualization (Waveform)

```typescript
export function createVisualizer(stream: MediaStream) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function getAmplitude(): number {
    analyser.getByteFrequencyData(dataArray);
    return dataArray.reduce((a, b) => a + b) / dataArray.length;
  }

  return { getAmplitude, cleanup: () => audioContext.close() };
}
```

### WebM to WAV Conversion

Whisper requires WAV format. Convert using Web Audio API:

```typescript
async function webmToWav(webmBlob: Blob): Promise<Float32Array> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Get mono channel (Whisper expects mono)
  const channelData = audioBuffer.getChannelData(0);
  
  await audioContext.close();
  return channelData;
}
```

## 5. Media Session API

```typescript
function setupMediaSession(actions: {
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
}) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'Recording Meeting',
    artist: 'Minute Taker',
    album: 'Meeting Notes'
  });

  navigator.mediaSession.setActionHandler('pause', actions.onPause);
  navigator.mediaSession.setActionHandler('play', actions.onPlay);
  navigator.mediaSession.setActionHandler('stop', actions.onStop);
}
```

## 6. Share Target API

Handle incoming shared files via service worker:

```typescript
// In service worker (sw.ts)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/share-target') && 
      event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event));
  }
});

async function handleShareTarget(event: FetchEvent) {
  const formData = await event.request.formData();
  const audioFile = formData.get('audio');
  
  // Store file and redirect to transcription
  // Client will pick up file from IndexedDB
  const clients = await self.clients.matchAll();
  clients[0]?.postMessage({ type: 'shared-audio', file: audioFile });
  
  return Response.redirect('/meetings/new?shared=true', 303);
}
```

## 7. IndexedDB with idb Library

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MinuteTakerDB extends DBSchema {
  meetings: {
    key: string;
    value: Meeting;
    indexes: { 'createdAt': Date };
  };
  audioFiles: {
    key: string;
    value: AudioFile;
  };
}

export async function getDB(): Promise<IDBPDatabase<MinuteTakerDB>> {
  return openDB<MinuteTakerDB>('minute-taker', 1, {
    upgrade(db) {
      const meetingStore = db.createObjectStore('meetings', { keyPath: 'id' });
      meetingStore.createIndex('createdAt', 'createdAt');
      
      db.createObjectStore('audioFiles', { keyPath: 'id' });
    }
  });
}

// Usage
const db = await getDB();
await db.put('meetings', meeting);
const meetings = await db.getAllFromIndex('meetings', 'createdAt');
```

## 8. Online/Offline Detection

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useOnlineStatus() {
  const isOnline = ref(navigator.onLine);

  const updateStatus = () => {
    isOnline.value = navigator.onLine;
  };

  onMounted(() => {
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
  });

  onUnmounted(() => {
    window.removeEventListener('online', updateStatus);
    window.removeEventListener('offline', updateStatus);
  });

  return { isOnline };
}
```
