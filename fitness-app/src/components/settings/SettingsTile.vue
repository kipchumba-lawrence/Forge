<template>
  <span class="tile" :style="{ background: color }"><LottieIcon :name="icon" :size="17" /></span>
</template>

<script setup lang="ts">
import LottieIcon from '@/components/LottieIcon.vue';
import type { IconName } from '@/lottie/icons';

// Tile colours are the design's fixed per-row hues; they don't follow the accent.
defineProps<{ icon: IconName; color: string }>();
</script>

<style scoped>
.tile {
  display: flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #F3EFE2;
}
</style>
