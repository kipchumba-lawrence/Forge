<template>
  <svg
    v-if="points.length >= 2"
    class="weight-chart"
    viewBox="0 0 318 120"
    role="img"
    :aria-label="label"
  >
    <g v-for="t in ticks" :key="t">
      <text x="0" :y="y(t) + 4" class="axis">{{ t }}</text>
      <line x1="30" x2="318" :y1="y(t)" :y2="y(t)" class="grid" />
    </g>
    <polygon :points="areaPoints" class="area" />
    <polyline :points="linePoints" class="line" />
    <template v-if="refValue != null">
      <line x1="30" x2="318" :y1="y(refValue)" :y2="y(refValue)" class="goal" />
      <text x="314" :y="y(refValue) - 5" class="goal-label">{{ refValue }}</text>
    </template>
    <circle :cx="x(last.date)" :cy="y(last.value)" r="4.5" class="dot" />
    <text v-for="m in months" :key="m.label + m.x" :x="m.x" y="116" class="axis" text-anchor="middle">{{ m.label }}</text>
  </svg>
  <p v-else class="empty">{{ emptyText }}</p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { parseLocalDate } from '@/utils/date';

// Dated line chart in the design's style: dashed gridlines on round steps,
// soft area fill, an optional dashed reference line (e.g. a goal) and a dot
// on the latest point.
const props = withDefaults(defineProps<{
  points: { date: string; value: number }[];
  refValue?: number | null;
  label: string;
  emptyText?: string;
}>(), { refValue: null, emptyText: 'Not enough data yet.' });

const X0 = 30, X1 = 308, Y0 = 12, Y1 = 98;

const last = computed(() => props.points[props.points.length - 1]);
const times = computed(() => props.points.map(p => parseLocalDate(p.date).getTime()));

const bounds = computed(() => {
  const values = props.points.map(p => p.value).concat(props.refValue != null ? [props.refValue] : []);
  const lo = Math.min(...values), hi = Math.max(...values);
  const pad = Math.max(0.3, (hi - lo) * 0.08);
  return { lo: lo - pad, hi: hi + pad };
});

// Gridlines on a round step (0.5, 1, 2.5, 5 kg) giving two to four lines.
const ticks = computed(() => {
  const { lo, hi } = bounds.value;
  const step = [0.5, 1, 2.5, 5, 10, 25, 50, 100, 250].find(s => (hi - lo) / s <= 3.5) ?? 500;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(Math.round(v * 10) / 10);
  return out;
});

function x(date: string) {
  const [t0, t1] = [times.value[0], times.value[times.value.length - 1]];
  const t = parseLocalDate(date).getTime();
  return t1 === t0 ? X1 : X0 + ((t - t0) / (t1 - t0)) * (X1 - X0);
}

function y(v: number) {
  const { lo, hi } = bounds.value;
  return Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
}

const linePoints = computed(() => props.points.map(p => `${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' '));
const areaPoints = computed(() => `${X0},${Y1} ${linePoints.value} ${x(last.value.date).toFixed(1)},${Y1}`);

// One label per month, centred on that month's span within the chart.
const months = computed(() => {
  const spans = new Map<string, { first: string; lastDate: string }>();
  for (const p of props.points) {
    const key = p.date.slice(0, 7);
    const span = spans.get(key);
    if (span) span.lastDate = p.date;
    else spans.set(key, { first: p.date, lastDate: p.date });
  }
  const list = [...spans.values()].map(s => ({
    label: parseLocalDate(s.first).toLocaleDateString(undefined, { month: 'short' }),
    x: Math.min(300, Math.max(45, (x(s.first) + x(s.lastDate)) / 2))
  }));
  // Drop labels that would collide.
  return list.filter((m, i) => i === 0 || m.x - list[i - 1].x > 34);
});
</script>

<style scoped>
.weight-chart {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.axis {
  fill: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 10px;
}

.grid {
  stroke: var(--surface-highest);
  stroke-dasharray: 2 4;
}

.area {
  fill: var(--primary);
  fill-opacity: 0.16;
}

.line {
  fill: none;
  stroke: var(--primary);
  stroke-width: 2.4;
  stroke-linejoin: round;
}

.goal {
  stroke: var(--warning);
  stroke-width: 1.6;
  stroke-dasharray: 6 4;
}

.goal-label {
  fill: var(--warning);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  text-anchor: end;
}

.dot {
  fill: var(--primary);
  stroke: var(--bg-color);
  stroke-width: 2;
}

.empty {
  margin: 0;
  padding: 18px 0 6px;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
