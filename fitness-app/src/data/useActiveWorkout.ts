import { computed, ref } from 'vue';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { db } from '@/db/AppDatabase';
import type { Exercise } from '@/db/models/Exercise.model';
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from '@/db/models/WorkoutSession.model';
import type { WorkoutTemplate } from '@/db/models/WorkoutTemplate.model';
import { computeTarget, incrementFor, pastSessions } from '@/data/progression';
import { estimate1RM } from '@/data/useMuscleAnalytics';
import { useRoutines } from '@/data/useRoutines';
import { useSettings } from '@/data/useSettings';
import { localDateString } from '@/utils/date';

// The workout in progress. Module-level so the Active workout screen, the
// tab bar and Home all see the same session; every change is written to
// IndexedDB straight away, so closing the app never loses a set.

const session = ref<WorkoutSession | null>(null);
const now = ref(Date.now());
const restEndsAt = ref<number | null>(null);
const restTotal = ref(0);
const prFlash = ref<{ exercise: string; weight: number; reps: number } | null>(null);
// Best estimated 1RM per exercise from earlier workouts, for PR detection.
const historicalBest = new Map<string, number>();
const prShown = new Set<string>();
let ticker: ReturnType<typeof setInterval> | null = null;
let restAlerted = false;

const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    now.value = Date.now();
    if (restEndsAt.value && now.value >= restEndsAt.value && !restAlerted) {
      restAlerted = true;
      restDoneAlert();
      setTimeout(() => { if (restEndsAt.value && Date.now() >= restEndsAt.value) restEndsAt.value = null; }, 1500);
    }
  }, 250);
}

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

// Rest finished: a buzz (native haptics, or vibration on the web) and two beeps.
async function restDoneAlert() {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    navigator.vibrate?.([120, 80, 120]);
  }
  try {
    const ctx = new AudioContext();
    [0, 0.22].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Audio unavailable (e.g. muted autoplay policy); the buzz is enough.
  }
}

async function loadHistoricalBest(exerciseIds: string[]) {
  const sessions = await db.workoutSessions.where('status').equals('completed').toArray();
  for (const id of exerciseIds) {
    let best = 0;
    for (const s of sessions) {
      for (const e of s.exercises) {
        if (e.exerciseDbId !== id) continue;
        for (const set of e.sets) if (set.completed) best = Math.max(best, estimate1RM(set.weight, set.reps));
      }
    }
    historicalBest.set(id, best);
  }
}

