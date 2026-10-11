<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main v-if="routine" class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back to plan" @click="leave">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <label class="name-field">
            <span class="visually-hidden">Routine name</span>
            <input v-model="routine.name" type="text" placeholder="Routine name" @blur="persist" @keydown.enter="($event.target as HTMLInputElement).blur()" />
          </label>
          <span class="cp-tile" :class="{ amber: routine.isDeload }"><LottieIcon name="exercises" :size="20" :draw="false" /></span>
        </header>

        <div class="cp-list">
          <button type="button" class="cp-li" @click="ruleOpen = true">
            <SettingsTile icon="trend" color="var(--primary)" />
            <span class="cp-li-label" style="font-size: 17px">Progression</span>
            <span class="cp-li-value">{{ RULES[routine.progression ?? 'none'].label }}</span>
            <span class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
          </button>
          <div class="cp-li top">
            <SettingsTile icon="reset" color="#E8A33D" />
            <span class="cp-li-label">
              <span style="font-size: 17px">Deload routine</span>
              <span class="cp-li-hint">Its workouts do not count toward progression. They still show in history and statistics.</span>
            </span>
            <ToggleSwitch label="Deload routine" :model-value="!!routine.isDeload" @update:model-value="v => { routine!.isDeload = v; persist(); }" />
          </div>
        </div>
        <p class="cp-lbl note">{{ RULES[routine.progression ?? 'none'].description }} Applies to every exercise in this routine that does not set its own rule.</p>

        <div class="cp-row spread">
          <span class="cp-sec" style="margin: 0 4px">Exercises</span>
          <button type="button" class="soft-btn" @click="pickerOpen = true"><LottieIcon name="plus" :size="16" :draw="false" />Add exercise</button>
        </div>

        <div v-if="routine.exercises.length" class="list">
          <div v-for="(ex, i) in routine.exercises" :key="`${ex.exerciseDbId}-${i}`" class="ex-wrap" :class="{ linked: ex.supersetWithPrev }">
            <span v-if="ex.supersetWithPrev" class="link-badge">Superset</span>
            <div class="cp-card cp-row ex">
              <button type="button" class="ex-main" @click="editIndex = i">
                <ExerciseThumb :exercise="catalogFor(ex.exerciseDbId)" :size="56" />
                <span class="text">
                  <span class="name">{{ ex.name }}</span>
                  <span class="cp-lbl">{{ summary(ex) }}</span>
                </span>
              </button>
              <span class="side">
                <button
                  v-if="i > 0"
                  type="button"
                  class="mini"
                  :class="{ on: ex.supersetWithPrev }"
                  :aria-label="ex.supersetWithPrev ? `Unlink ${ex.name} from the exercise above` : `Superset ${ex.name} with the exercise above`"
                  :aria-pressed="!!ex.supersetWithPrev"
                  @click="ex.supersetWithPrev = !ex.supersetWithPrev; persist()"
                ><LottieIcon name="link" :size="16" :draw="false" /></button>
                <span class="cp-row arrows">
                  <button type="button" class="mini" :aria-label="`Move ${ex.name} up`" :disabled="i === 0" @click="moveEx(i, -1)"><LottieIcon name="chevronLeft" :size="14" :draw="false" class="up" /></button>
                  <button type="button" class="mini" :aria-label="`Move ${ex.name} down`" :disabled="i === routine.exercises.length - 1" @click="moveEx(i, 1)"><LottieIcon name="chevronRight" :size="14" :draw="false" class="up" /></button>
                </span>
              </span>
            </div>
          </div>
        </div>
        <section v-else class="cp-card empty">
          <LottiePlayer name="searchSweep" :size="56" />
          <p class="cp-lbl">No exercises yet. Add some, or tap Plan on any exercise in the Exercises tab.</p>
        </section>

        <section v-if="routine.exercises.length" class="cp-card stack">
          <p class="cp-lbl">What this session hits</p>
          <MuscleMap :intensity="hits.volume" :label="`This routine works ${hits.labels.join(', ') || 'no mapped muscles'}`" />
          <div class="pills"><span v-for="l in hits.labels" :key="l" class="pill">{{ l }}</span></div>
        </section>
        <p v-if="routine.exercises.length > 1" class="cp-lbl note">Tap the link button on an exercise to superset it with the one above.</p>

        <div class="cp-list">
          <button type="button" class="cp-li" :disabled="!routine.exercises.length" @click="startNow">
            <LottieIcon name="play" :size="18" :draw="false" /><span class="cp-li-label">Start this routine</span>
          </button>
          <button type="button" class="cp-li" @click="copy">
            <LottieIcon name="copy" :size="18" :draw="false" /><span class="cp-li-label">Copy routine</span>
          </button>
          <button type="button" class="cp-li danger" @click="deleteOpen = true">
            <LottieIcon name="trash" :size="18" :draw="false" /><span class="cp-li-label">Delete routine</span>
          </button>
        </div>
      </main>
      <main v-else-if="missing" class="cp-main">
        <p class="cp-lbl">This routine doesn't exist anymore.</p>
        <button type="button" class="cp-link" @click="router.push('/plan')">Back to plan</button>
      </main>
    </ion-content>

    <OptionSheet
      :open="ruleOpen"
      title="Progression"
      :model-value="routine?.progression ?? 'none'"
      :options="ruleOptions"
      @update:model-value="v => { routine!.progression = v; persist(); }"
      @close="ruleOpen = false"
    />

    <ExercisePickerSheet :open="pickerOpen" @close="pickerOpen = false" @pick="addExercise" />

    <!-- Per-exercise settings -->
    <BottomSheet :open="editing !== null" :title="editing?.name ?? ''" @close="editIndex = null">
      <template v-if="editing">
        <div class="field-row">
          <span class="cp-lbl">Sets</span>
          <Stepper :model-value="editing.sets.length" :step="1" :min="1" :max="12" label="Sets" @update:model-value="setCount" />
        </div>
        <div class="field-row">
          <span class="cp-lbl">{{ (editing.progression ?? routine?.progression) === 'double' ? 'Reps (bottom of range)' : 'Reps' }}</span>
          <Stepper :model-value="editing.sets[0]?.reps ?? 8" :step="1" :min="1" :max="50" label="Reps" @update:model-value="v => setAll({ reps: v })" />
        </div>
        <div v-if="(editing.progression ?? routine?.progression) === 'double'" class="field-row">
          <span class="cp-lbl">Top of rep range</span>
          <Stepper :model-value="editing.repRange?.[1] ?? (editing.sets[0]?.reps ?? 8) + 4" :step="1" :min="(editing.sets[0]?.reps ?? 8) + 1" :max="60" label="Top of rep range" @update:model-value="v => { editing!.repRange = [editing!.sets[0]?.reps ?? 8, v]; persist(); }" />
        </div>
        <div class="field-row">
          <span class="cp-lbl">Starting weight (kg)</span>
          <Stepper :model-value="editing.sets[0]?.weight ?? 0" :step="2.5" :max="500" label="Starting weight" @update:model-value="v => setAll({ weight: v })" />
        </div>
        <p class="cp-lbl small">After the first workout, the progression rule sets the weight from what you actually lifted.</p>

        <button type="button" class="cp-li sheet-row" @click="restOpen = true">
          <span class="cp-li-label">Rest between sets</span>
          <span class="cp-li-value">{{ editing.restSec ? formatRest(editing.restSec) : `Default (${formatRest(settings.restTimerSec)})` }}</span>
        </button>
        <button type="button" class="cp-li sheet-row" @click="exRuleOpen = true">
          <span class="cp-li-label">Progression</span>
          <span class="cp-li-value">{{ editing.progression ? RULES[editing.progression].label : 'Routine default' }}</span>
        </button>
        <button type="button" class="cp-link" @click="router.push(`/exercise/${editing.exerciseDbId}`)">View exercise</button>
        <button type="button" class="text-btn danger" @click="removeExercise">Remove from routine</button>
      </template>
    </BottomSheet>

    <OptionSheet
      :open="restOpen"
      title="Rest between sets"
      :model-value="editing?.restSec"
      :options="restOptions"
      @update:model-value="v => { if (editing) { editing.restSec = v; persist(); } }"
      @close="restOpen = false"
    />
    <OptionSheet
      :open="exRuleOpen"
      title="Progression for this exercise"
      :model-value="editing?.progression"
      :options="[{ value: undefined, label: 'Routine default', description: RULES[routine?.progression ?? 'none'].label }, ...ruleOptions]"
      @update:model-value="v => { if (editing) { editing.progression = v; persist(); } }"
      @close="exRuleOpen = false"
    />

    <BottomSheet :open="deleteOpen" :title="`Delete ${routine?.name ?? ''}?`" @close="deleteOpen = false">
      <p class="cp-lbl">The routine is removed from your plan. Workouts you've logged with it stay in your history.</p>
      <button type="button" class="cp-primary destructive" @click="doDelete">Delete routine</button>
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
import MuscleMap from '@/components/MuscleMap.vue';
import SettingsTile from '@/components/settings/SettingsTile.vue';
import ToggleSwitch from '@/components/settings/ToggleSwitch.vue';
import ExerciseThumb from '@/components/exercises/ExerciseThumb.vue';
import ExercisePickerSheet from '@/components/workout/ExercisePickerSheet.vue';
import OptionSheet from '@/components/workout/OptionSheet.vue';
import Stepper from '@/components/workout/Stepper.vue';
import { useRoutines } from '@/data/useRoutines';
import { useSettings } from '@/data/useSettings';
import { useExerciseCatalog } from '@/data/useExerciseCatalog';
import { useMuscleAnalytics } from '@/data/useMuscleAnalytics';
import { RULES } from '@/data/progression';
import type { Exercise } from '@/db/models/Exercise.model';
import type { ProgressionRule, WorkoutExercise, WorkoutSet } from '@/db/models/WorkoutSession.model';
import type { WorkoutTemplate } from '@/db/models/WorkoutTemplate.model';
import type { MuscleGroup } from '@/data/static/muscleGroups';
import { formatRest } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const { settings } = useSettings();
const { load, byId, save, duplicate, remove } = useRoutines();
const { catalog, lastWeights, load: loadCatalog } = useExerciseCatalog();
const { routineGroups } = useMuscleAnalytics();

