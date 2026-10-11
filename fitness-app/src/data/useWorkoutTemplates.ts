import { ref } from 'vue';
import { db } from '@/db/AppDatabase';
import type { WorkoutTemplate } from '@/db/models/WorkoutTemplate.model';
import type { WorkoutExercise } from '@/db/models/WorkoutSession.model';

const templates = ref<WorkoutTemplate[]>([]);
const loading = ref(false);

export function useWorkoutTemplates() {
  async function loadTemplates() {
    loading.value = true;
    try {
      templates.value = await db.workoutTemplates.orderBy('createdAt').reverse().toArray();
    } finally {
      loading.value = false;
    }
  }

  async function saveTemplate(name: string, exercises: WorkoutExercise[]) {
    const template: WorkoutTemplate = {
      name,
      createdAt: new Date().toISOString(),
      exercises
    };
    const id = await db.workoutTemplates.add(template) as number;
    templates.value.unshift({ ...template, id });
    return id;
  }

  async function deleteTemplate(id: number) {
    await db.workoutTemplates.delete(id);
    templates.value = templates.value.filter(t => t.id !== id);
  }

  return { templates, loading, loadTemplates, saveTemplate, deleteTemplate };
}
