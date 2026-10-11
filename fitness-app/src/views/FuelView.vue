<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row">
          <button type="button" class="cp-icon-btn" aria-label="Back to Home" @click="router.push('/home')">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <div>
            <h1 class="cp-h1">Fuel</h1>
            <p class="cp-sub">Food log &amp; coach</p>
          </div>
        </header>

        <!-- Calories + macros -->
        <section class="cp-card totals">
          <div class="cp-row spread baseline">
            <span>
              <span class="cp-num big">{{ fmt(todayKcal) }}</span>
              <span class="unit"> / {{ fmt(kcalGoal) }} kcal</span>
            </span>
            <span class="remaining" :class="{ over: remainingKcal < 0 }">
              {{ remainingKcal >= 0 ? `${fmt(remainingKcal)} left` : `${fmt(-remainingKcal)} over` }}
            </span>
          </div>
          <div class="bar" role="progressbar" :aria-valuenow="todayKcal" :aria-valuemax="kcalGoal" aria-label="Calories eaten today">
            <i :class="{ over: remainingKcal < 0 }" :style="{ width: `${pct(todayKcal, kcalGoal)}%` }"></i>
          </div>
          <div class="macros">
            <div v-for="m in macros" :key="m.label" class="macro">
              <span class="cp-lbl">{{ m.label }}</span>
              <span class="cp-num macro-val">{{ fmt(m.value) }}<small>/{{ m.goal }}g</small></span>
              <div class="bar thin"><i :style="{ width: `${pct(m.value, m.goal)}%`, background: m.color }"></i></div>
            </div>
          </div>
        </section>

        <!-- AI coach -->
        <section class="cp-card cp-row coach">
          <div class="cp-tile amber"><LottieIcon name="sparkle" :size="20" /></div>
          <div class="coach-text">
            <p class="cp-eyebrow">Coach</p>
            <p v-if="insightLoading" class="cp-lbl">Thinking about your day…</p>
            <p v-else class="insight">{{ insight || 'Log a workout or a meal and your coach will weigh in.' }}</p>
          </div>
        </section>

        <!-- Log a meal -->
        <section class="cp-card log">
          <p class="cp-lbl" style="font-size: 14px">Log a meal</p>

          <template v-if="loading">
            <div class="cp-row analyzing">
              <img v-if="previewUrl" :src="previewUrl" class="thumb" alt="" />
              <LottiePlayer name="liftLoader" :size="32" />
              <span>Analyzing your meal…</span>
            </div>
          </template>

          <template v-else-if="pendingScan">
            <div class="cp-row review">
              <img v-if="previewUrl" :src="previewUrl" class="thumb" alt="Scanned meal" />
              <div class="review-text">
                <p class="review-name">{{ pendingScan.name }}</p>
                <p class="cp-lbl">
                  {{ fmt(pendingScan.kcal) }} kcal · P {{ pendingScan.protein }}g · C {{ pendingScan.carbs }}g · F {{ pendingScan.fats }}g
                </p>
                <p class="cp-lbl">{{ pendingScan.confidence }}% confident</p>
              </div>
            </div>
            <div class="cp-row actions">
              <button type="button" class="cp-primary" @click="confirm">
                <LottieIcon name="check" :size="18" /> Add to today
              </button>
              <button type="button" class="ghost" aria-label="Discard scan" @click="discard">
                <LottieIcon name="close" :size="18" />
              </button>
            </div>
          </template>

          <template v-else>
            <div class="sources">
              <button type="button" class="source" @click="cameraInput?.click()">
                <LottieIcon name="camera" :size="22" />
                <span>Camera</span>
              </button>
              <button type="button" class="source" @click="galleryInput?.click()">
                <LottieIcon name="image" :size="22" />
                <span>Photo</span>
              </button>
              <button type="button" class="source" @click="openManual">
                <LottieIcon name="pencil" :size="22" />
                <span>Manual</span>
              </button>
            </div>
            <p class="cp-lbl">Snap your plate and the AI estimates calories and macros. You review before it's logged.</p>
          </template>

          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <p v-if="justAdded" class="added" role="status">
            <LottiePlayer name="successCheck" mode="once" :size="22" />Added to today's log
          </p>

          <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onFile" />
          <input ref="galleryInput" type="file" accept="image/*" class="hidden" @change="onFile" />
        </section>

        <!-- Today's meals -->
        <section>
          <p class="sec">Today</p>
          <div v-if="todayEntries.length" class="list">
            <div v-for="e in sortedEntries" :key="e.id" class="li">
              <div class="li-text">
                <p class="li-name">{{ e.name }}</p>
                <p class="cp-lbl">{{ mealLabel[e.mealType] }} · P {{ e.protein }} · C {{ e.carbs }} · F {{ e.fats }}</p>
              </div>
              <span class="cp-num kcal">{{ fmt(e.kcal) }}</span>
              <button type="button" class="del" :aria-label="`Delete ${e.name}`" @click="remove(e.id!)">
                <LottieIcon name="trash" :size="18" :draw="false" />
              </button>
            </div>
          </div>
          <div v-else class="cp-card"><p class="cp-lbl">Nothing logged yet today.</p></div>
        </section>
      </main>
    </ion-content>

    <BottomSheet :open="manualOpen" title="Add a meal" @close="manualOpen = false">
      <div class="seg" role="radiogroup" aria-label="Meal">
        <button
          v-for="m in mealTypes"
          :key="m"
          type="button"
          role="radio"
          :aria-checked="form.mealType === m"
          :class="{ on: form.mealType === m }"
          @click="form.mealType = m"
        >{{ mealLabel[m] }}</button>
      </div>
      <label class="field">
        <span class="cp-lbl">Name</span>
        <input v-model="form.name" type="text" placeholder="e.g. Grilled chicken salad" />
      </label>
      <div class="grid4">
        <label v-for="f in numberFields" :key="f.key" class="field">
          <span class="cp-lbl">{{ f.label }}</span>
          <input v-model.number="form[f.key]" type="number" inputmode="decimal" min="0" />
        </label>
      </div>
      <button type="button" class="cp-primary" :disabled="!form.name.trim()" @click="saveManual">Save meal</button>
    </BottomSheet>

    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import { useFoodData } from '@/data/useFoodData';
