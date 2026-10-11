<template>
  <BottomSheet :open="open" title="Add to a routine" @close="close">
    <div v-if="added" class="done" role="status">
      <LottiePlayer name="successCheck" mode="once" :size="72" />
      <p>Added {{ exercise?.name }} to <strong>{{ added }}</strong>.</p>
    </div>

    <template v-else>
      <p class="cp-lbl">Adds 3 × 10{{ lastWeight ? ` at ${lastWeight} kg` : '' }}. You can change sets later in the routine.</p>
      <div v-if="templates.length" class="options">
        <button v-for="t in templates" :key="t.id" type="button" class="option" :disabled="busy" @click="add({ templateId: t.id! }, t.name)">
          <span>
            <span class="name">{{ t.name }}</span>
            <span class="cp-lbl">{{ t.exercises.length }} exercise{{ t.exercises.length === 1 ? '' : 's' }}</span>
          </span>
          <LottieIcon name="plus" :size="18" :draw="false" />
        </button>
      </div>
      <p v-else class="cp-lbl">You don't have any routines yet. Start one with this exercise:</p>
      <form class="new" @submit.prevent="newName.trim() && add({ newName }, newName.trim())">
        <input v-model="newName" type="text" placeholder="New routine name, e.g. Push Day" aria-label="New routine name" />
        <button type="submit" class="cp-pill-btn" :disabled="!newName.trim() || busy">Create</button>
      </form>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import type { Exercise } from '@/db/models/Exercise.model';
import { useExerciseCatalog } from '@/data/useExerciseCatalog';
import { useWorkoutTemplates } from '@/data/useWorkoutTemplates';

const props = defineProps<{ open: boolean; exercise: Exercise | null }>();
const emit = defineEmits<{ close: [] }>();

const { addToRoutine, lastWeights } = useExerciseCatalog();
const { templates, loadTemplates } = useWorkoutTemplates();

const newName = ref('');
const added = ref('');
const busy = ref(false);
const error = ref<string | null>(null);
const lastWeight = computed(() => (props.exercise ? lastWeights.value.get(props.exercise.exerciseDbId) : undefined));
let closeTimer: ReturnType<typeof setTimeout> | undefined;

watch(() => props.open, on => {
  if (!on) return;
  newName.value = '';
  added.value = '';
  error.value = null;
  loadTemplates();
});

async function add(target: { templateId: number } | { newName: string }, label: string) {
  if (!props.exercise) return;
  busy.value = true;
  error.value = null;
  try {
    await addToRoutine(props.exercise, target);
    added.value = label;
    loadTemplates();
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 1600);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

function close() {
  clearTimeout(closeTimer);
  emit('close');
}
</script>

<style scoped>
.done { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 0 6px; color: var(--primary); text-align: center; }
.done p { margin: 0; color: var(--text-primary); font-size: 16px; }
.options { display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; background: var(--surface-high); }
.option {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 16px;
  border: 0;
  border-top: 1px solid var(--surface-highest);
  background: transparent;
  color: var(--primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.option:first-child { border-top: 0; }
.option > span { display: flex; flex-direction: column; gap: 2px; }
.name { color: var(--text-primary); font-size: 16px; }
.new { display: flex; gap: 8px; }
.new input {
  min-width: 0;
  height: 44px;
  flex: 1;
  padding: 0 12px;
  border: 1px solid var(--surface-highest);
  border-radius: 12px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
}
.error { margin: 0; color: var(--danger); font-size: 14px; }
</style>
