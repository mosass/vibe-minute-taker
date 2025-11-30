/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// Clean up outdated caches
cleanupOutdatedCaches();

// Precache all assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// Skip waiting and claim clients immediately
self.skipWaiting();
clientsClaim();

// Navigation handler for SPA
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [
    /^\/api\//,
    /\.[a-zA-Z]+$/
  ]
});
registerRoute(navigationRoute);

// Runtime caching for Transformers.js CDN
registerRoute(
  ({ url }) => url.origin === 'https://cdn.jsdelivr.net',
  new CacheFirst({
    cacheName: 'transformers-cdn-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// Runtime caching for Hugging Face Hub
registerRoute(
  ({ url }) => url.origin === 'https://huggingface.co',
  new CacheFirst({
    cacheName: 'huggingface-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// Google Fonts stylesheets
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets'
  })
);

// Google Fonts webfonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// ============================================================================
// SHARE TARGET HANDLER
// ============================================================================

/**
 * Handle POST requests from Web Share Target API
 * 
 * When a user shares an audio file to the app, the browser sends a POST request
 * to /share-target with the file data. We intercept this, store the file info,
 * and redirect to the home page where the app will process the file.
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  // Handle share target POST requests
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

/**
 * Process the shared file and redirect to the app
 */
async function handleShareTarget(request: Request): Promise<Response> {
  try {
    // Get the form data containing the shared file
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    
    if (!audioFile) {
      // No file shared, redirect to home
      return Response.redirect('/', 303);
    }
    
    // Store the file temporarily in a cache
    const cache = await caches.open('shared-files');
    const fileId = `shared-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fileUrl = `/shared-audio/${fileId}`;
    
    // Create a response with the file data
    const fileResponse = new Response(audioFile, {
      headers: {
        'Content-Type': audioFile.type,
        'X-Original-Filename': encodeURIComponent(audioFile.name)
      }
    });
    
    await cache.put(fileUrl, fileResponse);
    
    // Notify the app about the shared file using a client message
    const clients = await self.clients.matchAll({ type: 'window' });
    
    // Store file info for the app to retrieve
    const fileInfo = {
      url: fileUrl,
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    };
    
    // Send message to all window clients
    clients.forEach(client => {
      client.postMessage({
        type: 'SHARED_FILE',
        data: fileInfo
      });
    });
    
    // If no clients are open, store in temporary location for later retrieval
    if (clients.length === 0) {
      // Store in a separate cache for retrieval by the app on next load
      const pendingCache = await caches.open('pending-shares');
      await pendingCache.put('/pending-shared-file', new Response(JSON.stringify(fileInfo), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Redirect to home page with a query parameter to indicate a shared file
    return Response.redirect('/?shared=true', 303);
    
  } catch (error) {
    console.error('Share target error:', error);
    // Redirect to home on error
    return Response.redirect('/', 303);
  }
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'GET_PENDING_SHARE') {
    // Client is asking for pending shared file
    handleGetPendingShare(event);
  }
  
  if (event.data && event.data.type === 'CLEAR_PENDING_SHARE') {
    // Client is done with the pending shared file
    handleClearPendingShare();
  }
});

/**
 * Get pending shared file info
 */
async function handleGetPendingShare(event: ExtendableMessageEvent): Promise<void> {
  try {
    const pendingCache = await caches.open('pending-shares');
    const response = await pendingCache.match('/pending-shared-file');
    
    if (response) {
      const fileInfo = await response.json();
      event.ports[0]?.postMessage({ success: true, data: fileInfo });
    } else {
      event.ports[0]?.postMessage({ success: false });
    }
  } catch {
    event.ports[0]?.postMessage({ success: false });
  }
}

/**
 * Clear pending shared file
 */
async function handleClearPendingShare(): Promise<void> {
  try {
    const pendingCache = await caches.open('pending-shares');
    await pendingCache.delete('/pending-shared-file');
    
    // Also clean up old shared files from the shared-files cache
    const sharedCache = await caches.open('shared-files');
    const keys = await sharedCache.keys();
    
    // Delete files older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const key of keys) {
      const url = new URL(key.url);
      const pathParts = url.pathname.split('-');
      if (pathParts.length >= 2) {
        const timestampStr = pathParts[1];
        if (timestampStr) {
          const timestamp = parseInt(timestampStr, 10);
          if (!isNaN(timestamp) && timestamp < oneHourAgo) {
            await sharedCache.delete(key);
          }
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Retrieve a shared file from the cache
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/shared-audio/'),
  async ({ url }) => {
    const cache = await caches.open('shared-files');
    const response = await cache.match(url.pathname);
    
    if (response) {
      return response;
    }
    
    return new Response('File not found', { status: 404 });
  }
);
