<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <div>
            <h1 class="cp-h1">Forge</h1>
            <p class="cp-sub">{{ todayLabel }}</p>
          </div>
          <button type="button" class="cp-icon-btn" aria-label="Settings" @click="router.push('/settings')">
            <LottieIcon name="settings" :size="21" />
          </button>
        </header>

        <!-- Week strip + today's workout -->
        <section class="cp-card week-card">
          <div class="cp-row week-nav">
            <button type="button" class="nav-btn" aria-label="Previous week" @click="weekOffset--">
              <LottieIcon name="chevronLeft" :size="18" :draw="false" />
            </button>
            <span>{{ weekLabel }}</span>
            <button
              type="button"
              class="nav-btn"
              aria-label="Next week"
              :disabled="weekOffset >= 0"
              @click="weekOffset++"
            >
              <LottieIcon name="chevronRight" :size="18" :draw="false" />
            </button>
          </div>

          <ol class="days" aria-label="Workouts this week">
            <li v-for="d in week" :key="d.date" :aria-label="dayAria(d)">
              <span class="dow">{{ d.label }}</span>
              <span class="dom" :class="{ today: d.isToday }">{{ d.dayOfMonth }}</span>
              <span class="dot" :class="{ on: d.trained }"></span>
            </li>
          </ol>

          <div class="cp-row today">
            <div class="cp-tile"><LottieIcon name="flame" :size="20" /></div>
            <div class="today-text">
              <p class="cp-eyebrow">{{ activeSession ? 'In progress' : 'Today' }}</p>
              <p class="today-title">{{ todayTitle }}</p>
              <p v-if="!activeSession && !planned.length && lastWorkout" class="cp-lbl">Last: {{ lastWorkout.name }} · {{ shortDate(lastWorkout.date) }}</p>
            </div>
            <button type="button" class="cp-pill-btn" @click="startOrResume">
              {{ activeSession ? 'Resume' : 'Start' }}
            </button>
          </div>

          <button type="button" class="cp-link choose" @click="router.push('/start')">
            <LottieIcon name="swap" :size="18" :draw="false" />
            Choose a different workout
          </button>
        </section>

        <!-- Fuel: food log + AI coach -->
        <button type="button" class="cp-card cp-row fuel-card" @click="router.push('/fuel')">
          <div class="cp-tile blue"><LottieIcon name="utensils" :size="20" /></div>
          <span class="fuel-text">
            <span class="fuel-title">Fuel</span>
            <span class="cp-lbl">{{ formatNumber(todayKcal) }} of {{ formatNumber(kcalGoal) }} kcal · AI coach</span>
          </span>
          <span class="chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
        </button>

        <!-- Body weight -->
        <section v-if="settings.homeShowBodyWeight" class="cp-card weight-card">
          <div class="cp-row spread">
            <span class="cp-lbl" style="font-size: 14px">Body weight</span>
            <span class="cp-row" style="gap: 18px">
              <button type="button" class="goal-btn" @click="openSheet('goal')">
                <LottieIcon name="target" :size="17" :draw="false" />
                {{ goal ?? 'Set goal' }}
              </button>
              <button type="button" class="cp-link" @click="openSheet('weight')">
                <LottieIcon name="plus" :size="16" :draw="false" />
                Log
              </button>
            </span>
          </div>

          <template v-if="latest">
            <div class="cp-row spread baseline">
              <span><span class="cp-num big">{{ latest.weightKg.toFixed(1) }}</span> <span class="unit">kg</span></span>
              <span class="cp-lbl">{{ shortDate(latest.date) }}</span>
            </div>
            <p v-if="goalLine" class="goal-line">
              <LottieIcon name="target" :size="15" :draw="false" />
              {{ goalLine }}
            </p>
            <WeightChart :points="trendPoints" :goal="goal" />
            <button type="button" class="cp-link all-link" @click="router.push('/weigh-ins')">
              All weigh-ins<LottieIcon name="chevronRight" :size="16" :draw="false" />
            </button>
          </template>
          <p v-else class="cp-lbl">No weigh-ins yet. Log one to start your curve.</p>
        </section>

        <!-- Mirror photo check-in -->
        <button type="button" class="cp-card cp-row fuel-card" @click="router.push('/progress')">
          <div class="cp-tile"><LottieIcon name="camera" :size="20" /></div>
          <span class="fuel-text">
            <span class="fuel-title">Photo check-in</span>
            <span class="cp-lbl">{{ photoLine }}</span>
          </span>
          <span class="chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
        </button>

        <!-- Streak -->
        <section class="cp-card cp-row">
          <div class="cp-tile amber"><LottieIcon name="flame" :size="20" /></div>
          <div>
            <template v-if="totalWorkouts">
              <p class="streak-title">{{ weekStreak }} week streak</p>
              <p class="cp-lbl" style="margin-top: 2px">
                {{ thisWeekCount }} this week · {{ totalWorkouts }} workout{{ totalWorkouts === 1 ? '' : 's' }} total
              </p>
            </template>
            <template v-else>
              <p class="streak-title">Start your streak</p>
              <p class="cp-lbl" style="margin-top: 2px">Train once this week and it begins.</p>
            </template>
          </div>
        </section>
      </main>
    </ion-content>

    <WeightLogSheet :open="sheet !== null" :mode="sheet ?? 'weight'" @close="sheet = null" />
    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import WeightChart from '@/components/WeightChart.vue';
