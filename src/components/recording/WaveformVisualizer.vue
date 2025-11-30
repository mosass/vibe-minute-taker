<script setup lang="ts">
/**
 * WaveformVisualizer - Real-time audio amplitude visualization
 * Canvas-based animated waveform display
 */

import { ref, onMounted, onUnmounted, watch, computed } from 'vue';

interface Props {
  /** Current amplitude value (0-1) */
  amplitude?: number;
  /** Whether visualization is active */
  active?: boolean;
  /** Number of bars in the visualization */
  barCount?: number;
  /** Color variant */
  variant?: 'primary' | 'recording';
  /** Height of the visualizer in pixels */
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  amplitude: 0,
  active: false,
  barCount: 20,
  variant: 'primary',
  height: 64
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number | null = null;

// Store historical amplitude values for smooth visualization
const amplitudeHistory = ref<number[]>([]);
const maxHistoryLength = computed(() => props.barCount);

// Get color based on variant
const getColor = (opacity: number = 1) => {
  if (props.variant === 'recording') {
    return `rgba(239, 68, 68, ${opacity})`; // recording red
  }
  return `rgba(59, 130, 246, ${opacity})`; // primary blue
};

// Update amplitude history
watch(() => props.amplitude, (newAmplitude) => {
  if (props.active) {
    amplitudeHistory.value.push(newAmplitude);
    if (amplitudeHistory.value.length > maxHistoryLength.value) {
      amplitudeHistory.value.shift();
    }
  }
});

// Clear history when inactive
watch(() => props.active, (active) => {
  if (!active) {
    amplitudeHistory.value = [];
  }
});

const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const barWidth = width / props.barCount;
  const barGap = 2;
  const barRadius = 2;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw bars
  const history = amplitudeHistory.value;
  const centerY = height / 2;

  for (let i = 0; i < props.barCount; i++) {
    // Get amplitude for this bar, or generate idle animation
    let amplitude: number;
    
    if (props.active && history.length > 0) {
      // Use historical values, most recent on the right
      const historyIndex = i - (props.barCount - history.length);
      amplitude = historyIndex >= 0 ? (history[historyIndex] ?? 0) : 0;
    } else {
      // Idle state - subtle wave animation
      const time = Date.now() / 1000;
      amplitude = props.active 
        ? 0.1 + Math.sin(time * 2 + i * 0.5) * 0.05 
        : 0.05 + Math.sin(time * 1.5 + i * 0.3) * 0.02;
    }

    // Calculate bar height with minimum
    const minHeight = 4;
    const maxHeight = height * 0.8;
    const barHeight = Math.max(minHeight, amplitude * maxHeight);

    // Calculate position
    const x = i * barWidth + barGap / 2;
    const y = centerY - barHeight / 2;
    const actualWidth = barWidth - barGap;

    // Draw rounded bar
    ctx.beginPath();
    ctx.roundRect(x, y, actualWidth, barHeight, barRadius);
    
    // Gradient effect based on height
    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, getColor(0.9));
    gradient.addColorStop(0.5, getColor(1));
    gradient.addColorStop(1, getColor(0.9));
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Continue animation
  animationId = requestAnimationFrame(draw);
};

const startAnimation = () => {
  if (animationId !== null) return;
  animationId = requestAnimationFrame(draw);
};

const stopAnimation = () => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
};

const resizeCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const container = canvas.parentElement;
  if (!container) return;

  // Set canvas size based on container and device pixel ratio
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = props.height * dpr;
  
  // Scale context for high DPI displays
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
};

onMounted(() => {
  resizeCanvas();
  startAnimation();
  
  window.addEventListener('resize', resizeCanvas);
});

onUnmounted(() => {
  stopAnimation();
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<template>
  <div 
    class="w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
    :style="{ height: `${height}px` }"
    role="img"
    aria-label="Audio waveform visualization"
  >
    <canvas
      ref="canvasRef"
      class="w-full h-full"
      :style="{ height: `${height}px` }"
    />
  </div>
</template>
