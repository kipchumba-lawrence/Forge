import { computed, ref } from 'vue';
import { db } from '@/db/AppDatabase';
import type { Exercise } from '@/db/models/Exercise.model';
import type { WorkoutTemplate } from '@/db/models/WorkoutTemplate.model';
import { ExerciseApiManager } from '@/api/ExerciseApiManager';
import { fromApiSummary, mergeLocal } from '@/api/exerciseMapping';
import { MUSCLE_TO_GROUP, groupsForExercise, type MuscleGroup } from '@/data/static/muscleGroups';
import { useSettings } from '@/data/useSettings';
import { doneSets } from '@/data/workoutSummary';

// Gym shorthand people type into search.
const SYNONYMS: Record<string, string> = {
  db: 'dumbbell', bb: 'barbell', kb: 'kettlebell', bw: 'body weight', sm: 'smith',
  ohp: 'overhead press', rdl: 'romanian deadlift', sldl: 'stiff leg deadlift',
  lat: 'latissimus', tri: 'tricep', bi: 'bicep', abs: 'abdominal', ez: 'ez barbell'
};

const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;   // re-download weekly at most
const MAX_PAGES = 80;                                // safety stop (80 × 25 = 2,000)

// Module-level: the list, detail and explore screens share one catalog.
const catalog = ref<Exercise[]>([]);
const lastWeights = ref(new Map<string, number>());
const syncing = ref(false);
const syncProgress = ref<{ done: number; total: number } | null>(null);
const syncError = ref<string | null>(null);

