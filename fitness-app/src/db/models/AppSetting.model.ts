export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'green' | 'blue' | 'amber' | 'violet' | 'pink' | 'coral' | 'teal' | 'yellow';
export type EffortScale = 'off' | 'rir' | 'rpe';
export type UnderExercise = 'lastTime' | 'best' | 'nothing';
export type WorkoutLayout = 'cards' | 'list' | 'compact';
export type AnimationSize = 'full' | 'small' | 'hidden';
export type ScheduleMode = 'fixed' | 'rotation';
// Fixed week: routine ids per weekday, Monday = 0.
export type WeekSchedule = Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', number[]>;

export interface AppSettings {
  theme: ThemeMode;
  accent: AccentColor;
  bodyDiagram: 'male' | 'female';
  homeShowGymCheckIn: boolean;
  homeShowBodyWeight: boolean;
  weighInBeforeWorkout: boolean;
  restTimerSec: number;
  restPauseSec: number;
  effortScale: EffortScale;
  underExercise: UnderExercise;
  workoutLayout: WorkoutLayout;
  keepScreenAwake: boolean;
  exerciseAnimations: AnimationSize;
  bodyWeightGoalKg: number | null;
  // The user agreed to send progress photos to OpenRouter for AI comparison.
  aiPhotoConsent: boolean;
  // When the full exercise catalog was last downloaded (ISO), or null.
  catalogSyncedAt: string | null;
  scheduleMode: ScheduleMode;
  weekSchedule: WeekSchedule;
  rotation: number[];          // routine ids in order; 0 = rest day
  rotationNext: number;        // index into `rotation` of the next workout
  structuralBalanceTable: 'poliquin' | 'thibaudeau' | 'atg';
  // "Change exercise" on Structural balance: ratio lift id -> exerciseDbId
  structuralBalanceExercises: Record<string, string>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accent: 'green',
  bodyDiagram: 'male',
  homeShowGymCheckIn: true,
  homeShowBodyWeight: true,
  weighInBeforeWorkout: true,
  restTimerSec: 90,
  restPauseSec: 15,
  effortScale: 'rir',
  underExercise: 'lastTime',
  workoutLayout: 'cards',
  keepScreenAwake: true,
  exerciseAnimations: 'full',
  bodyWeightGoalKg: null,
  aiPhotoConsent: false,
  catalogSyncedAt: null,
  scheduleMode: 'fixed',
  weekSchedule: { '0': [], '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] },
  rotation: [],
  rotationNext: 0,
  structuralBalanceTable: 'poliquin',
  structuralBalanceExercises: {}
};

// One row per setting so a write touches only the key that changed.
export interface AppSettingRow {
  key: keyof AppSettings;
  value: unknown;
}