import { useInsightsData } from '@/data/useInsightsData';
import { useDashboardData } from '@/data/useDashboardData';
import type { FoodEntry } from '@/db/models/FoodEntry.model';
import { localDateString } from '@/utils/date';

const router = useRouter();
const {
  pendingScan, todayEntries, todayKcal, kcalGoal, remainingKcal, loading, error,
  scanFood, confirmScan, discardScan, addManualEntry, deleteEntry, loadTodayEntries
} = useFoodData();
const { insight, loading: insightLoading, loadInsight } = useInsightsData();
const { calories, caloriesGoal, activeMinutes, activeMinutesGoal, loadTodayActivity } = useDashboardData();

type MealType = FoodEntry['mealType'];
const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const mealLabel: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

const fmt = (n: number) => new Intl.NumberFormat().format(Math.round(n));
const pct = (v: number, goal: number) => (goal > 0 ? Math.min(100, Math.round((v / goal) * 100)) : 0);
const sum = (key: 'protein' | 'carbs' | 'fats') => todayEntries.value.reduce((s, e) => s + e[key], 0);

const macros = computed(() => [
  { label: 'Protein', value: sum('protein'), goal: 180, color: 'var(--primary)' },
  { label: 'Carbs', value: sum('carbs'), goal: 220, color: 'var(--secondary)' },
  { label: 'Fat', value: sum('fats'), goal: 70, color: 'var(--warning)' }
]);

const sortedEntries = computed(() =>
  [...todayEntries.value].sort((a, b) => mealTypes.indexOf(a.mealType) - mealTypes.indexOf(b.mealType))
);

function inferMealType(): MealType {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

// ---- Photo scan ----
const cameraInput = ref<HTMLInputElement | null>(null);
const galleryInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref('');
const justAdded = ref(false);
let addedTimer: ReturnType<typeof setTimeout> | undefined;

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  clearPreview();
  previewUrl.value = URL.createObjectURL(file);
  const reader = new FileReader();
  reader.onload = () => scanFood(reader.result as string, inferMealType());
  reader.readAsDataURL(file);
}

