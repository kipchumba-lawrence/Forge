import type { ProgressionRule, WorkoutExercise } from './WorkoutSession.model';

export interface WorkoutTemplate {
  id?: number;
  name: string;
  createdAt: string;
  exercises: WorkoutExercise[];
  progression?: ProgressionRule;   // default for its exercises; 'none' if unset
  isDeload?: boolean;              // its workouts don't count toward progression
  order?: number;                  // position in the Routines list
}
