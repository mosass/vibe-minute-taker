<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const route = useRoute();
const router = useRouter();

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Record',
    icon: 'microphone'
  },
  {
    to: '/meetings',
    label: 'Meetings',
    icon: 'document'
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: 'cog'
  }
];

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
};

const navigate = (to: string) => {
  router.push(to);
};
</script>

<template>
  <nav class="safe-area-bottom bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 z-50">
    <div class="flex justify-around py-2">
      <button
        v-for="item in navItems"
        :key="item.to"
        @click="navigate(item.to)"
        class="flex flex-col items-center px-4 py-2 min-w-[72px] rounded-lg transition-colors"
        :class="[
          isActive(item.to)
            ? 'text-primary-500'
            : 'text-gray-600 dark:text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700'
        ]"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <!-- Microphone icon -->
        <svg v-if="item.icon === 'microphone'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        
        <!-- Document icon -->
        <svg v-else-if="item.icon === 'document'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        
        <!-- Cog/Settings icon -->
        <svg v-else-if="item.icon === 'cog'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        
        <span class="text-xs mt-1 font-medium">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>