async function confirm() {
  await confirmScan();
  clearPreview();
  justAdded.value = true;
  clearTimeout(addedTimer);
  addedTimer = setTimeout(() => (justAdded.value = false), 2200);
}

function discard() {
  discardScan();
  clearPreview();
}

async function remove(id: number) {
  await deleteEntry(id);
}

// ---- Manual entry ----
const manualOpen = ref(false);
const blankForm = () => ({ mealType: inferMealType(), name: '', kcal: 0, protein: 0, carbs: 0, fats: 0 });
const form = ref(blankForm());
const numberFields = [
  { key: 'kcal', label: 'kcal' },
  { key: 'protein', label: 'Protein g' },
  { key: 'carbs', label: 'Carbs g' },
  { key: 'fats', label: 'Fat g' }
] as const;

function openManual() {
  form.value = blankForm();
  manualOpen.value = true;
}

async function saveManual() {
  const f = form.value;
  await addManualEntry({
    date: localDateString(),
    mealType: f.mealType,
    name: f.name.trim(),
    kcal: Number(f.kcal) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fats: Number(f.fats) || 0,
    confidence: 100
  });
  manualOpen.value = false;
}

onIonViewWillEnter(async () => {
  loadTodayEntries();
  await loadTodayActivity();
  loadInsight({
    calories: calories.value,
    caloriesGoal: caloriesGoal.value,
    activeMinutes: activeMinutes.value,
    activeMinutesGoal: activeMinutesGoal.value
  });
});

onBeforeUnmount(() => {
  clearPreview();
  clearTimeout(addedTimer);
});
</script>

<style scoped>
.spread { justify-content: space-between; }
.baseline { align-items: baseline; }

.totals { display: flex; flex-direction: column; gap: 12px; }
.big { font-size: 40px; }
.unit { color: var(--text-secondary); font-size: 16px; }
.remaining { color: var(--primary); font-size: 14px; font-weight: 600; }
.remaining.over { color: var(--danger); }

.bar {
  height: 8px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--surface-high);
}
.bar.thin { height: 5px; }
.bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.4s ease;
}
.bar i.over { background: var(--danger); }

.macros {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.macro { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.macro-val { font-size: 20px; }
.macro-val small { color: var(--text-secondary); font-family: var(--font-body); font-size: 12px; font-weight: 400; }

.coach { align-items: flex-start; }
.coach-text { min-width: 0; flex: 1; }
.insight { margin: 4px 0 0; font-size: 15px; line-height: 1.45; }

.log { display: flex; flex-direction: column; gap: 14px; }
.sources {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.source {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border: 0;
  border-radius: 14px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}
.source:active { transform: scale(0.97); }

.thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 12px;
  object-fit: cover;
}
.analyzing { color: var(--text-secondary); }


.review { align-items: flex-start; }
.review-text { min-width: 0; flex: 1; }
.review-name { margin: 0 0 4px; font-size: 17px; font-weight: 600; }
.actions .cp-primary { flex: 1; }
.ghost {
  display: flex;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 14px;
  background: var(--surface-high);
  color: var(--text-primary);
  cursor: pointer;
}

.error { margin: 0; color: var(--danger); font-size: 14px; }
.added { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--primary); font-size: 14px; }
.hidden { display: none; }

.sec { margin: 6px 4px 8px; color: var(--text-secondary); font-size: 13px; }
.list { overflow: hidden; border-radius: 18px; background: var(--surface); }
.li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px 12px 16px;
  border-top: 1px solid var(--surface-highest);
}
.li:first-child { border-top: 0; }
.li-text { min-width: 0; flex: 1; }
.li-name {
  margin: 0 0 2px;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kcal { font-size: 18px; }
.del {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

/* Manual entry sheet */
.seg {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 12px;
  background: var(--surface-high);
}
.seg button {
  flex: 1;
  padding: 9px 4px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}
.seg button.on { background: var(--bg-color); color: var(--text-primary); font-weight: 600; }

.field { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
.field input {
  width: 100%;
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--surface-highest);
  border-radius: 12px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
}
.field input:focus { outline: 2px solid var(--primary); outline-offset: 0; }
.grid4 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
</style>
