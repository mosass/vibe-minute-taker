/**
 * Browser and device detection utilities
 * Used for feature detection and compatibility checks
 */

export interface BrowserInfo {
    isIOS: boolean;
    isSafari: boolean;
    isChrome: boolean;
    isFirefox: boolean;
    isMobile: boolean;
    iosVersion: number | null;
    safariVersion: number | null;
}

/**
 * Detect browser and device information
 */
export function detectBrowser(): BrowserInfo {
    const ua = navigator.userAgent;

    // iOS detection (includes iPad in desktop mode)
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Safari detection (excluding Chrome on iOS which uses Safari engine)
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

    // Chrome detection
    const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);

    // Firefox detection
    const isFirefox = /Firefox/.test(ua);

    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (navigator.maxTouchPoints > 1);

    // iOS version
    let iosVersion: number | null = null;
    if (isIOS) {
        const match = ua.match(/OS (\d+)_/);
        if (match) {
            iosVersion = parseInt(match[1] as string, 10);
        }
    }

    // Safari version
    let safariVersion: number | null = null;
    if (isSafari) {
        const match = ua.match(/Version\/(\d+)/);
        if (match) {
            safariVersion = parseInt(match[1] as string, 10);
        }
    }

    return {
        isIOS,
        isSafari,
        isChrome,
        isFirefox,
        isMobile,
        iosVersion,
        safariVersion,
    };
}

/**
 * Check if WebAssembly is fully supported
 */
export function isWebAssemblySupported(): boolean {
    try {
        if (typeof WebAssembly !== 'object') {
            return false;
        }

        // Check for basic WASM support
        if (typeof WebAssembly.instantiate !== 'function') {
            return false;
        }

        // Check for streaming compilation (important for large models)
        if (typeof WebAssembly.instantiateStreaming !== 'function') {
            console.warn('WebAssembly.instantiateStreaming not available, falling back to slower method');
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Check if SharedArrayBuffer is available (needed for some WASM features)
 * Note: Requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers
 */
export function isSharedArrayBufferAvailable(): boolean {
    try {
        return typeof SharedArrayBuffer !== 'undefined';
    } catch {
        return false;
    }
}

/**
 * Check overall transcription compatibility
 * Returns an object with support status and any warnings/errors
 */
export interface TranscriptionCompatibility {
    isSupported: boolean;
    hasWarnings: boolean;
    warnings: string[];
    errors: string[];
    recommendation: string | null;
}

export function checkTranscriptionCompatibility(): TranscriptionCompatibility {
    const browser = detectBrowser();
    const warnings: string[] = [];
    const errors: string[] = [];
    let isSupported = true;

    // Check WebAssembly
    if (!isWebAssemblySupported()) {
        errors.push('WebAssembly is not supported in this browser');
        isSupported = false;
    }

    // Check Web Workers
    if (typeof Worker === 'undefined') {
        errors.push('Web Workers are not supported in this browser');
        isSupported = false;
    }

    // Check AudioContext
    if (typeof AudioContext === 'undefined' && typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext === 'undefined') {
        errors.push('Web Audio API is not supported in this browser');
        isSupported = false;
    }

    // iOS-specific checks
    if (browser.isIOS) {
        if (browser.iosVersion && browser.iosVersion < 15) {
            errors.push('iOS 15 or later is required for transcription');
            isSupported = false;
        } else if (browser.iosVersion && browser.iosVersion < 17) {
            warnings.push('For best performance, update to iOS 17 or later');
        }

        // Warn about memory limitations
        warnings.push('Large audio files may cause issues on mobile devices due to memory limits');
    }

    // Safari-specific checks
    if (browser.isSafari && !browser.isIOS) {
        if (browser.safariVersion && browser.safariVersion < 15) {
            warnings.push('Safari 15 or later is recommended for best compatibility');
        }
    }

    // Determine recommendation
    let recommendation: string | null = null;
    if (!isSupported) {
        if (browser.isIOS && browser.iosVersion && browser.iosVersion < 15) {
            recommendation = 'Please update your iOS to version 15 or later';
        } else {
            recommendation = 'Please try using Chrome or Firefox on a desktop computer';
        }
    } else if (warnings.length > 0 && browser.isMobile) {
        recommendation = 'For best results, try using a desktop browser';
    }

    return {
        isSupported,
        hasWarnings: warnings.length > 0,
        warnings,
        errors,
        recommendation,
    };
}

/**
 * Get a user-friendly browser name
 */
export function getBrowserName(): string {
    const browser = detectBrowser();

    if (browser.isIOS) {
        return browser.isSafari ? 'Safari on iOS' : 'iOS Browser';
    }
    if (browser.isSafari) {
        return 'Safari';
    }
    if (browser.isChrome) {
        return 'Chrome';
    }
    if (browser.isFirefox) {
        return 'Firefox';
    }
    return 'Unknown Browser';
}
