import type { WorkoutSession, WorkoutSet } from '@/db/models/WorkoutSession.model';
import { estimate1RM } from '@/data/useMuscleAnalytics';

export const doneSets = (sets: WorkoutSet[]) => sets.filter(s => s.completed);

export function sessionVolume(s: WorkoutSession) {
  return s.exercises.reduce((sum, ex) => sum + doneSets(ex.sets).reduce((v, set) => v + set.weight * set.reps, 0), 0);
}

export function sessionSetCount(s: WorkoutSession) {
  return s.exercises.reduce((n, ex) => n + doneSets(ex.sets).length, 0);
}

// 3660 → "1h 1m", 3120 → "52 min"
export function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const trim = (n: number) => String(Math.round(n * 100) / 100);

// "75×8 (RIR 2.5) · 75×8 · 75×6"
export function formatSets(sets: WorkoutSet[]) {
  return doneSets(sets)
    .map(s => {
      const effort = s.rir != null ? ` (RIR ${trim(s.rir)})` : s.rpe != null ? ` (RPE ${trim(s.rpe)})` : '';
      return `${trim(s.weight)}×${s.reps}${effort}`;
    })
    .join(' · ');
}

// Oldest first; sessions on the same day keep insertion order.
export const chronological = (sessions: WorkoutSession[]) =>
  [...sessions].sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0));

// Exercises in each session that set a personal record: a completed set whose
// estimated 1RM beats every earlier session of that exercise. An exercise's
// first ever session isn't counted, so PRs mean real improvement.
export function personalRecords(sessions: WorkoutSession[]): Map<number, Set<string>> {
  const best = new Map<string, number>();
  const prs = new Map<number, Set<string>>();
  for (const s of chronological(sessions)) {
    const hits = new Set<string>();
    const sessionBest = new Map<string, number>();
    for (const ex of s.exercises) {
      const top = Math.max(0, ...doneSets(ex.sets).map(set => estimate1RM(set.weight, set.reps)));
      if (!top) continue;
      const prior = best.get(ex.exerciseDbId);
      if (prior !== undefined && top > prior + 1e-9) hits.add(ex.exerciseDbId);
      sessionBest.set(ex.exerciseDbId, Math.max(sessionBest.get(ex.exerciseDbId) ?? 0, top));
    }
    // Update after the whole session so one session can't PR against itself.
    for (const [id, v] of sessionBest) best.set(id, Math.max(best.get(id) ?? 0, v));
    if (s.id != null) prs.set(s.id, hits);
  }
  return prs;
}
