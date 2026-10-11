import { ref } from 'vue';
import { OpenRouterApiManager } from '@/api/OpenRouterApiManager';
import { db } from '@/db/AppDatabase';
import { randomQuote } from '@/data/motivationalQuotes';
import { localDateString } from '@/utils/date';

export function useInsightsData() {
  const insight = ref('');
  const loading = ref(false);

  async function loadInsight(activity: {
    calories: number; caloriesGoal: number;
    activeMinutes: number; activeMinutesGoal: number;
  }) {
    loading.value = true;
    const today = localDateString();
    try {
      // Return cached insight if already generated today
      const cached = await db.aiInsights
        .where({ date: today, type: 'daily' })
        .first();
      
      // Older builds could cache an empty reply; ignore those and regenerate.
      if (cached?.content.trim()) {
        insight.value = cached.content;
        return;
      }
      if (cached?.id) await db.aiInsights.delete(cached.id);

      // Generate fresh
      const text = await OpenRouterApiManager.generateInsight(activity);
      insight.value = text;

      // Cache
      await db.aiInsights.add({ date: today, type: 'daily', content: text });
    } catch (e) {
      console.warn('Insight generation failed', e);
      const fallback = randomQuote();
      insight.value = `"${fallback.text}" — ${fallback.author}`;
    } finally {
      loading.value = false;
    }
  }

  return { insight, loading, loadInsight };
}
