<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back" @click="goBack">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <h1 class="cp-h1 title">{{ exercise?.name ?? 'Exercise' }}</h1>
          <button
            v-if="exercise"
            type="button"
            class="cp-icon-btn fav"
            :class="{ on: exercise.isFavorite }"
            :aria-label="exercise.isFavorite ? 'Remove from favourites' : 'Add to favourites'"
            :aria-pressed="!!exercise.isFavorite"
            @click="toggleFav"
          >
            <LottiePlayer name="heartBurst" mode="toggle" :active="!!exercise.isFavorite" :size="24" />
          </button>
        </header>

        <section v-if="loading && !exercise" class="state">
          <LottiePlayer name="liftLoader" :size="72" label="Loading exercise" />
        </section>

        <section v-else-if="!exercise" class="state">
          <LottiePlayer name="searchSweep" :size="72" />
          <p>This exercise couldn't be found.</p>
          <button type="button" class="cp-link" @click="router.push('/exercises')">Back to exercises</button>
        </section>

        <template v-else>
          <!-- Animation -->
          <div v-if="settings.exerciseAnimations !== 'hidden'" class="media" :class="settings.exerciseAnimations">
            <video
              v-if="videoSrc"
              :src="videoSrc"
              :poster="exercise.cachedImageUrl || undefined"
              autoplay
              muted
              loop
              playsinline
              aria-label="Exercise animation"
            ></video>
            <img v-else-if="imageSrc" :src="imageSrc" :alt="`${exercise.name} demonstration`" />
            <div v-else class="media-empty">
              <LottieIcon name="exercises" :size="34" />
              <span>No animation for this exercise</span>
            </div>
          </div>

          <div class="pills">
            <span v-for="(p, i) in pills" :key="p" class="pill" :class="{ main: i === 0 }">{{ p }}</span>
          </div>

          <section class="cp-card stack">
            <p class="card-title">Muscles worked</p>
            <MuscleMap
              :label="`Muscles worked by ${exercise.name}: ${muscleSummary}`"
              :primary="muscles.primary"
              :secondary="muscles.secondary"
              legend
            />
          </section>

          <p v-if="log.best" class="best-line">
            <span class="best">Best: {{ log.best }} kg</span>
            <span v-if="log.lastText" class="last"> · last {{ log.lastDate }}: {{ log.lastText }}</span>
          </p>

          <button type="button" class="cp-primary" @click="planOpen = true">
            <LottieIcon name="plus" :size="18" />Add to my plan
          </button>
          <button type="button" class="cp-link history" @click="router.push(`/exercise/${exercise.exerciseDbId}/history`)">
            <LottieIcon name="history" :size="18" />History{{ log.sessions ? ` · ${log.sessions} session${log.sessions === 1 ? '' : 's'}` : '' }}
          </button>

          <section class="cp-card stack">
            <p class="cp-lbl">Plate loading</p>
            <SegmentedControl
              label="Plate loading"
              :model-value="plateMode"
              :options="plateOptions"
              @update:model-value="v => setPlateLoading(exercise!.exerciseDbId, v)"
            />
            <p class="cp-lbl">{{ plateHint }}</p>
          </section>

          <section v-if="log.e1rm" class="cp-card stack">
            <p class="cp-lbl">Estimated 1RM</p>
            <p class="cp-num e1rm">{{ log.e1rm.value }} kg</p>
            <p class="cp-lbl">From your log: {{ log.e1rm.weight }} kg × {{ log.e1rm.reps }} on {{ log.e1rm.date }} · Epley formula</p>
          </section>

          <section v-if="exercise.overview" class="cp-card stack">
            <p class="card-title">About</p>
            <p class="body">{{ exercise.overview }}</p>
          </section>

          <section v-if="exercise.instructions?.length" class="cp-card stack">
            <p class="card-title">How to</p>
            <ol class="steps">
              <li v-for="(step, i) in exercise.instructions" :key="i">{{ cleanStep(step) }}</li>
            </ol>
          </section>
          <section v-else-if="detailLoading" class="cp-card cp-row">
            <LottiePlayer name="liftLoader" :size="28" />
            <span class="cp-lbl">Loading instructions…</span>
          </section>

          <section v-if="exercise.exerciseTips?.length" class="cp-card stack">
            <p class="card-title">Tips</p>
            <ul class="steps">
              <li v-for="(tip, i) in exercise.exerciseTips" :key="i">{{ tip }}</li>
            </ul>
          </section>

          <button v-if="exercise.isCustom" type="button" class="delete" @click="deleteOpen = true">
            <LottieIcon name="trash" :size="16" :draw="false" />Delete this exercise
          </button>
        </template>
      </main>
    </ion-content>

    <AddToRoutineSheet :open="planOpen" :exercise="exercise" @close="planOpen = false" />
    <BottomSheet :open="deleteOpen" title="Delete exercise?" @close="deleteOpen = false">
      <p class="cp-lbl body">Removes “{{ exercise?.name }}” from your library. Workouts you've logged with it keep their sets.</p>
      <button type="button" class="cp-primary destructive" @click="doDelete">Delete exercise</button>
      <button type="button" class="text-btn" @click="deleteOpen = false">Cancel</button>
    </BottomSheet>
    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import AddToRoutineSheet from '@/components/exercises/AddToRoutineSheet.vue';