import WeightLogSheet from '@/components/WeightLogSheet.vue';
import { useHomeData, type WeekDay } from '@/data/useHomeData';
import { useBodyWeightData } from '@/data/useBodyWeightData';
import { useFoodData } from '@/data/useFoodData';
import { useSettings } from '@/data/useSettings';
import { useRoutines } from '@/data/useRoutines';
import { localDateString, parseLocalDate } from '@/utils/date';
import { db } from '@/db/AppDatabase';

const router = useRouter();
const { settings } = useSettings();
const { week, weekLabel, weekOffset, thisWeekCount, weekStreak, totalWorkouts, activeSession, lastWorkout, load } = useHomeData();
const { entries, latest, goal, toGoal, trend, load: loadWeights } = useBodyWeightData();
const { todayKcal, kcalGoal, loadTodayEntries } = useFoodData();

const sheet = ref<'weight' | 'goal' | null>(null);

// "Last photo 12 days ago" nudges a regular check-in rhythm.
const lastPhotoDate = ref<string | null>(null);
const photoLine = computed(() => {
  if (!lastPhotoDate.value) return 'Snap a mirror photo · AI tracks your change';
  const days = Math.round((parseLocalDate(localDateString()).getTime() - parseLocalDate(lastPhotoDate.value).getTime()) / 86_400_000);
  const ago = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  return `Last photo ${ago} · AI compares your change`;
});
async function loadLastPhoto() {
  lastPhotoDate.value = (await db.photoCheckIns.orderBy('date').last())?.date ?? null;
}
const openSheet = (mode: 'weight' | 'goal') => (sheet.value = mode);

const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = (date: string) =>
  parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const formatNumber = (n: number) => new Intl.NumberFormat().format(Math.round(n));

// Re-read when entries change so a new weigh-in shows up on the chart.
const trendPoints = computed(() => (entries.value, trend(90).points));

const goalLine = computed(() => {
  if (goal.value == null || toGoal.value == null) return '';
  if (Math.abs(toGoal.value) < 0.05) return `Goal ${goal.value} kg · reached`;
  const verb = toGoal.value > 0 ? 'to lose' : 'to gain';
  return `Goal ${goal.value} kg · ${Math.abs(toGoal.value).toFixed(1)} kg ${verb}`;
});

function dayAria(d: WeekDay) {
  const name = parseLocalDate(d.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return `${name}${d.isToday ? ', today' : ''}${d.trained ? ', workout logged' : ''}`;
}

// Today's routine from the plan (Fixed Week or Rotation).
const { today: planned, rotationRestToday, load: loadRoutines } = useRoutines();
const todayTitle = computed(() => {
  if (activeSession.value) return activeSession.value.name;
  if (planned.value.length) return planned.value.map(r => r.name).join(' + ');
  return rotationRestToday.value ? 'Rest day' : 'Pick a workout';
});

// Start runs through the Start screen so the quick check-in still happens.
function startOrResume() {
  if (activeSession.value) router.push('/workout');
  else if (planned.value.length === 1) router.push({ path: '/start', query: { routine: String(planned.value[0].id) } });
  else router.push('/start');
}

onIonViewWillEnter(() => {
  load();
  loadWeights();
  loadTodayEntries();
  loadLastPhoto();
  loadRoutines();
});
</script>

<style scoped>
.head {
  justify-content: space-between;
  align-items: flex-start;
}

.week-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.week-nav {
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 14px;
}

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

.nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.days li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.dow {
  color: var(--text-secondary);
  font-size: 11px;
  letter-spacing: 0.05em;
}

.dom {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 19px;
  font-variant-numeric: tabular-nums;
}

.dom.today {
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 700;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: transparent;
}

.dot.on {
  background: var(--primary);
}

.today {
  padding: 12px;
  border-radius: 14px;
  background: var(--surface-high);
}

.today-text {
  min-width: 0;
  flex: 1;
}

.today-title {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choose {
  justify-content: center;
  gap: 8px;
  align-self: center;
}

.fuel-card {
  width: 100%;
  border: 0;
  color: var(--text-primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}

.fuel-text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.fuel-title {
  font-size: 16px;
  font-weight: 600;
}

.chev {
  display: flex;
  color: var(--text-secondary);
}

.weight-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spread {
  justify-content: space-between;
}

.baseline {
  align-items: baseline;
}

.goal-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--warning);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.big {
  font-size: 40px;
}

.unit {
  color: var(--text-secondary);
  font-size: 17px;
}

.goal-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--warning);
  font-size: 14px;
}

.all-link {
  align-self: flex-end;
}

.streak-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}
</style>
