import { ref, computed } from 'vue';
import { OpenRouterApiManager } from '@/api/OpenRouterApiManager';
import { db } from '@/db/AppDatabase';
import type { FoodEntry } from '@/db/models/FoodEntry.model';
import { localDateString } from '@/utils/date';

export function useFoodData() {
  const lastScan = ref<FoodEntry | null>(null);
  const pendingScan = ref<Omit<FoodEntry, 'id'> | null>(null);
  const todayEntries = ref<FoodEntry[]>([]);
  const todayKcal = ref(0);
  const kcalGoal = ref(1000);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const remainingKcal = computed(() => kcalGoal.value - todayKcal.value);

  // Scanning only analyzes the photo and stages the result for review —
  // it doesn't log it until the user confirms via confirmScan().
  async function scanFood(base64Image: string, mealType: FoodEntry['mealType']) {
    loading.value = true;
    error.value = null;
    pendingScan.value = null;
    try {
      const result = await OpenRouterApiManager.analyzeFoodImage(base64Image);

      pendingScan.value = {
        date: localDateString(),
        mealType,
        name: result.name,
        kcal: result.kcal,
        protein: result.protein,
        carbs: result.carbs,
        fats: result.fats,
        confidence: result.confidence,
        imageBase64: base64Image
      };
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function confirmScan() {
    if (!pendingScan.value) return;
    const id = await db.foodEntries.add(pendingScan.value) as number;
    lastScan.value = { ...pendingScan.value, id };
    pendingScan.value = null;
    await loadTodayEntries();
  }

  function discardScan() {
    pendingScan.value = null;
  }

  async function addManualEntry(entry: Omit<FoodEntry, 'id'>) {
    const id = await db.foodEntries.add(entry) as number;
    lastScan.value = { ...entry, id };
    await loadTodayEntries();
  }

  async function deleteEntry(id: number) {
    await db.foodEntries.delete(id);
    await loadTodayEntries();
  }

  async function loadTodayEntries() {
    const today = localDateString();
    todayEntries.value = await db.foodEntries
      .where('date').equals(today).toArray();
    todayKcal.value = todayEntries.value.reduce((s, e) => s + e.kcal, 0);
  }

  return {
    lastScan, pendingScan, todayEntries, todayKcal, kcalGoal, remainingKcal, loading, error,
    scanFood, confirmScan, discardScan, addManualEntry, deleteEntry, loadTodayEntries
  };
}