import MuscleMap from '@/components/MuscleMap.vue';
import { db } from '@/db/AppDatabase';
import type { Exercise } from '@/db/models/Exercise.model';
import { useExerciseData } from '@/data/useExerciseData';
import { useExerciseCatalog } from '@/data/useExerciseCatalog';
import { useSettings } from '@/data/useSettings';
import { estimate1RM } from '@/data/useMuscleAnalytics';
import { MUSCLE_GROUPS, groupsForExercise } from '@/data/static/muscleGroups';
import { chronological, doneSets, formatSets } from '@/data/workoutSummary';
import { parseLocalDate } from '@/utils/date';

type PlateMode = NonNullable<Exercise['plateLoading']>;

const route = useRoute();
const router = useRouter();
const { settings } = useSettings();
const { getById } = useExerciseData();
const { toggleFavourite, setPlateLoading, deleteCustomExercise, catalog, load: loadCatalog } = useExerciseCatalog();

const exercise = ref<Exercise | null>(null);
const loading = ref(false);
const detailLoading = ref(false);
const planOpen = ref(false);
const deleteOpen = ref(false);

const dayMonth = (d: string) => parseLocalDate(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
// Some API steps start with "Step:1 "; the list numbers them already.
const cleanStep = (s: string) => s.replace(/^\s*step\s*:?\s*\d+\s*[:.)-]?\s*/i, '');

// ---- Media ----
let customUrl = '';
const customMediaUrl = computed(() => {
  if (customUrl) URL.revokeObjectURL(customUrl);
  const m = exercise.value?.customMedia;
  customUrl = m ? URL.createObjectURL(m) : '';
  return customUrl;
});
const videoSrc = computed(() => {
  const m = exercise.value?.customMedia;
  if (m) return m.type.startsWith('video/') ? customMediaUrl.value : '';
  return exercise.value?.videoUrl ?? '';
});
const imageSrc = computed(() => {
  const m = exercise.value?.customMedia;
  if (m?.type.startsWith('image/')) return customMediaUrl.value;
  return exercise.value?.cachedImageUrl || exercise.value?.gifUrl || '';
});
onBeforeUnmount(() => customUrl && URL.revokeObjectURL(customUrl));

const muscles = computed(() => {
  const ex = exercise.value;
  if (!ex) return { primary: [], secondary: [] };
  const { primary, secondary } = groupsForExercise(ex);
  return { primary: [...primary], secondary: [...secondary] };
});
const muscleSummary = computed(() => {
  const label = (g: string) => MUSCLE_GROUPS.find(m => m.id === g)?.label ?? g;
  const p = muscles.value.primary.map(label).join(', ');
  const sec = muscles.value.secondary.map(label).join(', ');
  return [p && `primary ${p}`, sec && `secondary ${sec}`].filter(Boolean).join('; ') || 'not specified';
});

// Target, equipment, then the secondary groups it also trains.
const pills = computed(() => {
  const ex = exercise.value;
  if (!ex) return [];
  const { primary, secondary } = groupsForExercise(ex);
  const label = (g: string) => MUSCLE_GROUPS.find(m => m.id === g)?.label ?? g;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return [...[...primary].map(label), cap(ex.equipment), ...[...secondary].map(label)].filter((p, i, a) => p && a.indexOf(p) === i);
});

// ---- Your log for this exercise ----
const log = ref<{
  best: number | null; sessions: number; lastDate: string; lastText: string;
  e1rm: { value: number; weight: number; reps: number; date: string } | null;
}>({ best: null, sessions: 0, lastDate: '', lastText: '', e1rm: null });

