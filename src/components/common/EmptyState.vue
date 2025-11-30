<script setup lang="ts">
interface Props {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Icon type */
  icon?: 'document' | 'microphone' | 'search' | 'folder' | 'generic';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

withDefaults(defineProps<Props>(), {
  title: 'No items yet',
  description: '',
  icon: 'generic',
  size: 'md'
});
</script>

<template>
  <div 
    class="flex flex-col items-center justify-center text-center py-12 px-4"
    :class="{
      'py-8': size === 'sm',
      'py-16': size === 'lg'
    }"
  >
    <!-- Icon -->
    <div 
      class="rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
      :class="{
        'w-12 h-12': size === 'sm',
        'w-16 h-16': size === 'md',
        'w-20 h-20': size === 'lg'
      }"
    >
      <!-- Document icon -->
      <svg 
        v-if="icon === 'document'" 
        class="text-gray-400"
        :class="{
          'w-6 h-6': size === 'sm',
          'w-8 h-8': size === 'md',
          'w-10 h-10': size === 'lg'
        }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      
      <!-- Microphone icon -->
      <svg 
        v-else-if="icon === 'microphone'" 
        class="text-gray-400"
        :class="{
          'w-6 h-6': size === 'sm',
          'w-8 h-8': size === 'md',
          'w-10 h-10': size === 'lg'
        }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      
      <!-- Search icon -->
      <svg 
        v-else-if="icon === 'search'" 
        class="text-gray-400"
        :class="{
          'w-6 h-6': size === 'sm',
          'w-8 h-8': size === 'md',
          'w-10 h-10': size === 'lg'
        }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      
      <!-- Folder icon -->
      <svg 
        v-else-if="icon === 'folder'" 
        class="text-gray-400"
        :class="{
          'w-6 h-6': size === 'sm',
          'w-8 h-8': size === 'md',
          'w-10 h-10': size === 'lg'
        }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      
      <!-- Generic/inbox icon -->
      <svg 
        v-else 
        class="text-gray-400"
        :class="{
          'w-6 h-6': size === 'sm',
          'w-8 h-8': size === 'md',
          'w-10 h-10': size === 'lg'
        }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
    
    <!-- Title -->
    <h3 
      class="font-medium text-gray-900 dark:text-gray-100 mb-1"
      :class="{
        'text-base': size === 'sm',
        'text-lg': size === 'md',
        'text-xl': size === 'lg'
      }"
    >
      {{ title }}
    </h3>
    
    <!-- Description -->
    <p 
      v-if="description"
      class="text-gray-500 dark:text-gray-400 max-w-sm"
      :class="{
        'text-sm': size === 'sm',
        'text-base': size === 'md' || size === 'lg'
      }"
    >
      {{ description }}
    </p>
    
    <!-- Action slot -->
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
