<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-root" @keydown.esc="emit('close')">
        <div class="sheet-scrim" @click="emit('close')"></div>
        <section ref="panel" class="sheet-panel" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1">
          <span class="sheet-handle" aria-hidden="true"></span>
          <div class="sheet-head">
            <h2 class="sheet-title">{{ title }}</h2>
            <button type="button" class="sheet-close" aria-label="Close" @click="emit('close')">
              <LottieIcon name="close" :size="20" />
            </button>
          </div>
          <slot />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import LottieIcon from '@/components/LottieIcon.vue';

const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
const panel = ref<HTMLElement | null>(null);

// Move focus into the sheet so keyboard and screen-reader users land on it.
watch(() => props.open, async on => {
  if (!on) return;
  await nextTick();
  panel.value?.focus();
});
</script>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: flex-end;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
  background: rgba(5, 7, 4, 0.72);
}

.sheet-panel {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 92vh;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding: 12px 20px calc(28px + env(safe-area-inset-bottom, 0px));
  border-radius: 26px 26px 0 0;
  background: var(--surface);
  color: var(--text-primary);
  outline: none;
}

.sheet-handle {
  align-self: center;
  width: 40px;
  height: 5px;
  border-radius: 99px;
  background: var(--surface-highest);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
}

.sheet-close {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: var(--surface-high);
  color: var(--text-primary);
  cursor: pointer;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel {
    transition: none;
  }
}
</style>
