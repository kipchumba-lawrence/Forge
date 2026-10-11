<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main v-if="session" class="cp-main workout" :class="{ resting: restRemaining > 0 }">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Minimise workout" @click="router.push('/home')">
            <LottieIcon name="chevronDown" :size="20" :draw="false" />
          </button>
          <div class="title">
            <p class="name">{{ session.name }}</p>
            <p class="cp-lbl">{{ formatClock(elapsedSeconds) }} · {{ doneSets }}/{{ totalSets }} sets</p>
          </div>
          <button type="button" class="cp-icon-btn" aria-label="Workout options" @click="workoutMenu = true">
            <LottieIcon name="more" :size="20" :draw="false" />
          </button>
          <button type="button" class="finish" @click="requestFinish">Finish</button>
        </header>

        <div class="progress" role="progressbar" :aria-valuenow="doneSets" :aria-valuemax="totalSets" aria-label="Sets completed">
          <i :style="{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }"></i>
        </div>

        <!-- Freestyle with nothing added yet -->
        <section v-if="!session.exercises.length" class="state">
          <LottiePlayer name="liftLoader" :size="72" />
          <p>Pick your first exercise to get going.</p>
          <button type="button" class="cp-primary" @click="pickerOpen = true"><LottieIcon name="plus" :size="18" />Add exercise</button>
        </section>

        <template v-else-if="current">
          <div class="cp-row strip-row">
            <p class="cp-lbl">Exercise {{ index + 1 }} / {{ session.exercises.length }}<template v-if="current.supersetWithPrev || session.exercises[index + 1]?.supersetWithPrev"> · Superset</template></p>
          </div>

          <div v-if="settings.exerciseAnimations !== 'hidden'" class="media" :class="settings.exerciseAnimations">
            <video v-if="info?.videoUrl" :key="info.videoUrl" :src="info.videoUrl" :poster="info.cachedImageUrl || undefined" autoplay muted loop playsinline aria-label="Exercise animation"></video>
            <img v-else-if="info?.cachedImageUrl || info?.gifUrl" :src="info.cachedImageUrl || info.gifUrl" :alt="`${current.name} demonstration`" />
            <div v-else class="media-empty"><LottieIcon name="exercises" :size="30" /></div>
          </div>

          <div class="cp-row spread">
            <h2 class="cp-num ex-name">{{ current.name }}</h2>
            <button type="button" class="cp-icon-btn small" aria-label="Exercise options" @click="exerciseMenu = true">
              <LottieIcon name="more" :size="18" :draw="false" />
            </button>
          </div>

          <div class="pills">
            <span v-for="p in pills" :key="p" class="pill">{{ p }}</span>
            <span v-if="best" class="pill">Best: {{ best }} kg</span>
          </div>

          <MuscleMap
            v-if="muscles.primary.length || muscles.secondary.length"
            compact
            legend
            :label="`${current.name} works ${muscleText}`"
            :primary="muscles.primary"
            :secondary="muscles.secondary"
          />

          <p class="cp-lbl plan-line">
            Plan: {{ planText }}
            <template v-if="settings.underExercise === 'lastTime' && last"><br />Last time ({{ last.ago }}): {{ last.text }}</template>
            <template v-else-if="settings.underExercise === 'best' && bestSet"><br />Best set: {{ bestSet }}</template>
          </p>

          <p v-if="current.progressionNote" class="prog-line">
            <span class="prog-rule" :class="direction">
              <LottieIcon name="arrowUp" :size="15" :draw="false" class="arrow" />{{ ruleLabel }}
            </span>
            <span class="cp-lbl">· {{ current.progressionNote }}</span>
          </p>

          <!-- Sets -->
          <section class="cp-card sets">
            <div class="set-head">
              <span class="c-num"></span>
              <span class="c-val weight">WEIGHT (KG)</span>
              <span class="c-val">REPS</span>
              <span v-if="settings.effortScale !== 'off'" class="c-eff">{{ settings.effortScale.toUpperCase() }}</span>
              <span class="c-chk"></span>
            </div>
            <template v-for="(set, si) in current.sets" :key="si">
              <div class="set-row" :class="{ done: set.completed }">
                <button type="button" class="c-num badge" :class="{ on: set.completed }" :aria-label="`Set ${si + 1} options`" @click="setMenu = si">
                  {{ si + 1 }}<span v-if="set.amrap" class="amrap">+</span>
                </button>
                <Stepper class="c-val weight" :model-value="set.weight" :step="weightStep" :label="`Set ${si + 1} weight`" :done="set.completed" @update:model-value="v => updateSet(index, si, { weight: v })" />
                <Stepper class="c-val" :model-value="set.reps" :step="1" :max="100" :label="`Set ${si + 1} reps`" :done="set.completed" @update:model-value="v => updateSet(index, si, { reps: v })" />
                <button
                  v-if="settings.effortScale !== 'off'"
                  type="button"
                  class="c-eff effort"
                  :class="{ set: effortOf(set) !== undefined }"
                  :aria-label="`Set ${si + 1} ${settings.effortScale.toUpperCase()}: ${effortOf(set) ?? 'not set'}`"
                  @click="effortFor = si"
                >{{ effortOf(set) ?? settings.effortScale.toUpperCase() }}</button>
                <button type="button" class="c-chk check" :class="{ on: set.completed }" :aria-label="set.completed ? `Untick set ${si + 1}` : `Complete set ${si + 1}`" :aria-pressed="set.completed" @click="toggleSet(index, si)">
                  <LottieIcon v-if="set.completed" name="check" :size="18" />
                </button>
              </div>
              <p v-if="si === plateRowIndex && plates" class="plates">
                <LottieIcon name="target" :size="14" :draw="false" />{{ plates }}
              </p>
            </template>
            <p v-if="current.sets.some(s => s.amrap)" class="cp-lbl small">+ = last set: as many reps as you can with good form.</p>
            <button type="button" class="add-set" @click="addSet(index)"><LottieIcon name="plus" :size="16" :draw="false" />Add set</button>
          </section>

          <div class="cp-row nav">
            <button type="button" class="nav-btn" :disabled="index === 0" @click="goTo(index - 1)">Prev</button>
            <button v-if="index < session.exercises.length - 1" type="button" class="nav-btn primary" @click="goTo(index + 1)">Next exercise</button>
            <button v-else type="button" class="nav-btn primary" @click="requestFinish">Finish workout</button>
          </div>
          <button type="button" class="cp-link add-ex" @click="pickerOpen = true"><LottieIcon name="plus" :size="16" :draw="false" />Add exercise</button>
        </template>
      </main>

      <main v-else-if="!finished" class="cp-main">
        <h1 class="cp-h1">Workout</h1>
        <section class="state">
          <LottiePlayer name="searchSweep" :size="64" />
          <p>No workout in progress.</p>
          <button type="button" class="cp-primary" @click="router.push('/start')">Start a workout</button>
        </section>
      </main>
    </ion-content>

    <!-- Rest timer -->
    <div v-if="session && restRemaining > 0" class="rest" role="timer" aria-live="off" :style="{ '--rest-pct': `${restPct}%` }">
      <div class="rest-time">
        <p class="cp-num">{{ formatClock(restRemaining) }}</p>
        <p class="cp-lbl">Rest</p>
      </div>
      <button type="button" class="rest-btn" aria-label="Rest 15 seconds less" @click="adjustRest(-15)">−15s</button>
      <button type="button" class="rest-btn" aria-label="Rest 15 seconds more" @click="adjustRest(15)">+15s</button>
      <button type="button" class="rest-btn skip" @click="skipRest">Skip</button>
    </div>

    <!-- PR celebration -->
    <Transition name="pop">
      <div v-if="prFlash" class="pr-toast" role="status">
        <LottiePlayer name="trophyBurst" mode="once" :size="56" />
        <div>
          <p class="pr-title">New PR!</p>
          <p class="cp-lbl">{{ prFlash.exercise }} · {{ prFlash.weight }} × {{ prFlash.reps }}</p>
        </div>
      </div>
    </Transition>

    <!-- Finished -->
    <BottomSheet :open="finished !== null" title="Workout complete" @close="viewFinished">
      <div v-if="finished" class="finished">
        <LottiePlayer name="trophyBurst" mode="once" :size="96" />
        <p class="fin-name">{{ finished.name }}</p>
        <div class="fin-stats">
          <div><p class="cp-num">{{ formatDuration(finished.duration) }}</p><p class="cp-lbl">Time</p></div>
          <div><p class="cp-num">{{ finished.sets }}</p><p class="cp-lbl">Sets</p></div>
          <div><p class="cp-num">{{ fmt(finished.volume) }}</p><p class="cp-lbl">kg lifted</p></div>
          <div><p class="cp-num">{{ finished.prs }}</p><p class="cp-lbl">PRs</p></div>
        </div>
        <button type="button" class="cp-primary" @click="viewFinished">View workout</button>
      </div>
    </BottomSheet>

    <BottomSheet :open="confirmFinish" title="Finish workout?" @close="confirmFinish = false">
      <p class="cp-lbl">{{ unfinishedSets }} set{{ unfinishedSets === 1 ? ' isn\'t' : 's aren\'t' }} ticked. Unticked sets won't be saved.</p>
      <button type="button" class="cp-primary" @click="doFinish">Finish anyway</button>
      <button type="button" class="text-btn" @click="confirmFinish = false">Keep going</button>
    </BottomSheet>

    <BottomSheet :open="workoutMenu" title="Workout" @close="workoutMenu = false">
      <div class="menu">
        <button type="button" class="menu-row" @click="workoutMenu = false; pickerOpen = true"><LottieIcon name="plus" :size="18" :draw="false" />Add exercise</button>
        <button type="button" class="menu-row danger" @click="workoutMenu = false; confirmDiscard = true"><LottieIcon name="trash" :size="18" :draw="false" />Discard workout</button>
      </div>
    </BottomSheet>

    <BottomSheet :open="confirmDiscard" title="Discard this workout?" @close="confirmDiscard = false">
      <p class="cp-lbl">Every set you've logged in this workout is deleted. This can't be undone.</p>
      <button type="button" class="cp-primary destructive" @click="doDiscard">Discard workout</button>
      <button type="button" class="text-btn" @click="confirmDiscard = false">Keep going</button>
    </BottomSheet>

    <BottomSheet :open="exerciseMenu" :title="current?.name ?? ''" @close="exerciseMenu = false">
      <div class="menu">
        <button type="button" class="menu-row" @click="exerciseMenu = false; router.push(`/exercise/${current!.exerciseDbId}`)"><LottieIcon name="info" :size="18" :draw="false" />How to do it</button>
        <button type="button" class="menu-row" @click="exerciseMenu = false; restMenu = true"><LottieIcon name="timer" :size="18" :draw="false" />Rest time · {{ formatClock(current?.restSec ?? settings.restTimerSec) }}</button>
        <button type="button" class="menu-row danger" @click="exerciseMenu = false; removeExercise(index)"><LottieIcon name="trash" :size="18" :draw="false" />Remove from this workout</button>
      </div>
    </BottomSheet>

    <BottomSheet :open="setMenu !== null" :title="`Set ${(setMenu ?? 0) + 1}`" @close="setMenu = null">
      <div class="menu">
        <button type="button" class="menu-row" @click="startRest(current?.restSec ?? settings.restTimerSec); setMenu = null"><LottieIcon name="timer" :size="18" :draw="false" />Start rest timer</button>
        <button type="button" class="menu-row danger" :disabled="(current?.sets.length ?? 0) <= 1" @click="removeSet(index, setMenu!); setMenu = null"><LottieIcon name="trash" :size="18" :draw="false" />Remove set</button>
      </div>
    </BottomSheet>

    <OptionSheet
      :open="effortFor !== null"
      :title="settings.effortScale === 'rpe' ? 'RPE (effort out of 10)' : 'RIR (reps left in the tank)'"
      :hint="settings.effortScale === 'rpe' ? '10 = nothing left, 8 = two more reps possible.' : '0 = couldn\'t do another rep, 2 = two more were possible.'"
      :model-value="effortFor !== null ? effortOf(current!.sets[effortFor]) : undefined"
      :options="effortOptions"
      @update:model-value="setEffort"
      @close="effortFor = null"
    />
    <OptionSheet
      :open="restMenu"
      title="Rest for this exercise"
      :model-value="current?.restSec"
      :options="restOptions"
      @update:model-value="v => setExerciseRest(index, v)"
      @close="restMenu = false"
    />
    <ExercisePickerSheet :open="pickerOpen" @close="pickerOpen = false" @pick="addExercise" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewDidLeave, onIonViewWillEnter } from '@ionic/vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import MuscleMap from '@/components/MuscleMap.vue';
