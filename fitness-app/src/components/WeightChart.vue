<template>
  <LineChart
    :points="series"
    :ref-value="goal"
    :label="label"
    empty-text="Log a couple of weigh-ins to see your trend."
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LineChart from '@/components/LineChart.vue';

const props = defineProps<{ points: { date: string; weightKg: number }[]; goal: number | null }>();

const series = computed(() => props.points.map(p => ({ date: p.date, value: p.weightKg })));
const label = computed(() => {
  const p = props.points;
  return p.length >= 2 ? `Body weight trending from ${p[0].weightKg} to ${p[p.length - 1].weightKg} kg` : 'Body weight';
});
</script>