export function useActiveWorkout() {
  const { settings } = useSettings();
  const { byId, load: loadRoutines, advanceRotation } = useRoutines();

  async function persist() {
    if (!session.value?.id) return;
    session.value.restEndsAt = restEndsAt.value ?? undefined;
    session.value.restTotal = restEndsAt.value ? restTotal.value : undefined;
    await db.workoutSessions.put(plain(session.value));
  }

  async function resume() {
    if (session.value) return session.value;
    const active = await db.workoutSessions.where('status').equals('active').last();
    if (!active) return null;
    session.value = active;
    // Pick a running rest timer back up.
    if (active.restEndsAt && active.restEndsAt > Date.now()) {
      restEndsAt.value = active.restEndsAt;
      restTotal.value = active.restTotal ?? Math.ceil((active.restEndsAt - Date.now()) / 1000);
      restAlerted = false;
    }
    await loadHistoricalBest(active.exercises.map(e => e.exerciseDbId));
    ensureTicker();
    return active;
  }

  // Today's targets for one planned exercise, from the progression rule
  // and its previous non-deload sessions.
  async function plannedToSession(planned: WorkoutExercise, routine: WorkoutTemplate | null, sessions: WorkoutSession[], catalog: Map<string, Exercise>): Promise<WorkoutExercise> {
    const rule = planned.progression ?? routine?.progression ?? 'none';
    const history = pastSessions(planned.exerciseDbId, sessions);
    const target = computeTarget(rule, planned, history, incrementFor(catalog.get(planned.exerciseDbId)));
    return {
      exerciseDbId: planned.exerciseDbId,
      name: planned.name,
      restSec: planned.restSec,
      supersetWithPrev: planned.supersetWithPrev,
      progression: rule,
      repRange: planned.repRange,
      progressionNote: target.note,
      progressionDirection: target.direction,
      sets: target.sets.map((t, i) => ({ setNumber: i + 1, weight: t.weight, reps: t.reps, completed: false, ...(t.amrap ? { amrap: true } : {}) }))
    };
  }

  async function start(opts: { templateId?: number; bodyWeightKg?: number }) {
    await loadRoutines();
    const routine = opts.templateId != null ? byId(opts.templateId) : null;
    const sessions = await db.workoutSessions.where('status').equals('completed').toArray();
    const catalog = new Map((await db.exercises.toArray()).map(e => [e.exerciseDbId, e]));
    const exercises = routine ? await Promise.all(routine.exercises.map(p => plannedToSession(p, routine, sessions, catalog))) : [];

    const s: WorkoutSession = {
      date: localDateString(),
      name: routine?.name ?? 'Freestyle workout',
      durationSeconds: 0,
      status: 'active',
      exercises,
      startedAt: new Date().toISOString(),
      currentExercise: 0,
      ...(routine?.id != null ? { templateId: routine.id } : {}),
      ...(routine?.isDeload ? { isDeload: true } : {}),
      ...(opts.bodyWeightKg != null ? { bodyWeightKg: opts.bodyWeightKg } : {})
    };
    s.id = await db.workoutSessions.add(plain(s)) as number;
    session.value = s;
    prShown.clear();
    restEndsAt.value = null;
    await loadHistoricalBest(exercises.map(e => e.exerciseDbId));
    ensureTicker();
    return s.id;
  }

  // ---- Editing ----
  function exerciseAt(ei: number) {
    return session.value?.exercises[ei] ?? null;
  }

  async function updateSet(ei: number, si: number, patch: Partial<WorkoutSet>) {
    const set = exerciseAt(ei)?.sets[si];
    if (!set) return;
    Object.assign(set, patch);
    await persist();
  }

  async function toggleSet(ei: number, si: number) {
    const ex = exerciseAt(ei);
    const set = ex?.sets[si];
    if (!ex || !set) return;
    set.completed = !set.completed;
    if (set.completed) {
      checkPR(ex, set);
      // In a superset, rest only after the last exercise of the group.
      const next = session.value!.exercises[ei + 1];
      if (!next?.supersetWithPrev) startRest(ex.restSec ?? settings.restTimerSec);
    }
    await persist();
  }

  function checkPR(ex: WorkoutExercise, set: WorkoutSet) {
    const e1rm = estimate1RM(set.weight, set.reps);
    const prior = historicalBest.get(ex.exerciseDbId) ?? 0;
    // Earlier sets in this session count too, so only a new high flashes.
    const thisSession = Math.max(0, ...ex.sets.filter(s => s !== set && s.completed).map(s => estimate1RM(s.weight, s.reps)));
    if (prior > 0 && e1rm > prior && e1rm > thisSession && !prShown.has(ex.exerciseDbId)) {
      prShown.add(ex.exerciseDbId);
      prFlash.value = { exercise: ex.name, weight: set.weight, reps: set.reps };
    }
  }

  async function addSet(ei: number) {
    const ex = exerciseAt(ei);
    if (!ex) return;
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ setNumber: ex.sets.length + 1, weight: last?.weight ?? 0, reps: last?.reps ?? 8, completed: false });
    await persist();
  }

  async function removeSet(ei: number, si: number) {
    const ex = exerciseAt(ei);
    if (!ex) return;
    ex.sets.splice(si, 1);
    ex.sets.forEach((s, i) => (s.setNumber = i + 1));
    await persist();
  }

  async function addExercise(exercise: Exercise) {
    if (!session.value) return;
    const sessions = await db.workoutSessions.where('status').equals('completed').toArray();
    const history = pastSessions(exercise.exerciseDbId, sessions);
    const lastWeight = history[0] ? Math.max(...history[0].sets.map(s => s.weight)) : 0;
    session.value.exercises.push({
      exerciseDbId: exercise.exerciseDbId,
      name: exercise.name,
      sets: [1, 2, 3].map(n => ({ setNumber: n, weight: lastWeight, reps: 10, completed: false })),
      progressionNote: lastWeight ? `Last time you used ${lastWeight} kg.` : undefined
    });
    await loadHistoricalBest([exercise.exerciseDbId]);
    session.value.currentExercise = session.value.exercises.length - 1;
    await persist();
  }

  async function removeExercise(ei: number) {
    if (!session.value) return;
    session.value.exercises.splice(ei, 1);
    session.value.currentExercise = Math.max(0, Math.min(ei, session.value.exercises.length - 1));
    await persist();
  }

  async function goTo(ei: number) {
    if (!session.value) return;
    session.value.currentExercise = Math.max(0, Math.min(ei, session.value.exercises.length - 1));
    await persist();
  }

  async function setExerciseRest(ei: number, restSec: number | undefined) {
    const ex = exerciseAt(ei);
    if (!ex) return;
    ex.restSec = restSec;
    await persist();
  }

  // ---- Rest timer ----
  function startRest(seconds: number) {
    if (seconds <= 0) return;
    restTotal.value = seconds;
    restEndsAt.value = Date.now() + seconds * 1000;
    restAlerted = false;
    ensureTicker();
    persist();
  }
  function adjustRest(delta: number) {
    if (!restEndsAt.value) return;
    restEndsAt.value = Math.max(Date.now() + 1000, restEndsAt.value + delta * 1000);
    restTotal.value = Math.max(1, restTotal.value + delta);
    restAlerted = false;
    persist();
  }
  function skipRest() {
    restEndsAt.value = null;
    persist();
  }
  const restRemaining = computed(() => (restEndsAt.value ? Math.max(0, Math.ceil((restEndsAt.value - now.value) / 1000)) : 0));

  // ---- Progress ----
  const elapsedSeconds = computed(() =>
    session.value?.startedAt ? Math.max(0, Math.floor((now.value - Date.parse(session.value.startedAt)) / 1000)) : 0
  );
  const totalSets = computed(() => session.value?.exercises.reduce((n, e) => n + e.sets.length, 0) ?? 0);
  const doneSets = computed(() => session.value?.exercises.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0) ?? 0);
  const unfinishedSets = computed(() => totalSets.value - doneSets.value);

  // ---- Finish / discard ----
  // Unticked sets are dropped, and exercises left with none are removed:
  // history shows what was actually done.
  async function finish() {
    const s = session.value;
    if (!s?.id) return null;
    s.exercises = s.exercises
      .map(e => ({ ...e, sets: e.sets.filter(set => set.completed).map((set, i) => ({ ...set, setNumber: i + 1 })), progressionNote: undefined, progressionDirection: undefined }))
      .filter(e => e.sets.length > 0);
    s.durationSeconds = elapsedSeconds.value;
    s.status = 'completed';
    delete s.currentExercise;
    delete s.restEndsAt;
    delete s.restTotal;
    await db.workoutSessions.put(plain(s));
    await advanceRotation(s.templateId);
    const id = s.id;
    clear();
    return id;
  }

  async function discard() {
    const s = session.value;
    if (s?.id) {
      await db.transaction('rw', db.workoutSessions, db.workoutMedia, async () => {
        await db.workoutMedia.where('sessionId').equals(s.id!).delete();
        await db.workoutSessions.delete(s.id!);
      });
    }
    clear();
  }

  function clear() {
    session.value = null;
    restEndsAt.value = null;
    prFlash.value = null;
    historicalBest.clear();
    prShown.clear();
    stopTicker();
  }

  return {
    session, prFlash, restEndsAt, restTotal, restRemaining, elapsedSeconds, totalSets, doneSets, unfinishedSets,
    resume, start, updateSet, toggleSet, addSet, removeSet, addExercise, removeExercise, goTo, setExerciseRest,
    startRest, adjustRest, skipRest, finish, discard
  };
}
