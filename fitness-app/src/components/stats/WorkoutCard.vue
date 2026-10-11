<template>
  <button type="button" class="cp-card cp-row card" @click="router.push(`/history/${session.id}`)">
    <span class="cp-tile"><LottieIcon name="exercises" :size="20" :draw="false" /></span>
    <span class="text">
      <span class="name">{{ session.name }}</span>
      <span class="meta">{{ meta }}</span>
    </span>
    <span v-if="prCount" class="pr"><LottieIcon name="trophy" :size="13" :draw="false" />{{ prCount }} PR</span>
    <span class="chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import LottieIcon from '@/components/LottieIcon.vue';
import type { WorkoutSession } from '@/db/models/WorkoutSession.model';
import { formatDuration } from '@/data/workoutSummary';
import { parseLocalDate } from '@/utils/date';

const props = defineProps<{ session: WorkoutSession; sets: number; volume: number; prCount: number }>();
const router = useRouter();

// "Wed 7 Oct · 1h 1m · 17 sets · 7,520 kg"
const meta = computed(() => {
  const date = parseLocalDate(props.session.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const parts = [date];
  if (props.session.durationSeconds > 0) parts.push(formatDuration(props.session.durationSeconds));
  parts.push(`${props.sets} set${props.sets === 1 ? '' : 's'}`);
  if (props.volume > 0) parts.push(`${new Intl.NumberFormat().format(Math.round(props.volume * 10) / 10)} kg`);
  return parts.join(' · ');
});
</script>

<style scoped>
.card {
  width: 100%;
  padding: 14px;
  border: 0;
  border-radius: 16px;
  color: var(--text-primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.text { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.name { overflow: hidden; font-size: 17px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.meta { color: var(--text-secondary); font-size: 13px; }
.pr {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 8px;
  background: rgba(var(--warning-rgb), 0.16);
  color: var(--warning);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.chev { display: flex; color: var(--text-secondary); }
</style>
