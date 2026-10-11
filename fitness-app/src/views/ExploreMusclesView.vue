<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back to exercises" @click="router.push('/exercises')">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <div class="head-text">
            <h1 class="cp-h1" style="font-size: 30px">Explore muscles</h1>
            <p class="cp-sub">Choose a muscle to see exercises that train it.</p>
          </div>
        </header>

        <section class="cp-card">
          <MuscleMap
            :selected="selected ? [selected] : []"
            selectable
            :label="selected ? `${labelOf(selected)} selected` : 'Body diagram: tap a muscle'"
            @select="g => (selected = selected === g ? null : g)"
          />
        </section>

        <div class="grid" role="radiogroup" aria-label="Muscle">
          <button
            v-for="m in muscles"
            :key="m.group"
            type="button"
            role="radio"
            class="muscle"
            :class="{ on: selected === m.group }"
            :aria-checked="selected === m.group"
            :disabled="!m.count"
            @click="selected = selected === m.group ? null : m.group"
          >
            <span>{{ m.label }}</span>
            <span class="count">{{ m.count }}</span>
          </button>
        </div>

        <template v-if="selected">
          <div class="cp-row spread">
            <p class="cp-sec" style="margin: 0 4px">Exercises for {{ labelOf(selected) }}</p>
            <button type="button" class="cp-link" @click="selected = null">Clear selection</button>
          </div>
          <div class="list">
            <button
              v-for="item in visible"
              :key="item.exercise.exerciseDbId"
              type="button"
              class="cp-card cp-row row"
              @click="router.push(`/exercise/${item.exercise.exerciseDbId}`)"
            >
              <ExerciseThumb :exercise="item.exercise" />
              <span class="row-text">
                <span class="row-name">{{ item.exercise.name }}</span>
                <span class="cp-lbl cap">{{ item.role === 'primary' ? 'Primary target' : 'Also trains' }} · {{ matchedMuscle(item.exercise, item.role) }} · {{ item.exercise.equipment }}</span>
              </span>
              <span v-if="lastWeights.get(item.exercise.exerciseDbId)" class="weight">{{ lastWeights.get(item.exercise.exerciseDbId) }}</span>
            </button>
            <button v-if="list.length > visible.length" type="button" class="more" @click="limit += 40">Show more ({{ list.length - visible.length }} left)</button>
          </div>
        </template>

        <section v-else-if="!catalog.length" class="state">
          <LottiePlayer name="liftLoader" :size="64" />
          <p>The exercise library downloads from the Exercises tab.</p>
        </section>
      </main>
    </ion-content>
    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import MuscleMap from '@/components/MuscleMap.vue';
import ExerciseThumb from '@/components/exercises/ExerciseThumb.vue';
import { useExerciseCatalog } from '@/data/useExerciseCatalog';
import { MUSCLE_GROUPS, groupFor, groupsForExercise, type MuscleGroup } from '@/data/static/muscleGroups';
import type { Exercise } from '@/db/models/Exercise.model';

const router = useRouter();
const { catalog, lastWeights, load } = useExerciseCatalog();

const selected = ref<MuscleGroup | null>(null);
const limit = ref(40);
watch(selected, () => (limit.value = 40));

const labelOf = (g: MuscleGroup) => MUSCLE_GROUPS.find(m => m.id === g)?.label ?? g;

// The specific muscle that put this exercise under the selected group,
// e.g. "latissimus dorsi" for Upper back, rather than its first target.
function matchedMuscle(ex: Exercise, role: 'primary' | 'secondary') {
  const names = role === 'primary' ? (ex.targetMuscles?.length ? ex.targetMuscles : [ex.target]) : ex.secondaryMuscles ?? [];
  return names.find(n => groupFor(n) === selected.value) ?? ex.target;
}

// Exercises per group (primary or secondary), computed once per catalog load.
const byGroup = computed(() => {
  const map = new Map<MuscleGroup, { exercise: Exercise; role: 'primary' | 'secondary' }[]>();
  for (const ex of catalog.value) {
    const { primary, secondary } = groupsForExercise(ex);
    primary.forEach(g => (map.get(g) ?? map.set(g, []).get(g)!).push({ exercise: ex, role: 'primary' }));
    secondary.forEach(g => (map.get(g) ?? map.set(g, []).get(g)!).push({ exercise: ex, role: 'secondary' }));
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.role === b.role ? a.exercise.name.localeCompare(b.exercise.name) : a.role === 'primary' ? -1 : 1));
  }
  return map;
});

const muscles = computed(() =>
  MUSCLE_GROUPS.filter(m => !['neck', 'hipFlexors'].includes(m.id)).map(m => ({ group: m.id, label: m.label, count: byGroup.value.get(m.id)?.length ?? 0 }))
);
const list = computed(() => (selected.value ? byGroup.value.get(selected.value) ?? [] : []));
const visible = computed(() => list.value.slice(0, limit.value));

onIonViewWillEnter(load);
</script>

<style scoped>
.head { align-items: flex-start; gap: 14px; }
.head-text { min-width: 0; flex: 1; }
.spread { justify-content: space-between; }

.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.muscle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  cursor: pointer;
}
.muscle.on { background: var(--primary); color: var(--on-primary); font-weight: 600; }
.muscle:disabled { opacity: 0.45; cursor: default; }
.count { color: inherit; opacity: 0.7; font-variant-numeric: tabular-nums; }

.list { display: flex; flex-direction: column; gap: 8px; }
.row {
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 16px;
  color: var(--text-primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.row-text { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.row-name { overflow: hidden; font-size: 16px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.cap { text-transform: capitalize; }
.weight {
  padding: 3px 8px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
}
.more {
  padding: 12px;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 15px;
  cursor: pointer;
}
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px 12px;
  color: var(--text-secondary);
  text-align: center;
}
.state p { margin: 0; }
</style>