import ExercisePickerSheet from '@/components/workout/ExercisePickerSheet.vue';
import OptionSheet from '@/components/workout/OptionSheet.vue';
import Stepper from '@/components/workout/Stepper.vue';
import { db } from '@/db/AppDatabase';
import type { Exercise } from '@/db/models/Exercise.model';
import type { WorkoutSession, WorkoutSet } from '@/db/models/WorkoutSession.model';
import { useActiveWorkout } from '@/data/useActiveWorkout';
import { useSettings } from '@/data/useSettings';
import { RULES, plateBreakdown } from '@/data/progression';
import { MUSCLE_GROUPS, groupsForExercise, type MuscleGroup } from '@/data/static/muscleGroups';
import { formatDuration, formatSets, personalRecords, sessionSetCount, sessionVolume } from '@/data/workoutSummary';
import { estimate1RM } from '@/data/useMuscleAnalytics';
import { formatRest } from '@/utils/format';
import { parseLocalDate, localDateString } from '@/utils/date';

const router = useRouter();
const { settings } = useSettings();
const {
  session, prFlash, restRemaining, restTotal, elapsedSeconds, totalSets, doneSets, unfinishedSets,
  resume, updateSet, toggleSet, addSet, removeSet, addExercise, removeExercise, goTo, setExerciseRest,
  startRest, adjustRest, skipRest, finish, discard
} = useActiveWorkout();

