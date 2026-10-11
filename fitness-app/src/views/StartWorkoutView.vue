<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header>
          <h1 class="cp-h1">Start workout</h1>
          <p class="cp-sub">{{ subtitle }}</p>
        </header>

        <!-- Workout in progress -->
        <section v-if="active" class="cp-card cp-row resume">
          <LottiePlayer name="liftLoader" :size="40" />
          <span class="text">
            <span class="cp-eyebrow">In progress</span>
            <span class="name">{{ active.name }}</span>
            <span class="cp-lbl">{{ formatDuration(elapsedSeconds) }} · {{ doneSets }}/{{ totalSets }} sets</span>
          </span>
          <button type="button" class="cp-pill-btn" @click="router.push('/workout')">Resume</button>
        </section>

        <!-- Today -->
        <template v-if="today.length">
          <p class="cp-sec">Today's plan</p>
          <section v-for="r in today" :key="r.id" class="cp-card today">
            <div class="cp-row">
              <span class="cp-tile" :class="{ amber: r.isDeload }"><LottieIcon name="flame" :size="20" /></span>
              <span class="text">
                <span class="name big">{{ r.name }}</span>
                <span class="cp-lbl">{{ r.exercises.length }} exercise{{ r.exercises.length === 1 ? '' : 's' }} · {{ RULES[r.progression ?? 'none'].label }}</span>
              </span>
            </div>
            <button type="button" class="cp-primary" :disabled="!r.exercises.length" @click="begin(r.id!)">
              <LottieIcon name="play" :size="18" />Start {{ r.name }}
            </button>
          </section>
        </template>
        <section v-else-if="rotationRestToday" class="cp-card stack">
          <p class="name">Rest day in your rotation</p>
          <p class="cp-lbl">Recovery is part of the plan. Feel like training anyway?</p>
          <button type="button" class="cp-link" @click="skipRestDay">Skip the rest day</button>
        </section>
        <section v-else-if="routines.length" class="cp-card stack">
          <p class="name">Nothing planned today</p>
          <button type="button" class="cp-link" @click="router.push('/plan')">Plan your week</button>
        </section>

        <!-- Other routines -->
        <template v-if="others.length">
          <p class="cp-sec">{{ today.length ? 'Other routines' : 'Routines' }}</p>
          <div class="list">
            <div v-for="r in others" :key="r.id" class="cp-card cp-row other">
              <span class="text">
                <span class="name">{{ r.name }}</span>
                <span class="cp-lbl">{{ r.exercises.length }} exercise{{ r.exercises.length === 1 ? '' : 's' }}</span>
              </span>
              <button type="button" class="cp-pill-btn" :disabled="!r.exercises.length" @click="begin(r.id!)">Start</button>
            </div>
          </div>
        </template>

        <section v-if="!routines.length" class="state">
          <LottiePlayer name="liftLoader" :size="64" />
          <p>No routines yet. Build one in Plan, or just start lifting.</p>
          <button type="button" class="cp-link" @click="router.push('/plan')">Create a routine</button>
        </section>

        <button type="button" class="cp-link freestyle" @click="begin(undefined)">
          <LottieIcon name="exercises" :size="18" />Freestyle workout (pick as you go)
        </button>
      </main>
    </ion-content>

    <WeightLogSheet :open="checkInFor !== null" mode="checkin" @checkin="onCheckIn" @close="checkInFor = null" />

    <BottomSheet :open="conflictFor !== null" title="A workout is already running" @close="conflictFor = null">
      <p class="cp-lbl">{{ active?.name }} is still in progress. Finish it, or discard it to start something else.</p>
      <button type="button" class="cp-primary" @click="conflictFor = null; router.push('/workout')">Resume {{ active?.name }}</button>
      <button type="button" class="text-btn danger" @click="discardAndStart">Discard it and start</button>
    </BottomSheet>

    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import WeightLogSheet from '@/components/WeightLogSheet.vue';
import { useActiveWorkout } from '@/data/useActiveWorkout';
import { useRoutines, DAY_LONG, weekdayIndex } from '@/data/useRoutines';
import { useSettings } from '@/data/useSettings';
import { RULES } from '@/data/progression';
import { formatDuration } from '@/data/workoutSummary';

// A pending start is a routine id, or 'free' for freestyle.
type Pending = number | 'free';

const route = useRoute();
const router = useRouter();
const { settings } = useSettings();
const { routines, today, rotationRestToday, load, skipRestDay } = useRoutines();
const { session: active, elapsedSeconds, doneSets, totalSets, resume, start, discard } = useActiveWorkout();

const others = computed(() => routines.value.filter(r => !today.value.some(t => t.id === r.id)));
const subtitle = computed(() => {
  const day = DAY_LONG[weekdayIndex()];
  if (today.value.length) return `${day} · today is ${today.value.map(r => r.name).join(' + ')}`;
  if (rotationRestToday.value) return `${day} · rest day`;
  return day;
});

const checkInFor = ref<Pending | null>(null);
const conflictFor = ref<Pending | null>(null);

function begin(templateId: number | undefined) {
  const pending: Pending = templateId ?? 'free';
  if (active.value) {
    conflictFor.value = pending;
    return;
  }
  if (settings.weighInBeforeWorkout) checkInFor.value = pending;
  else launch(pending);
}

async function launch(pending: Pending, bodyWeightKg?: number) {
  await start({ templateId: pending === 'free' ? undefined : pending, bodyWeightKg });
  router.push('/workout');
}

async function onCheckIn(weightKg: number | null) {
  const pending = checkInFor.value;
  checkInFor.value = null;
  if (pending !== null) await launch(pending, weightKg ?? undefined);
}

async function discardAndStart() {
  const pending = conflictFor.value;
  conflictFor.value = null;
  await discard();
  if (pending !== null) begin(pending === 'free' ? undefined : pending);
}

onIonViewWillEnter(async () => {
  await Promise.all([load(), resume()]);
  // "Start this routine" from the routine editor arrives with ?routine=ID.
  const id = Number(route.query.routine);
  if (id) {
    router.replace({ path: '/start' });
    begin(id);
  }
});
</script>

<style scoped>
.text { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.name { font-size: 17px; font-weight: 600; margin: 0; }
.name.big { font-size: 20px; }
.resume { padding: 14px; border: 1px solid var(--primary-soft); }
.today { display: flex; flex-direction: column; gap: 14px; }
.stack { display: flex; flex-direction: column; gap: 8px; }
.list { display: flex; flex-direction: column; gap: 8px; }
.other { padding: 14px 16px; border-radius: 16px; }
.freestyle { align-self: center; gap: 8px; padding: 10px; font-size: 16px; }
.state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 12px; color: var(--text-secondary); text-align: center; }
.state p { margin: 0; }
.cp-pill-btn:disabled { opacity: 0.5; }
.text-btn { padding: 8px; border: 0; background: none; color: var(--primary); font-family: var(--font-body); font-size: 16px; cursor: pointer; }
.text-btn.danger { color: var(--danger); }
</style>
