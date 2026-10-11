<template>
  <div class="bar-row">
    <span class="name">{{ label }}</span>
    <div class="track" role="img" :aria-label="`${label}: ${value}`">
      <i :style="{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color || 'var(--primary)' }"></i>
    </div>
    <span class="value">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; pct: number; value: string; color?: string }>();
</script>

<style scoped>
.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.name { width: 92px; flex-shrink: 0; font-size: 14px; }
.track {
  height: 7px;
  flex: 1;
  overflow: hidden;
  border-radius: 99px;
  background: var(--surface-high);
}
.track i {
  display: block;
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}
.value {
  width: 104px;
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
@media (prefers-reduced-motion: reduce) { .track i { transition: none; } }
</style>
