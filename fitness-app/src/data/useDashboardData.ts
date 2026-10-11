import { ref } from 'vue';
import { db } from '@/db/AppDatabase';
import { localDateString } from '@/utils/date';

const CALORIES_PER_MINUTE = 7;

export function useDashboardData() {
  const calories = ref(0);
  const caloriesGoal = ref(2200);
  const activeMinutes = ref(0);
  const activeMinutesGoal = ref(60);
  const loading = ref(false);
  const weeklyActivity = ref<{ day: string; minutes: number }[]>([]);

  async function minutesAndCaloriesForDate(date: string) {
    const sessions = await db.workoutSessions
      .where('date').equals(date)
      .and(s => s.status === 'completed')
      .toArray();

    const seconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
    const minutes = Math.round(seconds / 60);
    const cals = sessions.reduce((sum, s) => {
      return sum + (s.totalCaloriesBurned ?? Math.round((s.durationSeconds / 60) * CALORIES_PER_MINUTE));
    }, 0);

    return { minutes, cals };
  }

  async function loadTodayActivity() {
    loading.value = true;
    const today = localDateString();

    const { minutes, cals } = await minutesAndCaloriesForDate(today);
    activeMinutes.value = minutes;
    calories.value = cals;

    // Update today's row in place; a put without its id would add a new row per visit.
    const existing = await db.dailyActivity.where('date').equals(today).first();
    await db.dailyActivity.put({
      id: existing?.id,
      date: today,
      steps: 0,
      stepsGoal: 0,
      caloriesBurned: cals,
      caloriesGoal: caloriesGoal.value,
      activeMinutes: minutes,
      activeMinutesGoal: activeMinutesGoal.value,
      weeklyMinutes: []
    });

    loading.value = false;
  }

  async function loadWeeklyActivity() {
    const days: { day: string; minutes: number }[] = [];
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = localDateString(d);
      const { minutes } = await minutesAndCaloriesForDate(dateStr);
      days.push({ day: labels[d.getDay()], minutes });
    }

    weeklyActivity.value = days;
  }

  return {
    calories, caloriesGoal,
    activeMinutes, activeMinutesGoal, loading,
    weeklyActivity,
    loadTodayActivity, loadWeeklyActivity
  };
}