export function useExerciseCatalog() {
  const { settings, setSetting } = useSettings();

  async function load() {
    catalog.value = (await db.exercises.toArray()).sort((a, b) => a.name.localeCompare(b.name));
    await loadLastWeights();
  }

  // Top set from the latest finished workout of each exercise, shown as the
  // little weight badge on the list ("75").
  async function loadLastWeights() {
    const sessions = await db.workoutSessions.where('status').equals('completed').sortBy('date');
    const map = new Map<string, number>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        const sets = doneSets(ex.sets);
        if (sets.length) map.set(ex.exerciseDbId, Math.max(...sets.map(x => x.weight)));
      }
    }
    lastWeights.value = map;
  }

  // Downloads the whole catalog so search and filters work offline. Skips
  // the network if it synced in the last week, unless `force`.
  async function syncCatalog(force = false) {
    if (syncing.value) return;
    const fresh = settings.catalogSyncedAt && Date.now() - Date.parse(settings.catalogSyncedAt) < REFRESH_AFTER_MS;
    if (!force && fresh && catalog.value.some(e => !e.isCustom)) return;

    syncing.value = true;
    syncError.value = null;
    try {
      const items: ReturnType<typeof fromApiSummary>[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const { data, nextCursor, total } = await ExerciseApiManager.getPage(cursor);
        items.push(...data.map(fromApiSummary));
        syncProgress.value = { done: items.length, total: total || items.length };
        if (!nextCursor) break;
        cursor = nextCursor;
      }

      const existing = new Map((await db.exercises.toArray()).map(e => [e.exerciseDbId, e]));
      await db.exercises.bulkPut(items.map(item => mergeLocal(item, existing.get(item.exerciseDbId))));
      await setSetting('catalogSyncedAt', new Date().toISOString());
      await load();
    } catch (e) {
      syncError.value = (e as Error).message;
    } finally {
      syncing.value = false;
      syncProgress.value = null;
    }
  }

  // Filter chips, most common first.
  function facet(key: 'bodyPart' | 'equipment') {
    const counts = new Map<string, number>();
    for (const e of catalog.value) {
      const v = e[key];
      if (v && v !== 'unknown') counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  }
  const bodyParts = computed(() => facet('bodyPart'));
  const equipments = computed(() => facet('equipment'));

  // `muscles`: keep exercises whose primary target is any of these groups.
  function filter(opts: { query?: string; bodyPart?: string | null; equipment?: string | null; favouritesOnly?: boolean; muscles?: MuscleGroup[] }) {
    const words = (opts.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    const muscleSet = new Set(opts.muscles ?? []);
    return catalog.value.filter(e => {
      if (muscleSet.size && ![...groupsForExercise(e).primary].some(g => muscleSet.has(g))) return false;
      if (opts.bodyPart && e.bodyPart !== opts.bodyPart) return false;
      if (opts.equipment && e.equipment !== opts.equipment) return false;
      if (opts.favouritesOnly && !e.isFavorite) return false;
      if (!words.length) return true;
      // Every word must match somewhere; shorthand like "db press" expands.
      const hay = `${e.name} ${e.bodyPart} ${e.equipment} ${e.target}`.toLowerCase();
      return words.every(w => hay.includes(w) || (SYNONYMS[w] !== undefined && hay.includes(SYNONYMS[w])));
    });
  }

  async function toggleFavourite(exerciseDbId: string) {
    const ex = catalog.value.find(e => e.exerciseDbId === exerciseDbId);
    if (!ex?.id) return;
    ex.isFavorite = !ex.isFavorite;
    await db.exercises.update(ex.id, { isFavorite: ex.isFavorite });
  }

  async function setPlateLoading(exerciseDbId: string, mode: NonNullable<Exercise['plateLoading']>) {
    const ex = catalog.value.find(e => e.exerciseDbId === exerciseDbId);
    if (ex?.id) {
      ex.plateLoading = mode;
      await db.exercises.update(ex.id, { plateLoading: mode });
    }
  }

  // ---- Custom exercises ----
  // The analytics read ExerciseDB muscle names, so a custom exercise stores
  // one real muscle name for its chosen group.
  function muscleForGroup(group: MuscleGroup) {
    return Object.entries(MUSCLE_TO_GROUP).find(([, g]) => g === group)?.[0] ?? group;
  }

  async function addCustomExercise(input: { name: string; bodyPart: string; equipment: string; group: MuscleGroup; media?: Blob }) {
    const muscle = muscleForGroup(input.group);
    const ex: Exercise = {
      exerciseDbId: `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: input.name.trim(),
      bodyPart: input.bodyPart.toLowerCase(),
      equipment: input.equipment.toLowerCase(),
      target: muscle,
      targetMuscles: [muscle],
      secondaryMuscles: [],
      gifUrl: '',
      instructions: [],
      isCustom: true,
      customMedia: input.media,
      createdAt: new Date().toISOString()
    };
    ex.id = await db.exercises.add(ex) as number;
    await load();
    return ex;
  }

  async function deleteCustomExercise(exerciseDbId: string) {
    const ex = catalog.value.find(e => e.exerciseDbId === exerciseDbId);
    if (ex?.isCustom && ex.id) {
      await db.exercises.delete(ex.id);
      await load();
    }
  }

  // ---- Add to a routine ----
  // Three sets of ten at the last weight used (or empty), appended to the routine.
  async function addToRoutine(exercise: Exercise, target: { templateId: number } | { newName: string }): Promise<WorkoutTemplate> {
    const weight = lastWeights.value.get(exercise.exerciseDbId) ?? 0;
    const entry = {
      exerciseDbId: exercise.exerciseDbId,
      name: exercise.name,
      sets: [1, 2, 3].map(n => ({ setNumber: n, weight, reps: 10, completed: false }))
    };
    if ('templateId' in target) {
      const t = await db.workoutTemplates.get(target.templateId);
      if (!t) throw new Error('That routine no longer exists.');
      t.exercises.push(entry);
      await db.workoutTemplates.put(t);
      return t;
    }
    const t: WorkoutTemplate = { name: target.newName.trim(), createdAt: new Date().toISOString(), exercises: [entry] };
    t.id = await db.workoutTemplates.add(t) as number;
    return t;
  }

  return {
    catalog, lastWeights, syncing, syncProgress, syncError, bodyParts, equipments,
    load, syncCatalog, filter, toggleFavourite, setPlateLoading,
    addCustomExercise, deleteCustomExercise, addToRoutine
  };
}
