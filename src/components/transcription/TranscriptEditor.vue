<script setup lang="ts">
/**
 * TranscriptEditor - Editable textarea for transcript
 * 
 * Provides an editable textarea with auto-save on blur and character count.
 */

import { ref, computed, watch, onMounted } from 'vue';

interface Props {
  /** Initial transcript text */
  modelValue: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum height for the textarea (CSS value) */
  maxHeight?: string;
  /** Minimum height for the textarea (CSS value) */
  minHeight?: string;
  /** Whether to show character count */
  showCharCount?: boolean;
  /** Maximum character limit (optional) */
  maxLength?: number;
  /** Auto-save delay in ms (0 to disable) */
  autoSaveDelay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: 'No transcript available. Start recording to generate one.',
  maxHeight: '500px',
  minHeight: '200px',
  showCharCount: true,
  autoSaveDelay: 500
});

const emit = defineEmits<{
  /** Emitted when the value changes */
  'update:modelValue': [value: string];
  /** Emitted when the editor loses focus (for save) */
  blur: [value: string];
  /** Emitted when auto-save triggers */
  save: [value: string];
}>();

// Local state
const localValue = ref(props.modelValue);
const isDirty = ref(false);
const isSaving = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Auto-save timer
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Character count
const charCount = computed(() => localValue.value.length);
const wordCount = computed(() => {
  const text = localValue.value.trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
});

// Character limit status
const isOverLimit = computed(() => {
  if (!props.maxLength) return false;
  return charCount.value > props.maxLength;
});

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== localValue.value) {
    localValue.value = newValue;
  }
});

// Handle input
function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  localValue.value = target.value;
  isDirty.value = true;
  
  emit('update:modelValue', localValue.value);
  
  // Schedule auto-save
  if (props.autoSaveDelay > 0) {
    scheduleAutoSave();
  }
}

// Handle blur
function handleBlur() {
  if (isDirty.value) {
    emit('blur', localValue.value);
    emit('save', localValue.value);
    isDirty.value = false;
    showSaveIndicator();
  }
}

// Schedule auto-save
function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  autoSaveTimer = setTimeout(() => {
    if (isDirty.value) {
      emit('save', localValue.value);
      isDirty.value = false;
      showSaveIndicator();
    }
  }, props.autoSaveDelay);
}

// Show save indicator briefly
function showSaveIndicator() {
  isSaving.value = true;
  setTimeout(() => {
    isSaving.value = false;
  }, 1000);
}

// Auto-resize textarea
function autoResize() {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`;
  }
}

// Focus the textarea
function focus() {
  textareaRef.value?.focus();
}

// Expose methods
defineExpose({
  focus
});

onMounted(() => {
  autoResize();
});

watch(localValue, () => {
  autoResize();
});
</script>

<template>
  <div class="transcript-editor">
    <!-- Textarea container -->
    <div class="relative">
      <textarea
        ref="textareaRef"
        :value="localValue"
        @input="handleInput"
        @blur="handleBlur"
        :disabled="disabled"
        :placeholder="placeholder"
        :maxlength="maxLength"
        class="w-full p-4 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
        :class="{
          'opacity-50 cursor-not-allowed': disabled,
          'border-red-500 dark:border-red-500': isOverLimit
        }"
        :style="{
          minHeight: minHeight,
          maxHeight: maxHeight
        }"
        aria-label="Transcript editor"
      ></textarea>
      
      <!-- Save indicator -->
      <div 
        v-if="isSaving"
        class="absolute top-2 right-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Saved
      </div>
      
      <!-- Dirty indicator -->
      <div 
        v-else-if="isDirty"
        class="absolute top-2 right-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
      >
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        Unsaved
      </div>
    </div>

    <!-- Footer with counts -->
    <div 
      v-if="showCharCount"
      class="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400"
    >
      <div class="flex items-center gap-4">
        <span>{{ wordCount }} words</span>
        <span>{{ charCount }} characters</span>
      </div>
      
      <div v-if="maxLength" class="text-right">
        <span :class="{ 'text-red-500': isOverLimit }">
          {{ charCount }} / {{ maxLength }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transcript-editor textarea {
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.6;
}

/* Hide scrollbar for a cleaner look but keep functionality */
.transcript-editor textarea::-webkit-scrollbar {
  width: 6px;
}

.transcript-editor textarea::-webkit-scrollbar-track {
  background: transparent;
}

.transcript-editor textarea::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.transcript-editor textarea::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}
</style>
