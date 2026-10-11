import { computed, onScopeDispose, ref } from 'vue';
import { db } from '@/db/AppDatabase';
import type { PhotoCheckIn, Pose } from '@/db/models/PhotoCheckIn.model';
import { OpenRouterApiManager } from '@/api/OpenRouterApiManager';
import { localDateString } from '@/utils/date';
import { preparePhoto, toAiDataUrl } from '@/utils/image';

export type CheckInWithUrls = PhotoCheckIn & { url: string; thumbUrl: string };

const byNewest = (a: PhotoCheckIn, b: PhotoCheckIn) => b.createdAt.localeCompare(a.createdAt);

export function usePhotoCheckIns() {
  const all = ref<CheckInWithUrls[]>([]);
  const loading = ref(false);
  const comparingId = ref<number | null>(null);
  const error = ref<string | null>(null);

  // Object URLs pin their Blob in memory until revoked.
  let urls: string[] = [];
  function revokeAll() {
    urls.forEach(u => URL.revokeObjectURL(u));
    urls = [];
  }
  onScopeDispose(revokeAll);

  async function load() {
    loading.value = true;
    try {
      const rows = (await db.photoCheckIns.toArray()).sort(byNewest);
      revokeAll();
      all.value = rows.map(r => {
        const url = URL.createObjectURL(r.blob);
        const thumbUrl = URL.createObjectURL(r.thumbnail);
        urls.push(url, thumbUrl);
        return { ...r, url, thumbUrl };
      });
    } finally {
      loading.value = false;
    }
  }

  const forPose = (pose: Pose) => computed(() => all.value.filter(p => p.pose === pose));

  // The check-in this one should be compared against: the latest earlier
  // photo of the same pose.
  function previousOf(photo: PhotoCheckIn) {
    return all.value.filter(p => p.pose === photo.pose && p.createdAt < photo.createdAt).sort(byNewest)[0] ?? null;
  }

  async function addCheckIn(file: Blob, pose: Pose) {
    error.value = null;
    if (!file.type.startsWith('image/')) {
      error.value = 'Choose a photo.';
      return null;
    }
    const date = localDateString();
    const photo = await preparePhoto(file);
    // Tag with that day's latest weigh-in so the comparison can mention it.
    const weighIn = (await db.bodyWeights.where('date').equals(date).sortBy('loggedAt')).pop();
    const row: PhotoCheckIn = {
      date, createdAt: new Date().toISOString(), pose, ...photo,
      ...(weighIn ? { weightKg: weighIn.weightKg } : {})
    };
    row.id = await db.photoCheckIns.add(row) as number;
    await load();
    return row.id;
  }

  async function compare(photoId: number) {
    error.value = null;
    const current = all.value.find(p => p.id === photoId);
    const previous = current ? previousOf(current) : null;
    if (!current || !previous) {
      error.value = 'There is no earlier photo of this pose to compare with.';
      return;
    }
    comparingId.value = photoId;
    try {
      const [beforeImage, afterImage] = await Promise.all([toAiDataUrl(previous.blob), toAiDataUrl(current.blob)]);
      const result = await OpenRouterApiManager.compareProgressPhotos({
        beforeImage, afterImage,
        beforeDate: previous.date, afterDate: current.date,
        beforeWeightKg: previous.weightKg, afterWeightKg: current.weightKg,
        pose: current.pose
      });
      const comparison = { againstId: previous.id!, ...result, createdAt: new Date().toISOString() };
      await db.photoCheckIns.update(photoId, { comparison });
      current.comparison = comparison;
    } catch (e) {
      error.value = (e as Error).message || 'The comparison failed. Try again in a moment.';
    } finally {
      comparingId.value = null;
    }
  }

  async function remove(photoId: number) {
    await db.photoCheckIns.delete(photoId);
    // A later photo compared against this one keeps its text, but the pairing
    // no longer exists, so drop it to avoid showing a stale "before".
    const dependants = await db.photoCheckIns.filter(p => p.comparison?.againstId === photoId).toArray();
    for (const d of dependants) await db.photoCheckIns.update(d.id!, { comparison: undefined });
    await load();
  }

  return { all, loading, comparingId, error, load, forPose, previousOf, addCheckIn, compare, remove };
}