const routine = ref<WorkoutTemplate | null>(null);
const missing = ref(false);
const ruleOpen = ref(false);
const pickerOpen = ref(false);
const deleteOpen = ref(false);
const editIndex = ref<number | null>(null);
const restOpen = ref(false);
const exRuleOpen = ref(false);

const ruleOptions = (Object.keys(RULES) as ProgressionRule[]).map(k => ({ value: k, label: RULES[k].label, description: RULES[k].description }));
const restOptions = [undefined, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map(v => ({
  value: v as number | undefined,
  label: v === undefined ? `Default (${formatRest(settings.restTimerSec)})` : formatRest(v)
}));

const editing = computed(() => (editIndex.value !== null ? routine.value?.exercises[editIndex.value] ?? null : null));
const catalogFor = (id: string): Pick<Exercise, 'cachedImageUrl' | 'gifUrl' | 'customMedia'> => catalog.value.find(e => e.exerciseDbId === id) ?? { cachedImageUrl: '', gifUrl: '' };

function summary(ex: WorkoutExercise) {
  const reps = ex.sets[0]?.reps ?? 0;
  const range = (ex.progression ?? routine.value?.progression) === 'double' ? `${reps}–${ex.repRange?.[1] ?? reps + 4}` : String(reps);
  const parts = [`${ex.sets.length} × ${range}`];
  if (ex.sets[0]?.weight) parts.push(`${ex.sets[0].weight} kg`);
  if (ex.restSec) parts.push(`${formatRest(ex.restSec)} rest`);
  if (ex.progression) parts.push(RULES[ex.progression].label);
  return parts.join(' · ');
}

// ---- Muscles hit ----
const hits = ref<{ volume: Partial<Record<MuscleGroup, number>>; labels: string[] }>({ volume: {}, labels: [] });
async function refreshHits() {
  const rows = routine.value ? await routineGroups(routine.value.exercises) : [];
  hits.value = { volume: Object.fromEntries(rows.map(r => [r.group, r.sets])), labels: rows.map(r => r.label) };
}

async function persist() {
  if (!routine.value) return;
  if (!routine.value.name.trim()) routine.value.name = 'Untitled routine';
  await save(routine.value);
  refreshHits();
}

// ---- Exercises ----
function addExercise(ex: Exercise) {
  if (!routine.value) return;
  const weight = lastWeights.value.get(ex.exerciseDbId) ?? 0;
  routine.value.exercises.push({
    exerciseDbId: ex.exerciseDbId,
    name: ex.name,
    sets: [1, 2, 3].map(n => ({ setNumber: n, weight, reps: 10, completed: false }))
  });
  persist();
}

function moveEx(i: number, d: -1 | 1) {
  const list = routine.value!.exercises;
  [list[i], list[i + d]] = [list[i + d], list[i]];
  // The first exercise can't be in a superset with "the one above".
  if (list[0]) list[0].supersetWithPrev = false;
  persist();
}

function setCount(n: number) {
  const ex = editing.value;
  if (!ex) return;
  while (ex.sets.length < n) {
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ setNumber: ex.sets.length + 1, weight: last?.weight ?? 0, reps: last?.reps ?? 8, completed: false });
  }
  ex.sets.length = n;
  persist();
}

