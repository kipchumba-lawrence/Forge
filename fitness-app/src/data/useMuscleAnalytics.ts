import { db } from '@/db/AppDatabase';
import type { Exercise } from '@/db/models/Exercise.model';
import type { WorkoutExercise, WorkoutSession } from '@/db/models/WorkoutSession.model';
import type { WorkoutTemplate } from '@/db/models/WorkoutTemplate.model';
import { MUSCLE_GROUPS, SECONDARY_SET_WEIGHT, groupsForExercise, type MuscleGroup } from '@/data/static/muscleGroups';
import { BALANCE_TOLERANCE, RATIO_TABLES, type RatioLift, type RatioTableId } from '@/data/static/structuralBalance';
import { useSettings } from '@/data/useSettings';
import { addDays, localDateString, weekStart } from '@/utils/date';

export type Period = 'week' | '30d' | '90d' | 'all';
export type GroupVolume = Partial<Record<MuscleGroup, number>>;

const round1 = (n: number) => Math.round(n * 10) / 10;
const labelOf = (g: MuscleGroup) => MUSCLE_GROUPS.find(m => m.id === g)!.label;

const sessionToday = () => localDateString();

const CORE_GROUPS = new Set<MuscleGroup>(['chest', 'shoulders', 'upperBack', 'lowerBack', 'biceps', 'triceps', 'abs', 'glutes', 'quads', 'hamstrings', 'calves']);

