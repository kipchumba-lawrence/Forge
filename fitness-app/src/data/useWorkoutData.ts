import { db } from '@/db/AppDatabase';

// Edits to finished workouts. The workout in progress lives in
// useActiveWorkout.
export function useWorkoutData() {
  async function updateSessionNote(sessionId: number, note: string) {
    await db.workoutSessions.update(sessionId, { note: note.trim() || undefined });
  }

  // Removes the workout and its attached photos/videos together.
  async function deleteSession(sessionId: number) {
    await db.transaction('rw', db.workoutSessions, db.workoutMedia, async () => {
      await db.workoutMedia.where('sessionId').equals(sessionId).delete();
      await db.workoutSessions.delete(sessionId);
    });
  }

  return { updateSessionNote, deleteSession };
}
