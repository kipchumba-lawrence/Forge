import type { ProgressionRule, WorkoutExercise, WorkoutSession, WorkoutSet } from '@/db/models/WorkoutSession.model';
import type { Exercise } from '@/db/models/Exercise.model';
import { groupsForExercise } from '@/data/static/muscleGroups';

// Works out today's target weight and reps for one exercise from how its
// previous (non-deload) sessions went. Pure functions: no database access.

export const RULES: Record<ProgressionRule, { label: string; description: string }> = {
  none: { label: 'No automatic progression', description: 'Targets stay where you set them.' },
  linear: { label: 'Linear progression', description: 'Hit every rep in every set and the weight goes up. Repeated misses trigger a deload.' },
  greyskull: { label: 'Greyskull LP', description: 'Two straight sets plus a final set to failure. Beat the target and the weight goes up. One failure resets 10%.' },
  double: { label: 'Double progression', description: 'Work up through a rep range at the same weight. Top of the range in every set and the weight goes up.' }
};

export interface Target {
  sets: Pick<WorkoutSet, 'weight' | 'reps' | 'amrap'>[];
  note: string;
  direction: 'up' | 'same' | 'down' | 'start';
}

const MISSES_BEFORE_DELOAD = 3;
const DELOAD = 0.9;

// Smallest sensible jump: 5 kg for barbell lower-body lifts, 2 kg per
// dumbbell, 2.5 kg for everything else.
export function incrementFor(ex?: Pick<Exercise, 'equipment' | 'target' | 'targetMuscles' | 'secondaryMuscles'>) {
  if (!ex) return 2.5;
  const lower = [...groupsForExercise(ex).primary].some(g => g === 'quads' || g === 'hamstrings' || g === 'glutes');
  if (ex.equipment === 'barbell' && lower) return 5;
  if (ex.equipment === 'dumbbell') return 2;
  return 2.5;
}

// Rounds to the nearest loadable step (default 2.5 kg = smallest plate pair).
export const roundStep = (kg: number, step = 2.5) => Math.max(0, Math.round(kg / step) * step);

const fmt = (kg: number) => String(Math.round(kg * 100) / 100);
const done = (sets: WorkoutSet[]) => sets.filter(s => s.completed);

// One past session of this exercise, most recent first.
export interface Past { sets: WorkoutSet[] }

export function pastSessions(exerciseDbId: string, sessions: WorkoutSession[]): Past[] {
  return sessions
    .filter(s => s.status === 'completed' && !s.isDeload)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))
    .map(s => ({ sets: done(s.exercises.filter(e => e.exerciseDbId === exerciseDbId).flatMap(e => e.sets)) }))
    .filter(p => p.sets.length > 0);
}

const topWeight = (sets: WorkoutSet[]) => Math.max(...sets.map(s => s.weight));

