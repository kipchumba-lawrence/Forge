<template>
  <BottomSheet :open="open" :title="title" @close="emit('close')">
    <p v-if="hint" class="cp-lbl">{{ hint }}</p>
    <div class="options" role="radiogroup" :aria-label="title">
      <button
        v-for="o in options"
        :key="String(o.value)"
        type="button"
        role="radio"
        class="option"
        :class="{ on: o.value === modelValue }"
        :aria-checked="o.value === modelValue"
        @click="emit('update:modelValue', o.value); emit('close')"
      >
        <span class="text">
          <span class="label">{{ o.label }}</span>
          <span v-if="o.description" class="cp-lbl">{{ o.description }}</span>
        </span>
        <LottieIcon v-if="o.value === modelValue" name="check" :size="18" />
      </button>
    </div>
  </BottomSheet>
</template>

<script setup lang="ts" generic="T extends string | number | undefined">
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';

// A single-choice list in a sheet: progression rule, RIR, rest time…
defineProps<{ open: boolean; title: string; hint?: string; modelValue: T; options: { value: T; label: string; description?: string }[] }>();
const emit = defineEmits<{ close: []; 'update:modelValue': [value: T] }>();
</script>

<style scoped>
.options { display: flex; max-height: 60vh; flex-direction: column; overflow-y: auto; border-radius: 16px; background: var(--surface-high); }
.option {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border: 0;
  border-top: 1px solid var(--surface-highest);
  background: transparent;
  color: var(--primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.option:first-child { border-top: 0; }
.text { display: flex; flex-direction: column; gap: 3px; }
.label { color: var(--text-primary); font-size: 16px; }
.option.on .label { color: var(--primary); font-weight: 600; }
</style>
