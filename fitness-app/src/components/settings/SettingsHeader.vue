<template>
  <header class="sh">
    <button type="button" class="back" @click="router.push(backTo)">
      <LottieIcon name="chevronLeft" :size="20" :draw="false" />{{ backLabel }}
    </button>
    <h1>{{ title }}</h1>
    <span></span>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import LottieIcon from '@/components/LottieIcon.vue';

withDefaults(defineProps<{ title: string; backTo?: string; backLabel?: string }>(), {
  backTo: '/settings',
  backLabel: 'Settings'
});
const router = useRouter();
</script>

<style scoped>
.sh {
  display: grid;
  height: 44px;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.back {
  display: flex;
  align-items: center;
  gap: 2px;
  justify-self: start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 16px;
  cursor: pointer;
}

h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}
</style>