// Epley, with a single rep taken at face value instead of inflated by 3%.
export function estimate1RM(weight: number, reps: number) {
  if (reps <= 0 || weight <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

async function exerciseIndex() {
  const all = await db.exercises.toArray();
  return new Map(all.map(e => [e.exerciseDbId, e]));
}

function addVolume(into: GroupVolume, ex: Pick<Exercise, 'target' | 'targetMuscles' | 'secondaryMuscles'>, sets: number) {
  const { primary, secondary } = groupsForExercise(ex);
  primary.forEach(g => (into[g] = (into[g] ?? 0) + sets));
  secondary.forEach(g => (into[g] = (into[g] ?? 0) + sets * SECONDARY_SET_WEIGHT));
}

function volumeOf(exercises: WorkoutExercise[], index: Map<string, Exercise>, completedOnly: boolean) {
  const out: GroupVolume = {};
  for (const we of exercises) {
    const ex = index.get(we.exerciseDbId);
    if (!ex) continue;   // not in the local catalog; its muscles are unknown
    const sets = completedOnly ? we.sets.filter(s => s.completed).length : we.sets.length;
    if (sets) addVolume(out, ex, sets);
  }
  return out;
}

function sorted(volume: GroupVolume) {
  return (Object.entries(volume) as [MuscleGroup, number][])
    .map(([group, sets]) => ({ group, label: labelOf(group), sets: round1(sets) }))
    .sort((a, b) => b.sets - a.sets);
}

function periodStart(period: Period, firstDate?: string) {
  const today = sessionToday();
  if (period === 'week') return addDays(today, -6);
  if (period === '30d') return addDays(today, -29);
  if (period === '90d') return addDays(today, -89);
  return firstDate ?? today;
}

export function useMuscleAnalytics() {
  const { settings } = useSettings();

  // Routine editor, "What this session hits": groups ordered by how much the
  // routine works them.
  async function routineGroups(exercises: WorkoutExercise[]) {
    return sorted(volumeOf(exercises, await exerciseIndex(), false));
  }

  // Stats, "Weekly muscle volume · Planned sets per week, from your plan".
  // Until a weekly schedule exists, every saved routine is assumed to run once
  // a week. Pass the scheduled routines once Plan · Schedule is built.
  async function plannedWeeklyVolume(templates?: WorkoutTemplate[]) {
    const list = templates ?? await db.workoutTemplates.toArray();
    const index = await exerciseIndex();
    const total: GroupVolume = {};
    for (const t of list) {
      for (const [g, v] of Object.entries(volumeOf(t.exercises, index, false)) as [MuscleGroup, number][]) {
        total[g] = (total[g] ?? 0) + v;
      }
    }
    return { volume: total, rows: sorted(total) };
  }

  async function completedSessions(from: string, to = sessionToday()) {
    return db.workoutSessions
      .where('date').between(from, to, true, true)
      .and(s => s.status === 'completed')
      .toArray();
  }

  // Stats, "Muscle balance": completed sets vs planned sets for the period,
  // e.g. "Chest 12.4/12.4 · 100%". 'week' is a calendar week (Mon–Sun),
  // `weekOffset` steps back through earlier weeks; the others are rolling.
  async function muscleBalance(period: Period, weekOffset = 0) {
    const index = await exerciseIndex();
    let from: string, to: string;
    if (period === 'week') {
      from = addDays(weekStart(sessionToday()), weekOffset * 7);
      to = addDays(from, 6);
    } else {
      const first = period === 'all' ? (await db.workoutSessions.orderBy('date').first())?.date : undefined;
      from = periodStart(period, first);
      to = sessionToday();
    }
    const sessions = await completedSessions(from, to);

    const done: GroupVolume = {};
    for (const s of sessions) {
      for (const [g, v] of Object.entries(volumeOf(s.exercises, index, true)) as [MuscleGroup, number][]) {
        done[g] = (done[g] ?? 0) + v;
      }
    }

    const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1);
    const weeks = Math.max(1, days / 7);
    const { volume: planned } = await plannedWeeklyVolume();
    const hasPlan = Object.values(planned).some(v => (v ?? 0) > 0);

    const rows = MUSCLE_GROUPS.map(({ id, label }) => {
      const target = round1((planned[id] ?? 0) * weeks);
      const value = round1(done[id] ?? 0);
      return { group: id, label, done: value, target, pct: target ? Math.round((value / target) * 100) : null };
    });

    // Without a plan there are no targets, so "not trained" falls back to the
    // main groups people usually train.
    const untrained = rows.filter(r => r.done === 0 && (hasPlan ? r.target > 0 : CORE_GROUPS.has(r.group)));

    return {
      from, to, hasPlan, done,
      trained: rows.filter(r => r.done > 0).sort((a, b) => b.done - a.done),
      untrained
    };
  }

  // Explore muscles: exercise counts per group, and the list for one group.
  // Counts reflect the locally cached catalog, so they grow as more of
  // ExerciseDB is synced.
  async function exploreCounts() {
    const counts: GroupVolume = {};
    for (const ex of await db.exercises.toArray()) {
      groupsForExercise(ex).primary.forEach(g => (counts[g] = (counts[g] ?? 0) + 1));
    }
    return MUSCLE_GROUPS.map(({ id, label }) => ({ group: id, label, count: counts[id] ?? 0 }));
  }

  async function exercisesForGroup(group: MuscleGroup) {
    const out: { exercise: Exercise; role: 'primary' | 'secondary' }[] = [];
    for (const ex of await db.exercises.toArray()) {
      const { primary, secondary } = groupsForExercise(ex);
      if (primary.has(group)) out.push({ exercise: ex, role: 'primary' });
      else if (secondary.has(group)) out.push({ exercise: ex, role: 'secondary' });
    }
    // "Primary target" rows first, then "Also trains".
    return out.sort((a, b) => (a.role === b.role ? a.exercise.name.localeCompare(b.exercise.name) : a.role === 'primary' ? -1 : 1));
  }

  // Structural balance: best estimated 1RM per lift, compared with its chain's anchor.
  async function structuralBalance(tableId: RatioTableId = settings.structuralBalanceTable) {
    const table = RATIO_TABLES[tableId];
    const sessions = await db.workoutSessions.where('status').equals('completed').toArray();
    const weighIns = await db.bodyWeights.orderBy('date').toArray();
    const catalog = await db.exercises.toArray();

    const bodyWeightOn = (s: WorkoutSession) =>
      s.bodyWeightKg ?? [...weighIns].reverse().find(w => w.date <= s.date)?.weightKg ?? null;

    function resolveExercise(lift: RatioLift) {
      const overrideId = settings.structuralBalanceExercises[lift.id];
      const byId = overrideId ? catalog.find(e => e.exerciseDbId === overrideId) : undefined;
      const byName = catalog.find(e => e.name.toLowerCase() === lift.defaultExerciseName.toLowerCase());
      return { exerciseDbId: overrideId ?? byName?.exerciseDbId, name: byId?.name ?? byName?.name ?? lift.defaultExerciseName };
    }

    function best1RM(lift: RatioLift, exerciseDbId: string | undefined, name: string) {
      let best = 0;
      for (const s of sessions) {
        for (const we of s.exercises) {
          const match = exerciseDbId ? we.exerciseDbId === exerciseDbId : we.name.toLowerCase() === name.toLowerCase();
          if (!match) continue;
          let extra = 0;
          if (lift.addsBodyWeight) {
            const bw = bodyWeightOn(s);
            if (bw == null) continue;   // can't score a dip without knowing body weight
            extra = bw;
          }
          for (const set of we.sets) {
            if (set.completed) best = Math.max(best, estimate1RM(set.weight + extra, set.reps));
          }
        }
      }
      return best || null;
    }

    const measured = table.lifts.map(lift => {
      const ex = resolveExercise(lift);
      return { lift, ...ex, e1rm: best1RM(lift, ex.exerciseDbId, ex.name) };
    });

    const rows = measured.map(m => {
      const anchor = measured.find(a => a.lift.chain === m.lift.chain && a.lift.anchor);
      let status: 'noData' | 'notScored' | 'balanced' | 'weak' | 'strong' = 'noData';
      let actualRatio: number | null = null;
      if (m.e1rm) {
        if (!anchor?.e1rm) status = 'notScored';
        else {
          actualRatio = m.e1rm / anchor.e1rm;
          const score = actualRatio / m.lift.ratio;
          status = score < 1 - BALANCE_TOLERANCE ? 'weak' : score > 1 + BALANCE_TOLERANCE ? 'strong' : 'balanced';
        }
      }
      return {
        id: m.lift.id,
        label: m.lift.label,
        chain: m.lift.chain,
        anchor: !!m.lift.anchor,
        exerciseDbId: m.exerciseDbId,
        exerciseName: m.name,
        e1rm: m.e1rm ? round1(m.e1rm) : null,
        expectedPct: Math.round(m.lift.ratio * 100),
        actualPct: actualRatio != null ? Math.round(actualRatio * 100) : null,
        status
      };
    });

    return { table: { id: table.id, label: table.label, verified: table.verified, empty: !table.lifts.length }, rows };
  }

  return { routineGroups, plannedWeeklyVolume, muscleBalance, exploreCounts, exercisesForGroup, structuralBalance };
}