function setAll(patch: Partial<WorkoutSet>) {
  const ex = editing.value;
  if (!ex) return;
  ex.sets.forEach(s => Object.assign(s, patch));
  if (patch.reps !== undefined && ex.repRange && ex.repRange[1] <= patch.reps) ex.repRange = [patch.reps, patch.reps + 4];
  persist();
}

function removeExercise() {
  if (editIndex.value === null || !routine.value) return;
  routine.value.exercises.splice(editIndex.value, 1);
  if (routine.value.exercises[0]) routine.value.exercises[0].supersetWithPrev = false;
  editIndex.value = null;
  persist();
}

// ---- Actions ----
async function copy() {
  if (!routine.value?.id) return;
  const c = await duplicate(routine.value.id);
  if (c?.id) router.replace(`/plan/routine/${c.id}`);
}
async function doDelete() {
  if (routine.value?.id) await remove(routine.value.id);
  deleteOpen.value = false;
  router.replace('/plan');
}
async function startNow() {
  await persist();
  router.push({ path: '/start', query: { routine: String(routine.value!.id) } });
}
async function leave() {
  await persist();
  router.push('/plan');
}

onIonViewWillEnter(async () => {
  await Promise.all([load(), catalog.value.length ? null : loadCatalog()]);
  const r = byId(Number(route.params.id));
  missing.value = !r;
  routine.value = r ? JSON.parse(JSON.stringify(r)) : null;
  editIndex.value = null;
  refreshHits();
});
</script>

