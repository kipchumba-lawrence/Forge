<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back to Home" @click="router.push('/home')">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <div class="head-text">
            <h1 class="cp-h1" style="font-size: 30px">Weigh-ins</h1>
            <p class="cp-sub">{{ entries.length }} weigh-in{{ entries.length === 1 ? '' : 's' }}</p>
          </div>
          <button type="button" class="log-btn" @click="sheet = 'weight'">
            <LottieIcon name="plus" :size="18" :draw="false" />Log
          </button>
        </header>

        <section class="cp-card">
          <div class="cp-row chart-head">
            <SegmentedControl v-model="range" label="Chart range" :options="rangeOptions" />
          </div>
          <WeightChart :points="chartPoints" :goal="goal" />
          <p v-if="rangeChange !== null" class="cp-lbl change">
            {{ rangeChange > 0 ? '+' : rangeChange < 0 ? '−' : '' }}{{ Math.abs(rangeChange) }} kg {{ rangeLabel }}
          </p>
        </section>

        <template v-if="weeks.length">
          <p class="cp-sec">Weekly average</p>
          <div class="weeks">
            <div v-for="w in weeks" :key="w.weekStart" class="cp-list">
              <div class="cp-li week-head">
                <span class="cp-li-label">Week of {{ dayMonth(w.weekStart) }}</span>
                <span v-if="w.change !== null" class="delta" :class="{ up: w.change > 0 }">
                  {{ w.change > 0 ? '↑' : w.change < 0 ? '↓' : '→' }} {{ Math.abs(w.change) }}
                </span>
                <span class="cp-li-value">Avg {{ w.average }} kg</span>
              </div>
              <div v-for="e in w.entries" :key="e.id" class="cp-li">
                <span class="cp-li-label day">
                  {{ weekdayDate(e.date) }}
                  <span v-if="e.source === 'checkin'" class="badge">check-in</span>
                </span>
                <span class="cp-num weight">{{ e.weightKg }} kg</span>
                <button type="button" class="del" :aria-label="`Delete weigh-in ${weekdayDate(e.date)}`" @click="deleteWeight(e.id!)">
                  <LottieIcon name="close" :size="16" :draw="false" />
                </button>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="cp-lbl">No weigh-ins yet. Tap Log to add your first.</p>
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
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import { useBodyWeightData } from '@/data/useBodyWeightData';
import { parseLocalDate } from '@/utils/date';

type Range = '30' | '90' | '365' | 'all';

const router = useRouter();
const { entries, weeks, goal, trend, load, deleteWeight } = useBodyWeightData();

const sheet = ref<'weight' | null>(null);
const range = ref<Range>('90');
const rangeOptions: { value: Range; label: string }[] = [
  { value: '30', label: '1M' }, { value: '90', label: '3M' }, { value: '365', label: '1Y' }, { value: 'all', label: 'All' }
];
const rangeLabel = computed(() => ({ '30': 'in 30 days', '90': 'in 3 months', '365': 'in a year', all: 'overall' })[range.value]);

const current = computed(() => (entries.value, trend(range.value === 'all' ? 'all' : Number(range.value))));
const chartPoints = computed(() => current.value.points);
const rangeChange = computed(() => current.value.change);

const dayMonth = (d: string) => parseLocalDate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const weekdayDate = (d: string) => parseLocalDate(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

onIonViewWillEnter(load);
</script>

<style scoped>
.head { align-items: flex-start; gap: 14px; }
.head-text { min-width: 0; flex: 1; }

.log-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 11px 14px;
  border: 0;
  border-radius: 12px;
  background: var(--primary-soft);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.chart-head { margin-bottom: 14px; }
.chart-head > * { flex: 1; }
.change { margin-top: 10px; }

.weeks { display: flex; flex-direction: column; gap: 10px; }
.week-head { background: var(--surface-high); }
.week-head .cp-li-label { font-weight: 600; }
.delta { color: var(--primary); font-size: 14px; }
.delta.up { color: var(--warning); }

.day { color: var(--text-secondary); }
.badge {
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--surface-high);
  font-size: 11px;
}
.weight { font-size: 19px; }

.del {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: rgba(var(--danger-rgb), 0.16);
  color: var(--danger);
  cursor: pointer;
}
</style>
