export interface DailyActivity {
  id?: number;
  date: string;
  steps: number;
  stepsGoal: number;
  caloriesBurned: number;
  caloriesGoal: number;
  activeMinutes: number;
  activeMinutesGoal: number;
  weeklyMinutes: { day: string; minutes: number }[];
}
