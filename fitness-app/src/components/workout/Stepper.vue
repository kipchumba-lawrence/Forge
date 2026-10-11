<template>
  <div class="stepper" :class="{ done, long: display.length > 4 }">
    <button type="button" :aria-label="`Decrease ${label}`" :disabled="done" @click="emit('update:modelValue', clamp(modelValue - step))">−</button>
    <input
      :value="display"
      type="text"
      inputmode="decimal"
      :aria-label="label"
      :disabled="done"
      @focus="($event.target as HTMLInputElement).select()"
      @change="onType"
    />
    <button type="button" :aria-label="`Increase ${label}`" :disabled="done" @click="emit('update:modelValue', clamp(modelValue + step))">+</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// − value + control used for weight and reps; the number can also be typed.
const props = withDefaults(defineProps<{ modelValue: number; step: number; label: string; min?: number; max?: number; done?: boolean }>(), { min: 0, max: 9999, done: false });
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const clamp = (v: number) => Math.min(props.max, Math.max(props.min, Math.round(v * 100) / 100));
const display = computed(() => String(props.modelValue));

function onType(e: Event) {
  const input = e.target as HTMLInputElement;
  const v = parseFloat(input.value.replace(',', '.'));
  if (Number.isFinite(v)) emit('update:modelValue', clamp(v));
  else input.value = display.value;
}
</script>

<style scoped>
.stepper {
  display: flex;
  height: 44px;
  min-width: 0;
  flex: 1;
  align-items: center;
  border-radius: 10px;
  background: var(--surface-high);
}
.stepper button {
  width: 26px;
  height: 100%;
  flex-shrink: 0;
  border: 0;
  background: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
}
.stepper input {
  min-width: 0;
  width: 100%;
  flex: 1;
  border: 0;
  background: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.stepper input:focus { outline: 2px solid var(--primary); border-radius: 6px; }
.stepper.long input { font-size: 14px; }
.stepper.done { opacity: 0.75; }
.stepper.done button { display: none; }
</style>
