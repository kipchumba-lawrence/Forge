import { ref, onScopeDispose } from 'vue';
import { db } from '@/db/AppDatabase';
import type { WorkoutMedia } from '@/db/models/WorkoutMedia.model';
import { preparePhoto } from '@/utils/image';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export type MediaWithUrl = WorkoutMedia & { url: string; thumbUrl?: string };

export function useWorkoutMedia() {
  const items = ref<MediaWithUrl[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Object URLs pin their Blob in memory until revoked; free them whenever
  // the list is replaced and when the owning component unmounts.
  let urls: string[] = [];
  function revokeAll() {
    urls.forEach(u => URL.revokeObjectURL(u));
    urls = [];
  }
  function withUrls(rows: WorkoutMedia[]): MediaWithUrl[] {
    revokeAll();
    return rows.map(r => {
      const url = URL.createObjectURL(r.blob);
      const thumbUrl = r.thumbnail ? URL.createObjectURL(r.thumbnail) : undefined;
      urls.push(url, ...(thumbUrl ? [thumbUrl] : []));
      return { ...r, url, thumbUrl };
    });
  }
  onScopeDispose(revokeAll);

  async function loadForSession(sessionId: number) {
    loading.value = true;
    try {
      const rows = await db.workoutMedia.where('sessionId').equals(sessionId).sortBy('createdAt');
      items.value = withUrls(rows);
    } finally {
      loading.value = false;
    }
  }

  // Progress photos screen: every photo, newest date first.
  async function loadAllPhotos() {
    loading.value = true;
    try {
      const rows = await db.workoutMedia.where('kind').equals('photo').toArray();
      rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      items.value = withUrls(rows);
    } finally {
      loading.value = false;
    }
  }

  // Media hangs off a logged workout, so the session must exist and be
  // completed ("Log today's workout to add a photo").
  async function addMedia(sessionId: number, file: Blob) {
    error.value = null;
    const session = await db.workoutSessions.get(sessionId);
    if (!session || session.status !== 'completed') {
      error.value = 'Finish and log the workout before adding photos.';
      return null;
    }

    const now = new Date().toISOString();
    let row: WorkoutMedia;
    if (file.type.startsWith('image/')) {
      const photo = await preparePhoto(file);
      row = { sessionId, date: session.date, kind: 'photo', mimeType: 'image/jpeg', ...photo, createdAt: now };
    } else if (file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO_BYTES) {
        error.value = 'That video is over 100 MB. Trim it and try again.';
        return null;
      }
      row = { sessionId, date: session.date, kind: 'video', mimeType: file.type, blob: file, createdAt: now };
    } else {
      error.value = 'Only photos and videos can be attached.';
      return null;
    }

    row.id = await db.workoutMedia.add(row) as number;
    await loadForSession(sessionId);
    return row;
  }

  async function deleteMedia(id: number) {
    await db.workoutMedia.delete(id);
    // Drop it from whichever list is showing (session or all-photos) in place.
    const gone = items.value.find(i => i.id === id);
    if (gone) {
      [gone.url, gone.thumbUrl].forEach(u => u && URL.revokeObjectURL(u));
      urls = urls.filter(u => u !== gone.url && u !== gone.thumbUrl);
      items.value = items.value.filter(i => i.id !== id);
    }
  }

  return { items, loading, error, loadForSession, loadAllPhotos, addMedia, deleteMedia };
}
