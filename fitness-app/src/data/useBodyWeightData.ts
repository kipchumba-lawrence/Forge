import { ref, computed } from 'vue';
import { db } from '@/db/AppDatabase';
import type { BodyWeight } from '@/db/models/BodyWeight.model';
import { useSettings } from '@/data/useSettings';
import { addDays, localDateString, weekStart } from '@/utils/date';

export interface WeighInWeek {
  weekStart: string;
  average: number;
  change: number | null;   // vs the previous logged week's average; null for the oldest week
  entries: BodyWeight[];   // newest first
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Module-level so the Home card, the check-in sheet and Stats stay in sync
// after any of them logs a weight.
const entries = ref<BodyWeight[]>([]);   // newest first
const loading = ref(false);

export function useBodyWeightData() {
  const { settings, setSetting } = useSettings();

  const latest = computed(() => entries.value[0] ?? null);

  const goal = computed(() => settings.bodyWeightGoalKg);
  const toGoal = computed(() =>
    latest.value && goal.value != null ? round1(latest.value.weightKg - goal.value) : null
  );

  // Starting value for the quick check-in stepper: last weight, else a neutral default.
  const suggestedWeight = computed(() => latest.value?.weightKg ?? 75);

  const weeks = computed<WeighInWeek[]>(() => {
    const byWeek = new Map<string, BodyWeight[]>();
    for (const e of entries.value) {
      const key = weekStart(e.date);
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push(e);
    }
    const list = [...byWeek.entries()].map(([ws, items]) => ({
      weekStart: ws,
      average: round1(items.reduce((s, i) => s + i.weightKg, 0) / items.length),
      change: null as number | null,
      entries: items
    }));
    for (let i = 0; i < list.length - 1; i++) {
      list[i].change = round1(list[i].average - list[i + 1].average);
    }
    return list;
  });

  async function load() {
    loading.value = true;
    try {
      entries.value = await db.bodyWeights.orderBy('loggedAt').reverse().toArray();
    } finally {
      loading.value = false;
    }
  }

  // Pre-workout check-in replaces an earlier check-in from the same day rather
  // than stacking duplicates when a user starts two workouts.
  async function logWeight(weightKg: number, opts: { date?: string; source?: BodyWeight['source'] } = {}) {
    const date = opts.date ?? localDateString();
    const source = opts.source ?? 'manual';
    const entry: BodyWeight = { date, weightKg: round1(weightKg), loggedAt: new Date().toISOString(), source };

    if (source === 'checkin') {
      const existing = await db.bodyWeights
        .where('date').equals(date)
        .and(e => e.source === 'checkin')
        .first();
      if (existing?.id) entry.id = existing.id;
    }

    entry.id = await db.bodyWeights.put(entry) as number;
    await load();
    return entry;
  }

  async function updateWeight(id: number, weightKg: number) {
    await db.bodyWeights.update(id, { weightKg: round1(weightKg) });
    await load();
  }

  async function deleteWeight(id: number) {
    await db.bodyWeights.delete(id);
    await load();
  }

  async function setGoal(kg: number | null) {
    await setSetting('bodyWeightGoalKg', kg == null ? null : round1(kg));
  }

  // Series for the Stats chart (oldest first) plus the change across the
  // window, e.g. "Weight 30d −1.2 kg". The baseline is the last weigh-in on or
  // before the window start, so a sparse log still gives a fair comparison.
  function trend(days: number | 'all') {
    const all = entries.value;
    if (!all.length) return { points: [] as { date: string; weightKg: number }[], change: null as number | null };

    const since = days === 'all' ? '' : addDays(localDateString(), -days);
    const inWindow = all.filter(e => e.date >= since);
    const baseline = all.find(e => e.date < since) ?? inWindow[inWindow.length - 1];

    // One point per day: the last weigh-in of that day.
    const perDay = new Map<string, number>();
    for (const e of [...inWindow].reverse()) perDay.set(e.date, e.weightKg);
    const points = [...perDay.entries()].map(([date, weightKg]) => ({ date, weightKg }));

    const change = baseline && all[0] !== baseline ? round1(all[0].weightKg - baseline.weightKg) : null;
    return { points, change };
  }

  return {
    entries, latest, weeks, goal, toGoal, suggestedWeight, loading,
    load, logWeight, updateWeight, deleteWeight, setGoal, trend
  };
}
