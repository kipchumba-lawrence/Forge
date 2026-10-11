<template>
  <span class="thumb" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="src && !failed" :src="src" alt="" loading="lazy" @error="failed = true" />
    <span v-else class="placeholder"><LottieIcon name="exercises" :size="Math.round(size * 0.42)" :draw="false" /></span>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import LottieIcon from '@/components/LottieIcon.vue';
import type { Exercise } from '@/db/models/Exercise.model';

const props = withDefaults(defineProps<{ exercise: Pick<Exercise, 'cachedImageUrl' | 'gifUrl' | 'customMedia'>; size?: number }>(), { size: 52 });
const failed = ref(false);

// Custom exercises carry their own photo as a Blob.
let objectUrl = '';
const customUrl = computed(() => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  const m = props.exercise.customMedia;
  objectUrl = m && m.type.startsWith('image/') ? URL.createObjectURL(m) : '';
  return objectUrl;
});
const src = computed(() => customUrl.value || props.exercise.cachedImageUrl || props.exercise.gifUrl || '');
watch(src, () => (failed.value = false));
onBeforeUnmount(() => objectUrl && URL.revokeObjectURL(objectUrl));
</script>

<style scoped>
.thumb {
  display: flex;
  flex-shrink: 0;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #fff;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--surface-highest);
  border-radius: inherit;
  background: var(--surface-high);
  color: var(--text-secondary);
}
</style>
