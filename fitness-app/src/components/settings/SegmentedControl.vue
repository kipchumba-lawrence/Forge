<template>
  <div class="seg" role="radiogroup" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="o.value === modelValue"
      :class="{ on: o.value === modelValue }"
      @click="emit('update:modelValue', o.value)"
    >{{ o.label }}</button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
defineProps<{ modelValue: T; options: { value: T; label: string }[]; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: T] }>();
</script>

<style scoped>
.seg {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 12px;
  background: var(--surface-high);
}

.seg button {
  flex: 1;
  padding: 9px 4px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}

.seg button.on {
  background: var(--bg-color);
  color: var(--text-primary);
  font-weight: 600;
}
</style>
