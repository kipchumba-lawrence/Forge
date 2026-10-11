export interface Exercise {
  id?: number;
  exerciseDbId: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  targetMuscles?: string[];   // all primary muscles, lowercased; `target` is only the first
  gifUrl: string;
  videoUrl?: string;
  instructions: string[];
  cachedImageUrl?: string;
  exerciseType?: string;
  overview?: string;
  secondaryMuscles?: string[];
  exerciseTips?: string[];
  variations?: string[];
  relatedExerciseIds?: string[];
  isFavorite?: boolean;
  // How the active workout splits a load into plates.
  plateLoading?: 'perSide' | 'single' | 'off';
  // User-created exercises (not from ExerciseDB).
  isCustom?: boolean;
  customMedia?: Blob;       // photo or video the user attached
  createdAt?: string;
}
