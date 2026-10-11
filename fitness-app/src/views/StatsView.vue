<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <div>
            <h1 class="cp-h1">Stats</h1>
            <p class="cp-sub">Progress &amp; history</p>
          </div>
          <button type="button" class="cp-icon-btn" aria-label="Workout history" @click="router.push('/history')">
            <LottieIcon name="history" :size="21" />
          </button>
        </header>

        <!-- Tiles -->
        <div class="tiles">
          <div class="cp-card tile">
            <p class="tile-lbl"><LottieIcon name="exercises" :size="16" :draw="false" />Workouts</p>
            <p class="cp-num tile-num">{{ totalWorkouts }}</p>
          </div>
          <div class="cp-card tile">
            <p class="tile-lbl"><LottieIcon name="plan" :size="16" :draw="false" />This month</p>
            <p class="cp-num tile-num">{{ thisMonth }}</p>
          </div>
          <div class="cp-card tile">
            <p class="tile-lbl"><LottieIcon name="flame" :size="16" :draw="false" />Week streak</p>
            <p class="cp-num tile-num">{{ streak }}</p>
          </div>
          <div class="cp-card tile">
            <p class="tile-lbl"><LottieIcon name="scale" :size="16" :draw="false" />Weight 30d</p>
            <p class="cp-num tile-num" :class="{ accent: weight30 !== null && weight30 < 0 }">{{ weight30Label }}</p>
          </div>
        </div>

        <!-- Activity heatmap -->
        <section class="cp-card stack">
          <p class="cp-lbl" style="font-size: 14px">Activity (last 6 months)</p>
          <SegmentedControl v-model="heatMetric" label="Activity measure" :options="heatOptions" />
          <div class="heat" role="img" :aria-label="heatAria">
            <div class="heat-months">
              <span v-for="m in heat.months" :key="m.week" :style="{ left: `${(m.week / 26) * 100}%` }">{{ m.label }}</span>
            </div>
            <div class="heat-grid">
              <div v-for="(week, wi) in heat.weeks" :key="wi" class="heat-col">
                <span
                  v-for="cell in week"
                  :key="cell.date"
                  class="heat-cell"
                  :class="`l${cell.level}`"
                  :title="cellTitle(cell)"
                ></span>
              </div>
            </div>
            <div class="heat-legend">
              Less <span class="heat-cell l0"></span><span class="heat-cell l1"></span><span class="heat-cell l2"></span><span class="heat-cell l3"></span><span class="heat-cell l4"></span> More
            </div>
          </div>
        </section>

        <!-- Muscle balance -->
        <section class="cp-card stack">
          <p class="card-title">Muscle balance</p>
          <SegmentedControl v-model="balancePeriod" label="Muscle balance period" :options="periodOptions" />
          <div v-if="balancePeriod === 'week'" class="cp-row week-nav">
            <button type="button" class="nav-btn" aria-label="Previous week" @click="weekOffset--">
              <LottieIcon name="chevronLeft" :size="18" :draw="false" />
            </button>
            <span>{{ weekLabel }}</span>
            <button type="button" class="nav-btn" aria-label="Next week" :disabled="weekOffset >= 0" @click="weekOffset++">
              <LottieIcon name="chevronRight" :size="18" :draw="false" />
            </button>
          </div>
          <template v-if="balance">
            <MuscleMap :intensity="balance.done" :label="`Muscles trained: ${balance.trained.map(r => r.label).join(', ') || 'none'}`" />
            <BarRow
              v-for="r in balance.trained"
              :key="r.group"
              :label="r.label"
              :pct="r.target ? (r.done / r.target) * 100 : (r.done / maxDone) * 100"
              :value="r.target ? `${r.done}/${r.target} · ${r.pct}%` : `${r.done} sets`"
            />
            <p v-if="!balance.trained.length" class="cp-lbl">No workouts logged in this period.</p>
            <template v-if="balance.untrained.length">
              <p class="cp-lbl" style="margin-top: 4px">Not trained in this period</p>
              <div class="pills">
                <span v-for="r in balance.untrained" :key="r.group" class="warn-pill">{{ r.label }}</span>
              </div>
            </template>
            <p v-if="!balance.hasPlan" class="cp-lbl small">Save routines to see sets against your plan.</p>
          </template>
        </section>

        <!-- Planned weekly volume -->
        <section v-if="planned.length" class="cp-card stack tight">
          <p class="card-title">Weekly muscle volume</p>
          <p class="cp-lbl">Planned sets per week, from your saved routines.</p>
          <BarRow
            v-for="r in planned"
            :key="r.group"
            :label="r.label"
            :pct="(r.sets / planned[0].sets) * 100"
            :value="`${r.sets} sets`"
          />
        </section>

        <!-- Links -->
        <button type="button" class="cp-card cp-row link-card" @click="router.push('/stats/balance')">
          <span class="link-text">
            <span class="link-title">Structural balance</span>
            <span class="cp-lbl">See which lift is holding back the rest.</span>
          </span>
          <span class="open">Open</span>
        </button>
        <button type="button" class="cp-card cp-row link-card" @click="router.push('/progress')">
          <span class="link-text">
            <span class="link-title">Progress photos</span>
            <span class="cp-lbl">Mirror check-ins, compared by AI.</span>
          </span>
          <span class="open">Open</span>
        </button>

        <!-- Effort -->
        <section class="cp-card stack">
          <p class="card-title">Effort · how close to failure</p>
          <SegmentedControl v-model="effortRange" label="Effort range" :options="rangeOptions" />
          <template v-if="effortData.rated">
            <div class="cp-row big-pair">
              <div>
                <p class="cp-num big warn">{{ effortData.avg!.toFixed(1) }} RIR</p>
                <p class="cp-lbl">average effort</p>
              </div>
              <div>
                <p class="cp-num big">{{ Math.round(effortData.hardShare! * 100) }}%</p>
                <p class="cp-lbl">at RIR 3 or harder</p>
              </div>
            </div>
            <p class="cp-lbl">{{ effortData.rated }} of {{ effortData.finished }} finished sets rated</p>
            <BarRow
              v-for="(b, i) in effortData.buckets"
              :key="b.label"
              :label="b.label"
              :pct="(b.count / maxBucket) * 100"
              :value="`${b.count} · ${Math.round((b.count / effortData.rated) * 100)}%`"
              :color="i === 4 ? 'var(--text-muted)' : 'var(--warning)'"
            />
          </template>
          <p v-else class="cp-lbl">
            No sets rated yet. Effort per set (RIR) is logged in the redesigned workout screen, coming with the Plan step.
          </p>
        </section>

        <!-- Body weight -->
        <section class="cp-card stack tight">
          <div class="cp-row spread">
            <span class="cp-lbl" style="font-size: 14px">Body weight</span>
            <button type="button" class="cp-link" @click="router.push('/weigh-ins')">
              <LottieIcon name="plus" :size="16" :draw="false" />Log
            </button>
          </div>
          <SegmentedControl v-model="weightRange" label="Body weight range" :options="rangeOptionsShort" />
          <WeightChart :points="weightPoints" :goal="goal" />
        </section>

        <!-- Exercise progress -->
        <section class="cp-card stack tight">
          <p class="cp-lbl" style="font-size: 14px">Exercise progress</p>
          <template v-if="loggedExercises.length && currentExercise">
            <button type="button" class="picker" @click="pickerOpen = true">
              <span>{{ currentExercise.name }} · {{ currentExercise.best }} kg</span>
              <LottieIcon name="chevronDown" :size="18" :draw="false" />
            </button>
            <SegmentedControl v-model="progressMetric" label="Progress measure" :options="metricOptions" />
            <LineChart
              :points="series"
              :label="`${currentExercise.name} ${metricLabel} per workout`"
              empty-text="Log this exercise in two workouts to see a trend."
            />
            <p class="cp-lbl">
              {{ metricCaption }}<template v-if="seriesBest !== null"> · Best: <span class="best">{{ seriesBest }}{{ progressMetric === 'effort' ? ' RIR' : ' kg' }}</span></template>
            </p>
          </template>
          <p v-else class="cp-lbl">Finish a workout to track your lifts here.</p>
        </section>

        <!-- Recent workouts -->
        <template v-if="sessions.length">
          <div class="cp-row spread">
            <span class="cp-sec">Recent workouts</span>
            <button type="button" class="cp-link" @click="router.push('/history')">
              All {{ sessions.length }}<LottieIcon name="chevronRight" :size="16" :draw="false" />
            </button>
          </div>
          <div class="recent">
            <WorkoutCard
              v-for="s in sessions.slice(0, 4)"
              :key="s.id"
              :session="s"
              v-bind="summary(s)"
            />
          </div>
        </template>
      </main>
    </ion-content>

    <BottomSheet :open="pickerOpen" title="Exercise" @close="pickerOpen = false">
      <div class="options" role="radiogroup" aria-label="Exercise">
        <button
          v-for="e in loggedExercises"
          :key="e.id"
          type="button"
          role="radio"
          class="option"
          :class="{ on: e.id === currentExercise?.id }"
          :aria-checked="e.id === currentExercise?.id"
          @click="exerciseId = e.id; pickerOpen = false"
        >
          <span>{{ e.name }}</span>
          <span class="cp-lbl">{{ e.best }} kg · {{ e.sessions }}×</span>
        </button>
      </div>
    </BottomSheet>

    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LineChart from '@/components/LineChart.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import WeightChart from '@/components/WeightChart.vue';
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import BarRow from '@/components/stats/BarRow.vue';
import MuscleMap from '@/components/MuscleMap.vue';
import WorkoutCard from '@/components/stats/WorkoutCard.vue';
import { useStatsData, type EffortRange, type HeatMetric, type ProgressMetric } from '@/data/useStatsData';
import { useMuscleAnalytics, type Period } from '@/data/useMuscleAnalytics';
import { useBodyWeightData } from '@/data/useBodyWeightData';
import { parseLocalDate } from '@/utils/date';

