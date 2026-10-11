import { computed, ref } from 'vue';
import { db } from '@/db/AppDatabase';
import type { WorkoutSession } from '@/db/models/WorkoutSession.model';
import { estimate1RM } from '@/data/useMuscleAnalytics';
import { chronological, doneSets, personalRecords, sessionSetCount, sessionVolume } from '@/data/workoutSummary';
import { addDays, localDateString, parseLocalDate, weekStart, weekStreak } from '@/utils/date';

export type HeatMetric = 'time' | 'volume';
export type EffortRange = '30' | '90' | '365' | 'all';
export type ProgressMetric = 'top' | 'e1rm' | 'effort';

const HEAT_WEEKS = 26;

export function useStatsData() {
  const sessions = ref<WorkoutSession[]>([]);   // completed, newest first
  const exerciseImages = ref(new Map<string, string>());

  async function load() {
    const rows = await db.workoutSessions.where('status').equals('completed').toArray();
    sessions.value = chronological(rows).reverse();
    const exercises = await db.exercises.toArray();
    exerciseImages.value = new Map(exercises.map(e => [e.exerciseDbId, e.cachedImageUrl || e.gifUrl || '']));
  }

  const prs = computed(() => personalRecords(sessions.value));

  // ---- Tiles ----
  const totalWorkouts = computed(() => sessions.value.length);
  const thisMonth = computed(() => {
    const prefix = localDateString().slice(0, 7);
    return sessions.value.filter(s => s.date.startsWith(prefix)).length;
  });
  const streak = computed(() => weekStreak(sessions.value.map(s => s.date)));

  // ---- Activity heatmap: 26 weeks × 7 days, newest week on the right ----
  function heatmap(metric: HeatMetric) {
    const perDay = new Map<string, number>();
    for (const s of sessions.value) {
      const v = metric === 'time' ? s.durationSeconds / 60 : sessionVolume(s);
      perDay.set(s.date, (perDay.get(s.date) ?? 0) + v);
    }
    // Levels 1–4 split the non-zero days into quartiles, so the scale adapts
    // to how long or heavy this person's sessions usually are.
    const values = [...perDay.values()].filter(v => v > 0).sort((a, b) => a - b);
    const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))] ?? 0;
    const cuts = [q(0.25), q(0.5), q(0.75)];
    const level = (v: number) => (v <= 0 ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);

    const today = localDateString();
    const firstMonday = addDays(weekStart(today), -(HEAT_WEEKS - 1) * 7);
    const weeks = Array.from({ length: HEAT_WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(firstMonday, w * 7 + d);
        const value = perDay.get(date) ?? 0;
        return { date, value, level: date > today ? -1 : level(value) };
      })
    );
    // Month labels at the week where each month starts.
    const months: { label: string; week: number }[] = [];
    weeks.forEach((week, i) => {
      const firstOfMonth = week.find(c => c.date.endsWith('-01'));
      if (firstOfMonth || i === 0) {
        months.push({ label: parseLocalDate((firstOfMonth ?? week[0]).date).toLocaleDateString(undefined, { month: 'short' }), week: i });
      }
    });
    // The first column's label is only there for a partial month; drop it if
    // the next month starts too soon, so real month starts are never hidden.
    const spaced = months.filter((_, i) => i !== 0 || (months[1]?.week ?? 99) >= 3);
    return { weeks, months: spaced };
  }

  // ---- Effort (RIR) ----
  function effort(range: EffortRange) {
    const since = range === 'all' ? '' : addDays(localDateString(), -Number(range));
    let finished = 0;
    const rated: number[] = [];
    for (const s of sessions.value) {
      if (s.date < since) continue;
      for (const ex of s.exercises) {
        for (const set of doneSets(ex.sets)) {
          finished++;
          // RPE converts to RIR as 10 − RPE.
          const rir = set.rir ?? (set.rpe != null ? 10 - set.rpe : undefined);
          if (rir != null) rated.push(rir);
        }
      }
    }
    const buckets = [0, 1, 2, 3, 4].map(b => ({
      label: b === 4 ? 'RIR 4+' : `RIR ${b}`,
      count: rated.filter(r => (b === 4 ? r >= 4 : r >= b && r < b + 1)).length
    }));
    const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null;
    const hardShare = rated.length ? rated.filter(r => r <= 3).length / rated.length : null;
    return { finished, rated: rated.length, avg, hardShare, buckets };
  }

  // ---- Exercise progress ----
  const loggedExercises = computed(() => {
    const map = new Map<string, { id: string; name: string; best: number; sessions: number }>();
    for (const s of sessions.value) {
      for (const ex of s.exercises) {
        const sets = doneSets(ex.sets);
        if (!sets.length) continue;
        const top = Math.max(...sets.map(x => x.weight));
        const cur = map.get(ex.exerciseDbId);
        if (cur) { cur.best = Math.max(cur.best, top); cur.sessions++; }
        else map.set(ex.exerciseDbId, { id: ex.exerciseDbId, name: ex.name, best: top, sessions: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
  });

  function exerciseSeries(exerciseId: string, metric: ProgressMetric) {
    const points: { date: string; value: number }[] = [];
    for (const s of [...sessions.value].reverse()) {
      const sets = s.exercises.filter(e => e.exerciseDbId === exerciseId).flatMap(e => doneSets(e.sets));
      if (!sets.length) continue;
      let value: number | null;
      if (metric === 'top') value = Math.max(...sets.map(x => x.weight));
      else if (metric === 'e1rm') value = Math.round(Math.max(...sets.map(x => estimate1RM(x.weight, x.reps))) * 10) / 10;
      else {
        const rirs = sets.map(x => x.rir ?? (x.rpe != null ? 10 - x.rpe : null)).filter((r): r is number => r != null);
        value = rirs.length ? Math.round((rirs.reduce((a, b) => a + b, 0) / rirs.length) * 10) / 10 : null;
      }
      if (value != null) points.push({ date: s.date, value });
    }
    return points;
  }

  // ---- Workout cards ----
  function summary(s: WorkoutSession) {
    return {
      volume: sessionVolume(s),
      sets: sessionSetCount(s),
      prCount: s.id != null ? prs.value.get(s.id)?.size ?? 0 : 0
    };
  }

  return {
    sessions, exerciseImages, prs, totalWorkouts, thisMonth, streak,
    heatmap, effort, loggedExercises, exerciseSeries, summary, load
  };
}
