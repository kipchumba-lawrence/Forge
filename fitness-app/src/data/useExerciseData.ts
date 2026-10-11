import { ExerciseApiManager } from '@/api/ExerciseApiManager';
import { db } from '@/db/AppDatabase';

// Full exercise details (instructions, video, tips), fetched once per
// exercise and cached. The catalog itself lives in useExerciseCatalog.
export function useExerciseData() {
  async function getById(exerciseDbId: string) {
    const cached = await db.exercises.where('exerciseDbId').equals(exerciseDbId).first();
    if (cached?.instructions?.length) return cached;

    try {
      const detail = await ExerciseApiManager.getDetail(exerciseDbId);
      const enriched = {
        ...cached,
        exerciseDbId,
        name: (detail.name || '').trim(),
        bodyPart: detail.bodyParts?.[0]?.toLowerCase() || cached?.bodyPart || 'unknown',
        equipment: detail.equipments?.[0]?.toLowerCase() || cached?.equipment || 'unknown',
        target: detail.targetMuscles?.[0]?.toLowerCase() || cached?.target || 'unknown',
        targetMuscles: detail.targetMuscles?.map((m: string) => m.toLowerCase()) || cached?.targetMuscles || [],
        gifUrl: detail.imageUrls?.['720p'] || detail.imageUrl || cached?.gifUrl || '',
        videoUrl: detail.videoUrl,
        instructions: detail.instructions || [],
        cachedImageUrl: detail.imageUrls?.['720p'] || detail.imageUrl || cached?.cachedImageUrl,
        exerciseType: detail.exerciseType?.toLowerCase() || cached?.exerciseType,
        overview: detail.overview || cached?.overview,
        secondaryMuscles: detail.secondaryMuscles?.map((m: string) => m.toLowerCase()) || cached?.secondaryMuscles || [],
        exerciseTips: detail.exerciseTips || cached?.exerciseTips || [],
        variations: detail.variations || cached?.variations || [],
        relatedExerciseIds: detail.relatedExerciseIds || cached?.relatedExerciseIds || []
      };
      if (cached?.id) await db.exercises.put({ ...enriched, id: cached.id });
      return enriched;
    } catch {
      return cached;
    }
  }

  return { getById };
}
