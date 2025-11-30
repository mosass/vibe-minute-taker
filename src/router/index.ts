import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Lazy load views for better performance
const HomeView = () => import('@/views/HomeView.vue');
const MeetingsView = () => import('@/views/MeetingsView.vue');
const MeetingDetailView = () => import('@/views/MeetingDetailView.vue');
const SettingsView = () => import('@/views/SettingsView.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: 'Record',
      icon: 'microphone'
    }
  },
  {
    path: '/meetings',
    name: 'meetings',
    component: MeetingsView,
    meta: {
      title: 'Meetings',
      icon: 'document-text'
    }
  },
  {
    path: '/meetings/:id',
    name: 'meeting-detail',
    component: MeetingDetailView,
    meta: {
      title: 'Meeting',
      showBackButton: true
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: {
      title: 'Settings',
      icon: 'cog'
    }
  },
  // Catch-all redirect to home
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Update document title on navigation
router.beforeEach((to, _from, next) => {
  const title = to.meta?.title as string | undefined;
  document.title = title ? `${title} | Minute Taker` : 'Minute Taker';
  next();
});

export default router;
