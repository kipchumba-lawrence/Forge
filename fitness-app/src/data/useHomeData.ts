import { computed, ref } from 'vue';
import { db } from '@/db/AppDatabase';
import type { WorkoutSession } from '@/db/models/WorkoutSession.model';
import { addDays, localDateString, parseLocalDate, weekStart, weekStreak as weekStreakOf } from '@/utils/date';

export interface WeekDay {
  date: string;
  label: string;     // MO, TU, …
  dayOfMonth: number;
  isToday: boolean;
  trained: boolean;
}

const DAY_LABELS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export function useHomeData() {
  const completed = ref<WorkoutSession[]>([]);
  const activeSession = ref<WorkoutSession | null>(null);
  const weekOffset = ref(0);   // 0 = this week, -1 = last week, …

  async function load() {
    completed.value = await db.workoutSessions.where('status').equals('completed').toArray();
    activeSession.value = (await db.workoutSessions.where('status').equals('active').last()) ?? null;
  }

  const trainedDates = computed(() => new Set(completed.value.map(s => s.date)));

  const week = computed<WeekDay[]>(() => {
    const today = localDateString();
    const monday = addDays(weekStart(today), weekOffset.value * 7);
    return DAY_LABELS.map((label, i) => {
      const date = addDays(monday, i);
      return {
        date, label,
        dayOfMonth: parseLocalDate(date).getDate(),
        isToday: date === today,
        trained: trainedDates.value.has(date)
      };
    });
  });

  const weekLabel = computed(() => {
    if (weekOffset.value === 0) return 'This week';
    if (weekOffset.value === -1) return 'Last week';
    const start = parseLocalDate(week.value[0].date);
    return `Week of ${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  });

  const thisWeekCount = computed(() => {
    const monday = weekStart(localDateString());
    return completed.value.filter(s => s.date >= monday).length;
  });

  const weekStreak = computed(() => weekStreakOf(completed.value.map(s => s.date)));

  const lastWorkout = computed(() =>
    [...completed.value].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  );

  return {
    week, weekLabel, weekOffset, thisWeekCount, weekStreak,
    totalWorkouts: computed(() => completed.value.length),
    activeSession, lastWorkout, load
  };
}
