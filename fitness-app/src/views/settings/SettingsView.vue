<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <button type="button" class="back" @click="router.push('/home')">
          <LottieIcon name="chevronLeft" :size="20" :draw="false" />Home
        </button>
        <h1 class="cp-h1">Settings</h1>

        <label class="search">
          <LottieIcon name="search" :size="18" :draw="false" />
          <span class="visually-hidden">Search settings</span>
          <input v-model="query" type="search" placeholder="Search…" autocomplete="off" />
        </label>

        <template v-if="visibleGroups.length">
          <div v-for="(group, gi) in visibleGroups" :key="gi" class="cp-list">
            <button
              v-for="row in group"
              :key="row.to"
              type="button"
              class="cp-li"
              @click="router.push(row.to)"
            >
              <SettingsTile :icon="row.icon" :color="row.color" />
              <span class="cp-li-label">{{ row.label }}</span>
              <span v-if="row.value" class="cp-li-value">{{ row.value }}</span>
              <span class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
            </button>
          </div>
        </template>
        <p v-else class="cp-lbl empty">No settings match “{{ query }}”.</p>

        <p class="cp-lbl" style="text-align: center">Forge v{{ version }}</p>
      </main>
    </ion-content>
    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import SettingsTile from '@/components/settings/SettingsTile.vue';
import type { IconName } from '@/lottie/icons';
import { useSettings } from '@/data/useSettings';
import { ACCENTS } from '@/data/useTheme';
import { formatRest } from '@/utils/format';

interface Row { label: string; to: string; icon: IconName; color: string; value?: string; keywords: string }

const router = useRouter();
const { settings } = useSettings();
const version = __APP_VERSION__;
const query = ref('');

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const groups = computed<Row[][]>(() => [
  [{
    label: 'Workout', to: '/settings/workout', icon: 'play', color: '#4F7A3A',
    value: `${formatRest(settings.restTimerSec)} rest · ${cap(settings.workoutLayout)}`,
    keywords: 'rest timer pause effort rir rpe layout cards list compact weigh in screen awake animations last time'
  }],
  [{
    label: 'Look & Home', to: '/settings/look', icon: 'palette', color: '#6A4A80',
    value: `${cap(settings.theme)} · ${(ACCENTS[settings.accent] ?? ACCENTS.green).label}`,
    keywords: 'theme dark light system accent colour color body diagram male female home cards gym check-in body weight'
  }],
  [
    {
      label: 'Data & backup', to: '/settings/data', icon: 'folder', color: '#3E5E8A',
      keywords: 'export import backup restore json reset delete erase'
    },
    {
      label: 'About & updates', to: '/settings/about', icon: 'info', color: '#5A6553', value: `v${version}`,
      keywords: 'version credits license install home screen'
    }
  ]
]);

const visibleGroups = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return groups.value;
  return groups.value
    .map(g => g.filter(r => `${r.label} ${r.keywords}`.toLowerCase().includes(q)))
    .filter(g => g.length);
});
</script>

<style scoped>
.back {
  display: flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 16px;
  cursor: pointer;
}

.search {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-secondary);
}

.search input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 16px;
  outline: none;
}

.search:focus-within {
  outline: 2px solid var(--primary);
}

.empty {
  padding: 8px 4px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
