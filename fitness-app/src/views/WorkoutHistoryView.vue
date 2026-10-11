<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back to Stats" @click="router.push('/stats')">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <div>
            <h1 class="cp-h1" style="font-size: 30px">History</h1>
            <p class="cp-sub">{{ sessions.length }} workout{{ sessions.length === 1 ? '' : 's' }}</p>
          </div>
        </header>

        <template v-if="sessions.length">
          <section v-for="m in months" :key="m.key" class="month">
            <p class="cp-sec">{{ m.label }}</p>
            <WorkoutCard v-for="s in m.sessions" :key="s.id" :session="s" v-bind="summary(s)" />
          </section>
        </template>
        <p v-else class="cp-lbl">No finished workouts yet.</p>
      </main>
    </ion-content>
    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import WorkoutCard from '@/components/stats/WorkoutCard.vue';
import { useStatsData } from '@/data/useStatsData';
import type { WorkoutSession } from '@/db/models/WorkoutSession.model';
import { parseLocalDate } from '@/utils/date';

const router = useRouter();
const { sessions, summary, load } = useStatsData();

const months = computed(() => {
  const groups = new Map<string, WorkoutSession[]>();
  for (const s of sessions.value) {
    const key = s.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return [...groups.entries()].map(([key, list]) => ({
    key,
    label: parseLocalDate(`${key}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    sessions: list
  }));
});

onIonViewWillEnter(load);
</script>

<style scoped>
.head { align-items: flex-start; gap: 14px; }
.month { display: flex; flex-direction: column; gap: 8px; }
</style>
