<template>
  <nav class="app-tab-bar" aria-label="Main">
    <button
      v-for="item in navItems"
      :key="item.label"
      type="button"
      class="tab-btn"
      :class="{ active: item.isActive, start: item.isStart }"
      :aria-label="item.isStart ? 'Start workout' : undefined"
      :aria-current="item.isActive ? 'page' : undefined"
      @click="go(item)"
    >
      <span v-if="item.isStart" class="start-disc">
        <LottieIcon :name="item.icon" :active="item.isActive" />
      </span>
      <LottieIcon v-else :name="item.icon" :active="item.isActive" />
      <span class="tab-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LottieIcon from '@/components/LottieIcon.vue';
import type { IconName } from '@/lottie/icons';
import { useActiveWorkout } from '@/data/useActiveWorkout';

interface NavItem { label: string; icon: IconName; path: string; match: (p: string) => boolean; isStart?: boolean }

const route = useRoute();
const router = useRouter();
const { resume } = useActiveWorkout();

const items: NavItem[] = [
  { label: 'Home', icon: 'home', path: '/home', match: p => ['/home', '/fuel', '/weigh-ins', '/progress'].includes(p) || p.startsWith('/settings') },
  { label: 'Plan', icon: 'plan', path: '/plan', match: p => p.startsWith('/plan') },
  { label: 'Start', icon: 'play', path: '/start', match: p => p === '/start' || p === '/workout', isStart: true },
  { label: 'Stats', icon: 'stats', path: '/stats', match: p => p.startsWith('/stats') || p.startsWith('/history') },
  { label: 'Exercises', icon: 'exercises', path: '/exercises', match: p => p.startsWith('/exercise') }
];

const navItems = computed(() => items.map(i => ({ ...i, isActive: i.match(route.path) })));

// Start goes straight back into a workout in progress.
async function go(item: NavItem) {
  if (item.isStart && await resume()) {
    router.push('/workout');
    return;
  }
  router.push(item.path);
}
</script>

<style scoped>
.app-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 130;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: start;
  min-height: calc(var(--tabbar-height) + env(safe-area-inset-bottom, 0px));
  padding: 10px 0 env(safe-area-inset-bottom, 0px);
  border-top: 1px solid var(--surface-highest);
  background: var(--tabbar-bg);
}

.tab-btn {
  display: flex;
  min-width: 0;
  min-height: 48px;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-body);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.tab-btn.active {
  color: var(--primary);
}

.tab-label {
  font-size: 11px;
  font-weight: 500;
}

.tab-btn.start {
  margin-top: -26px;
  color: var(--primary);
}

.tab-btn.start .tab-label {
  font-weight: 600;
}

.start-disc {
  display: flex;
  width: 60px;
  height: 60px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary);
  color: var(--on-primary);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
  transition: transform 0.15s ease;
}

.tab-btn.start:active .start-disc {
  transform: scale(0.94);
}

.tab-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 12px;
}
</style>
