import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Lazy load views for better performance
const HomeView = () => import('@/views/HomeView.vue');
const MeetingsView = () => import('@/views/MeetingsView.vue');
const MeetingDetailView = () => import('@/views/MeetingDetailView.vue');
const SettingsView = () => import('@/views/SettingsView.vue');
const OnboardingView = () => import('@/views/OnboardingView.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/onboarding',
    name: 'onboarding',
    component: OnboardingView,
    meta: {
      title: 'Welcome',
      hideNavigation: true
    }
  },
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

/**
 * Check if user has completed onboarding
 */
function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem('onboarding-complete') === 'true';
  } catch {
    return true; // If storage is not available, skip onboarding
  }
}

// Navigation guard for first-time users
router.beforeEach((to, _from, next) => {
  // Update document title
  const title = to.meta?.title as string | undefined;
  document.title = title ? `${title} | Minute Taker` : 'Minute Taker';
  
  // Redirect first-time users to onboarding
  if (to.name !== 'onboarding' && !hasCompletedOnboarding()) {
    next({ name: 'onboarding' });
    return;
  }
  
  next();
});

export default router;
