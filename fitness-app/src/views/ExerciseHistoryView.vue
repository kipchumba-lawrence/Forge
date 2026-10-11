<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back to exercise" @click="router.push(`/exercise/${id}`)">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <div class="head-text">
            <h1 class="cp-h1" style="font-size: 30px">{{ name }}</h1>
            <p class="cp-sub">Exercise history · {{ rows.length }} session{{ rows.length === 1 ? '' : 's' }}</p>
          </div>
        </header>

        <template v-if="rows.length">
          <section class="cp-card stack">
            <SegmentedControl v-model="metric" label="Chart measure" :options="metricOptions" />
            <LineChart :points="series" :label="`${name} ${metric === 'top' ? 'top set' : 'estimated 1RM'} per session`" empty-text="Log this exercise in two workouts to see a trend." />
            <p class="cp-lbl">Best: <span class="best">{{ best }} kg</span></p>
          </section>

          <p class="cp-sec">Sessions</p>
          <div class="cp-list">
            <button v-for="r in rows" :key="r.sessionId" type="button" class="cp-li session" @click="router.push(`/history/${r.sessionId}`)">
              <span class="top">
                <span class="date">{{ r.date }}</span>
                <span v-if="r.pr" class="pr"><LottieIcon name="trophy" :size="12" :draw="false" />PR</span>
                <span class="cp-num weight">{{ r.top }} kg</span>
              </span>
              <span class="sets">{{ r.sets }}</span>
              <span class="cp-lbl">Volume {{ fmt(r.volume) }} kg · Est. 1RM {{ r.e1rm }} kg</span>
            </button>
          </div>
        </template>

        <section v-else class="state">
          <LottiePlayer name="searchSweep" :size="72" />
          <p>You haven't logged {{ name }} yet. Add it to a routine and your sessions will show up here.</p>
        </section>
      </main>
    </ion-content>
    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import LineChart from '@/components/LineChart.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import { db } from '@/db/AppDatabase';
import { estimate1RM } from '@/data/useMuscleAnalytics';
import { chronological, doneSets, formatSets, personalRecords } from '@/data/workoutSummary';
import { parseLocalDate } from '@/utils/date';

type Metric = 'top' | 'e1rm';

const route = useRoute();
const router = useRouter();
const id = computed(() => String(route.params.id));
const name = ref('Exercise');
const metric = ref<Metric>('top');
const metricOptions: { value: Metric; label: string }[] = [{ value: 'top', label: 'Top set' }, { value: 'e1rm', label: 'Est. 1RM' }];

interface Row { sessionId: number; isoDate: string; date: string; top: number; e1rm: number; volume: number; sets: string; pr: boolean }
const rows = ref<Row[]>([]);   // newest first

const fmt = (n: number) => new Intl.NumberFormat().format(Math.round(n * 10) / 10);
const series = computed(() =>
  [...rows.value].reverse().map(r => ({ date: r.isoDate, value: metric.value === 'top' ? r.top : r.e1rm }))
);
const best = computed(() => Math.max(...rows.value.map(r => (metric.value === 'top' ? r.top : r.e1rm))));

async function load() {
  const all = await db.workoutSessions.where('status').equals('completed').toArray();
  const prs = personalRecords(all);
  const ex = await db.exercises.where('exerciseDbId').equals(id.value).first();
  const out: Row[] = [];
  for (const s of chronological(all)) {
    const entries = s.exercises.filter(e => e.exerciseDbId === id.value);
    const sets = entries.flatMap(e => doneSets(e.sets));
    if (!sets.length) continue;
    if (name.value === 'Exercise') name.value = entries[0].name;
    out.push({
      sessionId: s.id!,
      isoDate: s.date,
      date: parseLocalDate(s.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      top: Math.max(...sets.map(x => x.weight)),
      e1rm: Math.round(Math.max(...sets.map(x => estimate1RM(x.weight, x.reps))) * 10) / 10,
      volume: sets.reduce((v, x) => v + x.weight * x.reps, 0),
      sets: formatSets(sets),
      pr: prs.get(s.id!)?.has(id.value) ?? false
    });
  }
  if (ex) name.value = ex.name;
  rows.value = out.reverse();
}

onIonViewWillEnter(load);
</script>

<style scoped>
.head { align-items: flex-start; gap: 14px; }
.head-text { min-width: 0; flex: 1; }
.stack { display: flex; flex-direction: column; gap: 10px; }
.best { color: var(--primary); font-weight: 600; }

.session { flex-direction: column; align-items: stretch; gap: 4px; }
.top { display: flex; align-items: center; gap: 8px; }
.date { flex: 1; font-weight: 600; }
.weight { font-size: 18px; }
.sets { color: var(--text-primary); font-size: 14px; line-height: 1.45; }
.pr {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 8px;
  background: rgba(var(--warning-rgb), 0.16);
  color: var(--warning);
  font-size: 11px;
  font-weight: 600;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 50px 12px;
  color: var(--text-secondary);
  text-align: center;
}
.state p { margin: 0; line-height: 1.5; }
</style>
