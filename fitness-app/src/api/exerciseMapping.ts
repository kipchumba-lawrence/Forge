import type { Exercise } from '@/db/models/Exercise.model';

const lower = (list?: string[]) => (list ?? []).map(m => m.toLowerCase());

// ExerciseDB list item → our Exercise. List responses only carry a summary
// (one image, no instructions or video); details are fetched lazily.
// Body parts, equipment and muscles arrive upper-cased; we store them
// lower-cased so the "capitalize" CSS renders them in title case.
export function fromApiSummary(ex: any): Omit<Exercise, 'id'> {
  return {
    exerciseDbId: ex.exerciseId,
    name: (ex.name || '').trim(),
    bodyPart: ex.bodyParts?.[0]?.toLowerCase() || 'unknown',
    equipment: ex.equipments?.[0]?.toLowerCase() || 'unknown',
    target: ex.targetMuscles?.[0]?.toLowerCase() || 'unknown',
    targetMuscles: lower(ex.targetMuscles),
    secondaryMuscles: lower(ex.secondaryMuscles),
    exerciseType: ex.exerciseType?.toLowerCase(),
    gifUrl: ex.imageUrl || '',
    cachedImageUrl: ex.imageUrl || '',
    instructions: []
  };
}

// Fields a re-sync must never overwrite: details fetched later and
// everything the user set locally.
export function mergeLocal(fresh: Omit<Exercise, 'id'>, prev?: Exercise): Exercise {
  if (!prev) return fresh as Exercise;
  return {
    ...prev,
    ...fresh,
    id: prev.id,
    instructions: prev.instructions?.length ? prev.instructions : fresh.instructions,
    videoUrl: prev.videoUrl,
    overview: prev.overview,
    exerciseTips: prev.exerciseTips,
    variations: prev.variations,
    relatedExerciseIds: prev.relatedExerciseIds,
    cachedImageUrl: prev.cachedImageUrl || fresh.cachedImageUrl,
    isFavorite: prev.isFavorite,
    plateLoading: prev.plateLoading
  };
}