async function loadLog(exerciseDbId: string) {
  const sessions = chronological(await db.workoutSessions.where('status').equals('completed').toArray());
  let best: number | null = null;
  let e1rm: typeof log.value.e1rm = null;
  let count = 0;
  let lastDate = '', lastText = '';
  for (const s of sessions) {
    const sets = s.exercises.filter(e => e.exerciseDbId === exerciseDbId).flatMap(e => doneSets(e.sets));
    if (!sets.length) continue;
    count++;
    lastDate = dayMonth(s.date);
    lastText = formatSets(sets).split(' · ').join(', ');
    for (const set of sets) {
      best = Math.max(best ?? 0, set.weight);
      const v = estimate1RM(set.weight, set.reps);
      if (!e1rm || v > e1rm.value) e1rm = { value: Math.round(v * 10) / 10, weight: set.weight, reps: set.reps, date: dayMonth(s.date) };
    }
  }
  log.value = { best, sessions: count, lastDate, lastText, e1rm };
}

// ---- Plate loading ----
const plateOptions: { value: PlateMode; label: string }[] = [
  { value: 'perSide', label: 'Per side' }, { value: 'single', label: 'Single stack' }, { value: 'off', label: 'Off' }
];
const plateMode = computed<PlateMode>(() => {
  const ex = catalog.value.find(e => e.exerciseDbId === exercise.value?.exerciseDbId) ?? exercise.value;
  if (ex?.plateLoading) return ex.plateLoading;
  return ex?.equipment === 'barbell' ? 'perSide' : ex?.equipment === 'cable' || ex?.equipment?.includes('machine') ? 'single' : 'off';
});
const plateHint = computed(() => ({
  perSide: 'Plates split over both sides of a bar.',
  single: 'One stack or pin, like a cable or machine.',
  off: 'No plate breakdown for this exercise.'
})[plateMode.value]);

// ---- Actions ----
async function toggleFav() {
  if (!exercise.value) return;
  await toggleFavourite(exercise.value.exerciseDbId);
  exercise.value = { ...exercise.value, isFavorite: !exercise.value.isFavorite };
}

async function doDelete() {
  if (exercise.value) await deleteCustomExercise(exercise.value.exerciseDbId);
  deleteOpen.value = false;
  router.replace('/exercises');
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/exercises');
}

async function load() {
  const id = String(route.params.id);
  loading.value = true;
  try {
    if (!catalog.value.length) await loadCatalog();
    const cached = await db.exercises.where('exerciseDbId').equals(id).first();
    exercise.value = cached ?? null;
    loadLog(id);
    // Instructions, video and tips come from the detail endpoint, fetched
    // once per exercise and cached. Custom exercises have nothing to fetch.
    if (!cached?.isCustom && !cached?.instructions?.length) {
      detailLoading.value = true;
      const full = await getById(id);
      if (full) exercise.value = { ...(cached ?? {}), ...full } as Exercise;
      detailLoading.value = false;
    }
  } finally {
    loading.value = false;
  }
}

onIonViewWillEnter(load);
</script>

<style scoped>
.head { align-items: flex-start; gap: 14px; }
.title { min-width: 0; flex: 1; font-size: 30px; }
.fav { color: var(--text-primary); }
.fav.on { color: var(--danger); }

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 12px;
  color: var(--text-secondary);
  text-align: center;
}
.state p { margin: 0; }

.media {
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
}
.media video, .media img { display: block; width: 100%; height: 280px; object-fit: contain; }
.media.small video, .media.small img { height: 170px; }
.media-empty {
  display: flex;
  height: 200px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed var(--surface-highest);
  border-radius: inherit;
  background: var(--surface-high);
  color: var(--text-secondary);
  font-size: 13px;
}

.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--surface-high);
  font-size: 13px;
}
.pill.main { background: var(--primary-soft); color: var(--primary); }

.best-line { margin: 0; font-size: 14px; line-height: 1.5; }
.best { color: var(--warning); font-weight: 600; }
.last { color: var(--text-secondary); }

.history { align-self: center; gap: 8px; padding: 6px; font-size: 16px; }

.stack { display: flex; flex-direction: column; gap: 8px; }
.card-title { margin: 0; font-size: 17px; font-weight: 600; }
.e1rm { margin: 0; font-size: 36px; }
.body { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6; }
.steps { margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 14px; line-height: 1.6; }
.steps li { margin: 2px 0; }

.delete {
  display: flex;
  align-items: center;
  align-self: center;
  gap: 6px;
  padding: 6px;
  border: 0;
  background: none;
  color: var(--danger);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}
.destructive { background: var(--danger); color: #fff; }
.text-btn {
  padding: 8px;
  border: 0;
  background: none;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 16px;
  cursor: pointer;
}
</style>