const index = computed(() => Math.min(session.value?.currentExercise ?? 0, Math.max(0, (session.value?.exercises.length ?? 1) - 1)));
const current = computed(() => session.value?.exercises[index.value] ?? null);

const formatClock = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};
const fmt = (n: number) => new Intl.NumberFormat().format(Math.round(n));
const restPct = computed(() => (restTotal.value ? (restRemaining.value / restTotal.value) * 100 : 0));

// ---- Current exercise info ----
const info = ref<Exercise | null>(null);
const history = ref<WorkoutSession[]>([]);
watch(() => current.value?.exerciseDbId, async id => {
  info.value = id ? (await db.exercises.where('exerciseDbId').equals(id).first()) ?? null : null;
}, { immediate: true });

const muscles = computed(() => {
  if (!info.value) return { primary: [] as MuscleGroup[], secondary: [] as MuscleGroup[] };
  const g = groupsForExercise(info.value);
  return { primary: [...g.primary], secondary: [...g.secondary] };
});
const labelOf = (g: MuscleGroup) => MUSCLE_GROUPS.find(m => m.id === g)?.label ?? g;
const muscleText = computed(() => [...muscles.value.primary, ...muscles.value.secondary].map(labelOf).join(', '));
const pills = computed(() => {
  const out = muscles.value.primary.map(labelOf);
  if (info.value?.equipment) out.push(info.value.equipment.charAt(0).toUpperCase() + info.value.equipment.slice(1));
  return out;
});

