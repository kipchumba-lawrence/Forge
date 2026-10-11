export type ProgressionRule = 'none' | 'linear' | 'greyskull' | 'double';

export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
  rir?: number;   // reps in reserve, when effort is logged as RIR
  rpe?: number;   // rate of perceived exertion (1–10), when logged as RPE
  amrap?: boolean; // as many reps as possible (Greyskull's last set)
}

export interface WorkoutExercise {
  exerciseDbId: string;
  name: string;
  sets: WorkoutSet[];
  // Routine settings (also copied onto a session when it starts).
  restSec?: number;                 // overrides the global rest timer
  supersetWithPrev?: boolean;       // grouped with the exercise above
  progression?: ProgressionRule;    // overrides the routine's rule
  repRange?: [number, number];      // double progression, e.g. [8, 12]
  progressionNote?: string;         // session only: why today's targets are what they are
  progressionDirection?: 'up' | 'same' | 'down' | 'start';
}

export interface WorkoutSession {
  id?: number;
  date: string;
  name: string;
  durationSeconds: number;
  status: 'active' | 'completed' | 'paused';
  exercises: WorkoutExercise[];
  totalCaloriesBurned?: number;
  note?: string;
  bodyWeightKg?: number;  // weigh-in taken at the start of this workout
  templateId?: number;    // routine it was started from
  isDeload?: boolean;     // excluded from progression decisions
  startedAt?: string;     // ISO; the elapsed timer runs from here
  currentExercise?: number; // where the active workout screen was left
  restEndsAt?: number;      // epoch ms; a rest timer survives closing the app
  restTotal?: number;       // seconds, for the rest bar's progress
}
