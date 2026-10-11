<template>
  <BottomSheet :open="open" title="Add exercise" @close="emit('close')">
    <label class="search">
      <LottieIcon name="search" :size="18" :draw="false" />
      <input v-model="query" type="search" placeholder="Search exercises" aria-label="Search exercises" />
    </label>
    <button type="button" class="map-toggle" :aria-expanded="mapOpen" @click="mapOpen = !mapOpen">
      <LottieIcon name="person" :size="16" :draw="false" />
      {{ muscles.length ? `Muscles: ${muscles.map(labelOf).join(', ')}` : 'Filter by muscle' }}
    </button>
    <MuscleMap v-if="mapOpen" compact label="Muscle filter" :selected="muscles" selectable @select="toggleMuscle" />

    <div class="results">
      <button v-for="ex in visible" :key="ex.exerciseDbId" type="button" class="result" @click="choose(ex)">
        <ExerciseThumb :exercise="ex" :size="44" />
        <span class="text">
          <span class="name">{{ ex.name }}</span>
          <span class="cp-lbl cap">{{ ex.target }} · {{ ex.equipment }}</span>
        </span>
        <LottieIcon name="plus" :size="18" :draw="false" />
      </button>
      <div v-if="!results.length" class="empty">
        <LottiePlayer name="searchSweep" :size="56" />
        <p class="cp-lbl">{{ catalog.length ? 'No matching exercises.' : 'Open the Exercises tab once to download the library.' }}</p>
      </div>
    </div>
  </BottomSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import MuscleMap from '@/components/MuscleMap.vue';
import ExerciseThumb from '@/components/exercises/ExerciseThumb.vue';
import { useExerciseCatalog } from '@/data/useExerciseCatalog';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/data/static/muscleGroups';
import type { Exercise } from '@/db/models/Exercise.model';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; pick: [exercise: Exercise] }>();
const { catalog, filter, load } = useExerciseCatalog();

const query = ref('');
const muscles = ref<MuscleGroup[]>([]);
const mapOpen = ref(false);
const labelOf = (g: MuscleGroup) => MUSCLE_GROUPS.find(m => m.id === g)?.label ?? g;
const toggleMuscle = (g: MuscleGroup) => (muscles.value = muscles.value.includes(g) ? muscles.value.filter(x => x !== g) : [...muscles.value, g]);

const results = computed(() => filter({ query: query.value, muscles: muscles.value }));
const visible = computed(() => results.value.slice(0, 60));

watch(() => props.open, on => {
  if (!on) return;
  query.value = '';
  if (!catalog.value.length) load();
});

function choose(ex: Exercise) {
  emit('pick', ex);
  emit('close');
}
</script>

<style scoped>
.search {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--surface-high);
  color: var(--text-secondary);
}
.search input { min-width: 0; flex: 1; border: 0; background: none; color: var(--text-primary); font-family: inherit; font-size: 16px; outline: none; }
.map-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.results { display: flex; max-height: 46vh; flex-direction: column; gap: 6px; overflow-y: auto; }
.result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 0;
  border-radius: 14px;
  background: var(--surface-high);
  color: var(--primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.text { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.name { overflow: hidden; color: var(--text-primary); font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.cap { text-transform: capitalize; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; text-align: center; }
</style>