const weightStep = computed(() => (info.value?.equipment === 'dumbbell' ? 1 : 2.5));

// History for this exercise (finished workouts only, not this one).
const pastForCurrent = computed(() => {
  const id = current.value?.exerciseDbId;
  if (!id) return [];
  return history.value
    .filter(s => s.exercises.some(e => e.exerciseDbId === id && e.sets.some(x => x.completed)))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
});
const best = computed(() => {
  const id = current.value?.exerciseDbId;
  const ws = pastForCurrent.value.flatMap(s => s.exercises.filter(e => e.exerciseDbId === id).flatMap(e => e.sets.filter(x => x.completed).map(x => x.weight)));
  return ws.length ? Math.max(...ws) : null;
});
const bestSet = computed(() => {
  const id = current.value?.exerciseDbId;
  let top: WorkoutSet | null = null;
  for (const s of pastForCurrent.value) for (const e of s.exercises) if (e.exerciseDbId === id) for (const x of e.sets) if (x.completed && (!top || estimate1RM(x.weight, x.reps) > estimate1RM(top.weight, top.reps))) top = x;
  return top ? `${top.weight} × ${top.reps}` : '';
});
const last = computed(() => {
  const s = pastForCurrent.value[0];
  if (!s) return null;
  const sets = s.exercises.filter(e => e.exerciseDbId === current.value?.exerciseDbId).flatMap(e => e.sets);
  const days = Math.round((parseLocalDate(localDateString()).getTime() - parseLocalDate(s.date).getTime()) / 86_400_000);
  return { ago: days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`, text: formatSets(sets).split(' · ').join(', ') };
});

const planText = computed(() => {
  const sets = current.value?.sets ?? [];
  if (!sets.length) return '—';
  const reps = sets.map(s => `${s.reps}${s.amrap ? '+' : ''}`);
  const same = reps.every(r => r === reps[0]);
  return same ? `${sets.length} × ${reps[0]}` : reps.join(', ');
});
const ruleLabel = computed(() => RULES[current.value?.progression ?? 'none'].label);
const direction = computed(() => current.value?.progressionDirection ?? 'same');

// Plate breakdown under the first unticked set, for bar exercises.
const plateRowIndex = computed(() => current.value?.sets.findIndex(s => !s.completed) ?? -1);
const plates = computed(() => {
  const mode = info.value?.plateLoading ?? (info.value?.equipment === 'barbell' ? 'perSide' : 'off');
  const set = current.value?.sets[plateRowIndex.value];
  if (mode !== 'perSide' || !set) return null;
  return plateBreakdown(set.weight);
});

// ---- Effort ----
const effortFor = ref<number | null>(null);
const effortOf = (set: WorkoutSet) => (settings.effortScale === 'rpe' ? set.rpe : set.rir);
const effortOptions = computed(() =>
  settings.effortScale === 'rpe'
    ? [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => ({ value: v as number | undefined, label: `RPE ${v}`, description: v === 10 ? 'Maximum effort' : v >= 9 ? 'Almost nothing left' : undefined }))
    : [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5].map(v => ({ value: v as number | undefined, label: `RIR ${v}${v === 5 ? '+' : ''}`, description: v === 0 ? 'Failure: no more reps possible' : v <= 1 ? 'Very hard' : v >= 4 ? 'Easy' : undefined }))
);
function setEffort(v: number | undefined) {
  if (effortFor.value === null) return;
  updateSet(index.value, effortFor.value, settings.effortScale === 'rpe' ? { rpe: v } : { rir: v });
}

// ---- Menus ----
const workoutMenu = ref(false);
const exerciseMenu = ref(false);
const restMenu = ref(false);
const setMenu = ref<number | null>(null);
const pickerOpen = ref(false);
const confirmDiscard = ref(false);
const restOptions = [undefined, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map(v => ({
  value: v as number | undefined,
  label: v === undefined ? `Default (${formatRest(settings.restTimerSec)})` : formatRest(v)
}));

// PR toast hides itself.
let prTimer: ReturnType<typeof setTimeout> | undefined;
watch(prFlash, v => {
  if (!v) return;
  clearTimeout(prTimer);
  prTimer = setTimeout(() => (prFlash.value = null), 2800);
});

// ---- Finish ----
const confirmFinish = ref(false);
const finished = ref<{ id: number; name: string; duration: number; sets: number; volume: number; prs: number } | null>(null);
function requestFinish() {
  if (unfinishedSets.value > 0 && doneSets.value > 0) confirmFinish.value = true;
  else if (doneSets.value === 0) confirmDiscard.value = true;
  else doFinish();
}
async function doFinish() {
  confirmFinish.value = false;
  const id = await finish();
  if (!id) return;
  const s = await db.workoutSessions.get(id);
  const all = await db.workoutSessions.where('status').equals('completed').toArray();
  if (s) finished.value = { id, name: s.name, duration: s.durationSeconds, sets: sessionSetCount(s), volume: sessionVolume(s), prs: personalRecords(all).get(id)?.size ?? 0 };
}
function viewFinished() {
  const id = finished.value?.id;
  finished.value = null;
  router.replace(id ? `/history/${id}` : '/home');
}
async function doDiscard() {
  confirmDiscard.value = false;
  await discard();
  router.replace('/start');
}

// ---- Keep the screen awake during a workout ----
let wakeLock: { release: () => Promise<void> } | null = null;
async function holdWake() {
  if (!settings.keepScreenAwake || wakeLock) return;
  try {
    wakeLock = await (navigator as any).wakeLock?.request('screen');
  } catch {
    wakeLock = null; // not supported or denied; the workout still works
  }
}
function releaseWake() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}
// The browser drops the lock when the page is hidden; take it back on return.
const onVisible = () => { if (document.visibilityState === 'visible' && session.value) { wakeLock = null; holdWake(); } };
document.addEventListener('visibilitychange', onVisible);

onIonViewWillEnter(async () => {
  await resume();
  history.value = await db.workoutSessions.where('status').equals('completed').toArray();
  if (session.value) holdWake();
});
onIonViewDidLeave(releaseWake);
onBeforeUnmount(() => {
  releaseWake();
  document.removeEventListener('visibilitychange', onVisible);
  clearTimeout(prTimer);
});
</script>

<style scoped>
.workout { padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)); }
.workout.resting { padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px)); }

.head { gap: 8px; }
.title { min-width: 0; flex: 1; text-align: center; }
.name { margin: 0; overflow: hidden; font-size: 18px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.finish {
  padding: 12px 18px;
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: var(--on-primary);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.cp-icon-btn.small { width: 40px; height: 40px; }

.progress { height: 4px; overflow: hidden; border-radius: 99px; background: var(--surface-high); }
.progress i { display: block; height: 100%; border-radius: inherit; background: var(--primary); transition: width 0.3s ease; }

.state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 50px 12px; color: var(--text-secondary); text-align: center; }
.state p { margin: 0; }

.media { overflow: hidden; border-radius: 18px; background: #fff; }
.media video, .media img { display: block; width: 100%; height: 240px; object-fit: contain; }
.media.small video, .media.small img { height: 150px; }
.media-empty { display: flex; height: 160px; align-items: center; justify-content: center; background: var(--surface-high); color: var(--text-secondary); }

.spread { justify-content: space-between; }
.ex-name { margin: 0; font-size: 26px; line-height: 1.15; }
.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill { padding: 6px 12px; border-radius: 999px; background: var(--surface-high); font-size: 13px; }
.plan-line { line-height: 1.5; }
.prog-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; font-size: 14px; }
.prog-rule { display: inline-flex; align-items: center; gap: 4px; color: var(--primary); font-weight: 600; }
.prog-rule.down { color: var(--warning); }
.prog-rule.down .arrow { transform: rotate(180deg); }
.prog-rule.same .arrow, .prog-rule.start .arrow { transform: rotate(90deg); }

.sets { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
.set-head, .set-row { display: flex; align-items: center; gap: 6px; }
.set-head { color: var(--text-secondary); font-size: 11px; letter-spacing: 0.06em; }
.c-num { width: 26px; flex-shrink: 0; }
.c-val { min-width: 0; flex: 1; text-align: center; }
/* Weights like 102.5 need more room than reps. */
.c-val.weight { flex: 1.5; }
.c-eff { width: 50px; flex-shrink: 0; text-align: center; }
.c-chk { width: 36px; flex-shrink: 0; }
.badge {
  position: relative;
  display: flex;
  height: 26px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.badge.on { background: var(--primary); color: var(--on-primary); }
.amrap { position: absolute; top: -6px; right: -6px; color: var(--warning); font-size: 13px; }
.effort {
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: var(--surface-high);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}
.effort.set { color: var(--warning); font-weight: 600; }
.check {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 2px solid var(--surface-highest);
  border-radius: 50%;
  background: transparent;
  color: var(--on-primary);
  cursor: pointer;
}
.check.on { border-color: var(--primary); background: var(--primary); }
.plates { display: flex; align-items: center; gap: 6px; margin: -2px 0 2px 32px; color: var(--text-secondary); font-size: 13px; }
.small { font-size: 12px; }
.add-set, .add-ex {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 0;
  background: none;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 15px;
  cursor: pointer;
}
.add-ex { align-self: center; }

.nav { gap: 10px; }
.nav-btn {
  height: 52px;
  flex: 1;
  border: 0;
  border-radius: 14px;
  background: var(--surface-high);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.nav-btn.primary { background: var(--primary); color: var(--on-primary); }
.nav-btn:disabled { opacity: 0.4; cursor: default; }

/* Rest bar */
.rest {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 140;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 3px solid transparent;
  border-image: linear-gradient(to right, var(--primary) var(--rest-pct), var(--surface-highest) var(--rest-pct)) 1;
  background: var(--tabbar-bg);
}
.rest-time { flex: 1; }
.rest-time .cp-num { margin: 0; font-size: 32px; }
.rest-btn {
  height: 44px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}
.rest-btn.skip { padding: 0 18px; background: var(--primary); color: var(--on-primary); font-weight: 600; }

/* PR toast */
.pr-toast {
  position: fixed;
  top: calc(16px + env(safe-area-inset-top, 0px));
  left: 50%;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px 10px 10px;
  border-radius: 18px;
  background: var(--surface-high);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  color: var(--warning);
  transform: translateX(-50%);
}
.pr-title { margin: 0; color: var(--warning); font-family: var(--font-display); font-size: 20px; font-weight: 600; }
.pop-enter-active, .pop-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translate(-50%, -12px); }

.finished { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--warning); text-align: center; }
.fin-name { margin: 0; color: var(--text-primary); font-size: 18px; font-weight: 600; }
.fin-stats { display: grid; width: 100%; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; color: var(--text-primary); }
.fin-stats .cp-num { margin: 0; font-size: 22px; }

.menu { display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; background: var(--surface-high); }
.menu-row {
  display: flex;
  min-height: 52px;
  align-items: center;
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
.menu-row:first-child { border-top: 0; }
.menu-row.danger { color: var(--danger); }
.menu-row:disabled { opacity: 0.4; }
.text-btn { padding: 8px; border: 0; background: none; color: var(--primary); font-family: var(--font-body); font-size: 16px; cursor: pointer; }
.destructive { background: var(--danger); color: #fff; }
@media (prefers-reduced-motion: reduce) { .progress i, .pop-enter-active, .pop-leave-active { transition: none; } }
</style>