const router = useRouter();
const stats = useStatsData();
const { sessions, totalWorkouts, thisMonth, streak, loggedExercises, summary } = stats;
const { muscleBalance, plannedWeeklyVolume } = useMuscleAnalytics();
const { entries, goal, trend, load: loadWeights } = useBodyWeightData();

// ---- Tiles ----
const weight30 = computed(() => (entries.value, trend(30).change));
const weight30Label = computed(() => {
  const v = weight30.value;
  if (v === null) return '–';
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} kg`;
});

// ---- Heatmap ----
const heatMetric = ref<HeatMetric>('time');
const heatOptions: { value: HeatMetric; label: string }[] = [{ value: 'time', label: 'Time' }, { value: 'volume', label: 'Volume' }];
const heat = computed(() => (sessions.value, stats.heatmap(heatMetric.value)));
const heatAria = computed(() => `Workout activity over the last 6 months: ${sessions.value.filter(s => s.date >= heat.value.weeks[0][0].date).length} workouts`);
function cellTitle(cell: { date: string; value: number; level: number }) {
  const d = parseLocalDate(cell.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (cell.value <= 0) return d;
  return heatMetric.value === 'time' ? `${d}: ${Math.round(cell.value)} min` : `${d}: ${new Intl.NumberFormat().format(Math.round(cell.value))} kg`;
}

// ---- Muscle balance ----
const balancePeriod = ref<Period>('week');
const weekOffset = ref(0);
const periodOptions: { value: Period; label: string }[] = [
  { value: 'week', label: 'Week' }, { value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: 'all', label: 'All' }
];
const balance = ref<Awaited<ReturnType<typeof muscleBalance>> | null>(null);
const maxDone = computed(() => Math.max(1, ...(balance.value?.trained.map(r => r.done) ?? [1])));
const weekLabel = computed(() => {
  if (!balance.value) return '';
  const d = parseLocalDate(balance.value.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return weekOffset.value === 0 ? `This week · ${d}` : `Week of ${d}`;
});
async function loadBalance() {
  balance.value = await muscleBalance(balancePeriod.value, weekOffset.value);
}
watch([balancePeriod, weekOffset], loadBalance);

const planned = ref<{ group: string; label: string; sets: number }[]>([]);

// ---- Effort ----
const effortRange = ref<EffortRange>('90');
const rangeOptions: { value: EffortRange; label: string }[] = [
  { value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: '365', label: '1Y' }, { value: 'all', label: 'All' }
];
const effortData = computed(() => (sessions.value, stats.effort(effortRange.value)));
const maxBucket = computed(() => Math.max(1, ...effortData.value.buckets.map(b => b.count)));

// ---- Body weight ----
type WRange = '30' | '90' | '365' | 'all';
const weightRange = ref<WRange>('90');
const rangeOptionsShort: { value: WRange; label: string }[] = [
  { value: '30', label: '1M' }, { value: '90', label: '3M' }, { value: '365', label: '1Y' }, { value: 'all', label: 'All' }
];
const weightPoints = computed(() => (entries.value, trend(weightRange.value === 'all' ? 'all' : Number(weightRange.value)).points));

// ---- Exercise progress ----
const exerciseId = ref<string | null>(null);
const pickerOpen = ref(false);
const progressMetric = ref<ProgressMetric>('top');
const metricOptions: { value: ProgressMetric; label: string }[] = [
  { value: 'top', label: 'Top set' }, { value: 'e1rm', label: 'Est. 1RM' }, { value: 'effort', label: 'Effort' }
];
const currentExercise = computed(() =>
  loggedExercises.value.find(e => e.id === exerciseId.value) ?? loggedExercises.value[0] ?? null
);
const series = computed(() => (currentExercise.value ? stats.exerciseSeries(currentExercise.value.id, progressMetric.value) : []));
const seriesBest = computed(() => {
  if (!series.value.length) return null;
  const values = series.value.map(p => p.value);
  // Lower RIR = harder, so the "best" effort is the minimum.
  return progressMetric.value === 'effort' ? Math.min(...values) : Math.max(...values);
});
const metricLabel = computed(() => ({ top: 'top set', e1rm: 'estimated 1RM', effort: 'average RIR' })[progressMetric.value]);
const metricCaption = computed(() => ({
  top: 'Best set weight per workout',
  e1rm: 'Estimated one-rep max per workout (Epley)',
  effort: 'Average reps in reserve per workout'
})[progressMetric.value]);

onIonViewWillEnter(async () => {
  await stats.load();
  loadWeights();
  loadBalance();
  planned.value = (await plannedWeeklyVolume()).rows;
});
</script>

<style scoped>
.head { justify-content: space-between; align-items: flex-start; }

.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.tile { padding: 14px 16px; }
.tile-lbl { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--text-secondary); font-size: 14px; }
.tile-num { margin: 8px 0 0; font-size: 30px; }
.tile-num.accent { color: var(--primary); }

.stack { display: flex; flex-direction: column; gap: 12px; }
.stack.tight { gap: 10px; }
.card-title { margin: 0; font-size: 16px; }
.small { font-size: 12px; }
.spread { justify-content: space-between; }

/* Heatmap */
.heat { display: flex; flex-direction: column; gap: 6px; }
.heat-months { position: relative; height: 14px; }
.heat-months span { position: absolute; color: var(--text-secondary); font-size: 10px; }
.heat-grid { display: flex; justify-content: space-between; gap: 3px; }
.heat-col { display: flex; flex: 1; flex-direction: column; gap: 3px; }
.heat-cell { display: block; aspect-ratio: 1; width: 100%; border-radius: 2px; background: var(--surface-high); }
.heat-legend .heat-cell { width: 10px; height: 10px; aspect-ratio: auto; display: inline-block; }
.heat-cell.l-1 { background: transparent; }
.heat-cell.l1 { background: rgba(var(--primary-rgb), 0.3); }
.heat-cell.l2 { background: rgba(var(--primary-rgb), 0.5); }
.heat-cell.l3 { background: rgba(var(--primary-rgb), 0.75); }
.heat-cell.l4 { background: var(--primary); }
.heat-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 11px;
}

.week-nav { justify-content: space-between; color: var(--text-secondary); }
.week-nav span { color: var(--text-primary); font-weight: 600; }
.nav-btn {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.nav-btn:disabled { opacity: 0.3; cursor: default; }

.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.warn-pill {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(var(--warning-rgb), 0.16);
  color: var(--warning);
  font-size: 13px;
}

.link-card {
  width: 100%;
  border: 0;
  color: var(--text-primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.link-text { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.link-title { font-size: 16px; }
.open {
  padding: 9px 14px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}

.big-pair { gap: 28px; }
.big { margin: 0; font-size: 30px; }
.big.warn { color: var(--warning); }

.picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 0;
  border-radius: 12px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  text-align: left;
  cursor: pointer;
}
.best { color: var(--primary); font-weight: 600; }

.recent { display: flex; flex-direction: column; gap: 8px; }

.options {
  display: flex;
  max-height: 60vh;
  flex-direction: column;
  overflow-y: auto;
  border-radius: 16px;
  background: var(--surface-high);
}
.option {
  display: flex;
  min-height: 50px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  border: 0;
  border-top: 1px solid var(--surface-highest);
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
  text-align: left;
  cursor: pointer;
}
.option:first-child { border-top: 0; }
.option.on { color: var(--primary); font-weight: 600; }
</style>