export function computeTarget(
  rule: ProgressionRule,
  planned: WorkoutExercise,
  history: Past[],
  increment: number
): Target {
  // Round to what can actually be loaded: 2.5 kg steps on a bar (the
  // smallest plates are 1.25 kg a side), whole kilos for increments that
  // don't fit that grid (dumbbells).
  const roundTo = (kg: number) => roundStep(kg, Math.abs(increment / 2.5 - Math.round(increment / 2.5)) < 1e-9 ? 2.5 : 1);
  const plannedSets = planned.sets.length ? planned.sets : [{ setNumber: 1, weight: 0, reps: 8, completed: false }];
  const count = plannedSets.length;
  const plannedReps = plannedSets[0].reps || 8;
  const last = history[0];

  // First time, or no rule: the routine's own numbers (or last weight used).
  if (!last) {
    return {
      sets: plannedSets.map(s => ({ weight: s.weight, reps: s.reps || plannedReps })),
      note: plannedSets[0].weight
        ? 'First session with this plan.'
        : `First time: pick a weight you can do for ${plannedReps} with 2–3 reps to spare.`,
      direction: 'start'
    };
  }
  const lastWeight = topWeight(last.sets);

  if (rule === 'none') {
    const weight = plannedSets[0].weight || lastWeight;
    return { sets: plannedSets.map(s => ({ weight: s.weight || weight, reps: s.reps || plannedReps })), note: 'Targets as set in the routine.', direction: 'same' };
  }

  if (rule === 'linear') {
    const hitAll = last.sets.length >= count && last.sets.every(s => s.reps >= plannedReps);
    if (hitAll) {
      const w = roundTo(lastWeight + increment);
      return { sets: Array.from({ length: count }, () => ({ weight: w, reps: plannedReps })), note: `Every rep last time. ${fmt(increment)} kg more.`, direction: 'up' };
    }
    // Count consecutive missed sessions at this weight.
    let misses = 0;
    for (const p of history) {
      if (topWeight(p.sets) !== lastWeight) break;
      if (p.sets.length >= count && p.sets.every(s => s.reps >= plannedReps)) break;
      misses++;
    }
    if (misses >= MISSES_BEFORE_DELOAD) {
      const w = roundTo(lastWeight * DELOAD);
      return { sets: Array.from({ length: count }, () => ({ weight: w, reps: plannedReps })), note: `Missed reps ${misses} times. Deload 10% and build back up.`, direction: 'down' };
    }
    return {
      sets: Array.from({ length: count }, () => ({ weight: lastWeight, reps: plannedReps })),
      note: `Missed reps last time. Same weight${misses > 1 ? ` (${misses} of ${MISSES_BEFORE_DELOAD} before a deload)` : ''}.`,
      direction: 'same'
    };
  }

  if (rule === 'greyskull') {
    // Straight sets, the final set as many reps as possible.
    const sets = (w: number) => Array.from({ length: count }, (_, i) => ({ weight: w, reps: plannedReps, amrap: i === count - 1 }));
    const straight = last.sets.slice(0, -1);
    const final = last.sets[last.sets.length - 1];
    const hitAll = last.sets.length >= count && straight.every(s => s.reps >= plannedReps) && final.reps >= plannedReps;
    if (!hitAll) {
      return { sets: sets(roundTo(lastWeight * DELOAD)), note: 'Missed the target last time. Reset 10%.', direction: 'down' };
    }
    const double = final.reps >= plannedReps * 2;
    const inc = double ? increment * 2 : increment;
    return {
      sets: sets(roundTo(lastWeight + inc)),
      note: double ? `${final.reps} reps on the last set. Double jump: ${fmt(inc)} kg more.` : `Target beaten. ${fmt(inc)} kg more.`,
      direction: 'up'
    };
  }

  // Double progression: same weight, climb reps to the top of the range.
  const [min, max] = planned.repRange ?? [plannedReps, plannedReps + 4];
  const allAtTop = last.sets.length >= count && last.sets.every(s => s.reps >= max);
  if (allAtTop) {
    const w = roundTo(lastWeight + increment);
    return { sets: Array.from({ length: count }, () => ({ weight: w, reps: min })), note: `Top of the ${min}–${max} range in every set. ${fmt(increment)} kg more, back to ${min} reps.`, direction: 'up' };
  }
  const targets = Array.from({ length: count }, (_, i) => {
    const prev = last.sets[i]?.reps ?? min;
    return { weight: lastWeight, reps: Math.min(max, Math.max(min, prev + 1)) };
  });
  return { sets: targets, note: `Same weight. Add a rep per set, working toward ${max}.`, direction: 'same' };
}

// ---- Plates ----
export const BAR_KG = 20;
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

// "25 + 10 + 1.25 per side" for a barbell load; null if it can't be made.
export function plateBreakdown(totalKg: number, bar = BAR_KG): string | null {
  if (totalKg <= bar) return totalKg === bar ? 'Empty bar' : null;
  let side = Math.round(((totalKg - bar) / 2) * 100) / 100;
  const used: number[] = [];
  for (const p of PLATES) {
    while (side >= p - 1e-9) {
      used.push(p);
      side = Math.round((side - p) * 100) / 100;
    }
  }
  if (side > 0.01) return null;
  return `${used.join(' + ')} per side`;
}
