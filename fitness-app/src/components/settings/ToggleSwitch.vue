<template>
  <button
    type="button"
    role="switch"
    class="tog"
    :class="{ on: modelValue }"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="emit('update:modelValue', !modelValue)"
  >
    <i></i>
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<style scoped>
.tog {
  position: relative;
  width: 50px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--surface-highest);
  cursor: pointer;
  transition: background 0.2s ease;
}

.tog.on { background: var(--primary); }

.tog i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #F3EFE2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;
}

.tog.on i { transform: translateX(20px); }

@media (prefers-reduced-motion: reduce) {
  .tog, .tog i { transition: none; }
}
</style>