<style scoped>
.head { gap: 10px; }
.name-field { min-width: 0; flex: 1; }
.name-field input {
  width: 100%;
  height: 50px;
  padding: 0 16px;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 600;
}
.name-field input:focus { outline: 2px solid var(--primary); }
.cp-li.top { align-items: flex-start; }
.note { margin: 0 4px; line-height: 1.45; }
.spread { justify-content: space-between; }
.soft-btn {
  display: flex;
  align-items: center;
  gap: 6px;
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

.list { display: flex; flex-direction: column; gap: 8px; }
.ex-wrap { position: relative; }
.ex-wrap.linked { margin-top: -2px; padding-left: 12px; border-left: 3px solid var(--primary); }
.link-badge { display: inline-block; margin: 0 0 4px 2px; color: var(--primary); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.ex { padding: 12px; border-radius: 16px; }
.ex-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.text { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.name { font-size: 16px; font-weight: 500; line-height: 1.3; }
.side { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.arrows { gap: 4px; }
.mini {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}
.mini:disabled { opacity: 0.3; cursor: default; }
.mini.on { background: var(--primary-soft); color: var(--primary); }
.up { transform: rotate(90deg); }

.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.stack { display: flex; flex-direction: column; gap: 10px; }
.pills { display: flex; flex-wrap: wrap; gap: 6px; }
.pill { padding: 6px 12px; border-radius: 999px; background: var(--surface-high); font-size: 13px; }

.cp-li.danger { color: var(--danger); }
.cp-li:disabled { opacity: 0.5; }

.field-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.field-row > .cp-lbl { flex: 1; font-size: 14px; }
.field-row > :last-child { max-width: 170px; }
.small { font-size: 12px; line-height: 1.45; }
.sheet-row { border-radius: 12px; background: var(--surface-high); border-top: 0; cursor: pointer; }
.text-btn { padding: 8px; border: 0; background: none; color: var(--primary); font-family: var(--font-body); font-size: 16px; cursor: pointer; }
.text-btn.danger { color: var(--danger); }
.destructive { background: var(--danger); color: #fff; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
