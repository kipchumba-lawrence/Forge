<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <div>
            <h1 class="cp-h1">Exercises</h1>
            <p class="cp-sub">{{ subtitle }}</p>
          </div>
          <button type="button" class="by-muscle" @click="router.push('/exercises/muscles')">
            <LottieIcon name="person" :size="18" :draw="false" />By muscle
          </button>
        </header>

        <label class="search">
          <LottieIcon name="search" :size="20" :draw="false" />
          <span class="visually-hidden">Search exercises</span>
          <input v-model="query" type="search" placeholder="Search…" autocomplete="off" />
          <button v-if="query" type="button" class="clear" aria-label="Clear search" @click="query = ''">
            <LottieIcon name="close" :size="16" :draw="false" />
          </button>
        </label>

        <button
          type="button"
          class="muscle-toggle"
          :class="{ active: muscles.length }"
          :aria-expanded="mapOpen"
          aria-controls="muscle-filter"
          @click="mapOpen = !mapOpen"
        >
          <LottieIcon name="person" :size="18" :draw="false" />
          <span>{{ muscles.length ? `Muscles: ${muscles.map(labelOf).join(', ')}` : 'Filter by muscle' }}</span>
          <span class="toggle-chev" :class="{ open: mapOpen }"><LottieIcon name="chevronDown" :size="16" :draw="false" /></span>
        </button>
        <section v-show="mapOpen" id="muscle-filter" class="cp-card map-panel">
          <p class="cp-lbl">Tap muscles to show exercises that target them. Tap again to remove.</p>
          <MuscleMap
            label="Muscle filter: tap a muscle to toggle it"
            :selected="muscles"
            selectable
            @select="toggleMuscle"
          />
          <div v-if="muscles.length" class="picked-row">
            <button v-for="g in muscles" :key="g" type="button" class="picked-chip" :aria-label="`Remove ${labelOf(g)} filter`" @click="toggleMuscle(g)">
              {{ labelOf(g) }} <LottieIcon name="close" :size="12" :draw="false" />
            </button>
            <button type="button" class="cp-link" @click="muscles = []">Clear</button>
          </div>
        </section>

        <div class="chips" role="radiogroup" aria-label="Body part">
          <button type="button" role="radio" class="chip" :class="{ on: !bodyPart && !favouritesOnly }" :aria-checked="!bodyPart && !favouritesOnly" @click="bodyPart = null; favouritesOnly = false">All</button>
          <button type="button" role="radio" class="chip fav" :class="{ on: favouritesOnly }" :aria-checked="favouritesOnly" @click="favouritesOnly = !favouritesOnly; bodyPart = null">
            <LottiePlayer name="heartBurst" mode="toggle" :active="favouritesOnly" :size="16" />Favourites
          </button>
          <button v-for="b in bodyParts" :key="b.value" type="button" role="radio" class="chip" :class="{ on: bodyPart === b.value }" :aria-checked="bodyPart === b.value" @click="bodyPart = bodyPart === b.value ? null : b.value; favouritesOnly = false">{{ b.value }}</button>
        </div>
        <div class="chips" role="radiogroup" aria-label="Equipment">
          <button type="button" role="radio" class="chip" :class="{ on: !equipment }" :aria-checked="!equipment" @click="equipment = null">Any equipment</button>
          <button v-for="e in equipments" :key="e.value" type="button" role="radio" class="chip" :class="{ on: equipment === e.value }" :aria-checked="equipment === e.value" @click="equipment = equipment === e.value ? null : e.value">{{ e.value }}</button>
        </div>

        <button type="button" class="cp-card cp-row create" @click="createOpen = true">
          <span class="create-icon"><LottieIcon name="plus" :size="22" /></span>
          <span class="create-text">
            <span class="create-title">Create your own exercise</span>
            <span class="cp-lbl">Name, muscle, and a photo or video</span>
          </span>
        </button>

        <!-- First download / refresh -->
        <section v-if="syncing && !catalog.length" class="state">
          <LottiePlayer name="liftLoader" :size="72" label="Loading the exercise library" />
          <p>Downloading the exercise library{{ syncProgress ? ` · ${syncProgress.done} of ${syncProgress.total}` : '…' }}</p>
        </section>
        <p v-else-if="syncing" class="cp-lbl syncing" role="status">
          <LottiePlayer name="liftLoader" :size="20" />Updating library{{ syncProgress ? ` · ${syncProgress.done}/${syncProgress.total}` : '' }}
        </p>

        <section v-if="syncError" class="cp-card error-card" role="alert">
          <p>{{ syncError }}</p>
          <button type="button" class="cp-link" @click="syncCatalog(true)">
            <LottieIcon name="refresh" :size="16" :draw="false" />Try again
          </button>
        </section>

        <!-- Results -->
        <div v-if="results.length" class="list">
          <div v-for="ex in visible" :key="ex.exerciseDbId" class="cp-card cp-row row">
            <button type="button" class="row-main" @click="router.push(`/exercise/${ex.exerciseDbId}`)">
              <ExerciseThumb :exercise="ex" />
              <span class="row-text">
                <span class="row-name">{{ ex.name }}<span v-if="ex.isFavorite" class="fav-dot" aria-label="Favourite"> ♥</span></span>
                <span class="cp-lbl cap">{{ groupLabel(ex) }} · {{ ex.equipment }}</span>
              </span>
            </button>
            <span v-if="lastWeights.get(ex.exerciseDbId)" class="weight" :aria-label="`Last top set ${lastWeights.get(ex.exerciseDbId)} kilograms`">{{ lastWeights.get(ex.exerciseDbId) }}</span>
            <button type="button" class="plan-btn" :aria-label="`Add ${ex.name} to a routine`" @click="planFor = ex">
              <LottieIcon name="plus" :size="16" :draw="false" />Plan
            </button>
          </div>
          <button v-if="results.length > visible.length" type="button" class="more" @click="limit += 60">
            Show more ({{ results.length - visible.length }} left)
          </button>
        </div>

        <section v-else-if="!syncing || catalog.length" class="state">
          <LottiePlayer name="searchSweep" :size="72" />
          <p v-if="catalog.length">No exercises match{{ query ? ` “${query}”` : '' }}.</p>
          <p v-else>The exercise library isn't downloaded yet.</p>
          <button v-if="query || bodyPart || equipment || favouritesOnly || muscles.length" type="button" class="cp-link" @click="resetFilters">Clear filters</button>
          <button v-else-if="!catalog.length" type="button" class="cp-link" @click="syncCatalog(true)">Download now</button>
        </section>
      </main>
    </ion-content>

    <AddToRoutineSheet :open="planFor !== null" :exercise="planFor" @close="planFor = null" />
    <CreateExerciseSheet :open="createOpen" @close="createOpen = false" @created="ex => router.push(`/exercise/${ex.exerciseDbId}`)" />
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
import ExerciseThumb from '@/components/exercises/ExerciseThumb.vue';
import AddToRoutineSheet from '@/components/exercises/AddToRoutineSheet.vue';
import CreateExerciseSheet from '@/components/exercises/CreateExerciseSheet.vue';
import { useExerciseCatalog } from '@/data/useExerciseCatalog';
import { MUSCLE_GROUPS, groupsForExercise, type MuscleGroup } from '@/data/static/muscleGroups';
import MuscleMap from '@/components/MuscleMap.vue';
import type { Exercise } from '@/db/models/Exercise.model';

const router = useRouter();
const { catalog, lastWeights, syncing, syncProgress, syncError, bodyParts, equipments, load, syncCatalog, filter } = useExerciseCatalog();

const query = ref('');
const bodyPart = ref<string | null>(null);
const equipment = ref<string | null>(null);
const favouritesOnly = ref(false);
const limit = ref(60);
const planFor = ref<Exercise | null>(null);
const createOpen = ref(false);

const muscles = ref<MuscleGroup[]>([]);
const mapOpen = ref(false);
const labelOf = (g: MuscleGroup) => MUSCLE_GROUPS.find(m => m.id === g)?.label ?? g;
function toggleMuscle(g: MuscleGroup) {
  muscles.value = muscles.value.includes(g) ? muscles.value.filter(x => x !== g) : [...muscles.value, g];
}

const results = computed(() => filter({ query: query.value, bodyPart: bodyPart.value, equipment: equipment.value, favouritesOnly: favouritesOnly.value, muscles: muscles.value }));
// Long lists render in pages so a 1,000+ catalog stays smooth on a phone.
const visible = computed(() => results.value.slice(0, limit.value));
watch([query, bodyPart, equipment, favouritesOnly, muscles], () => (limit.value = 60));

const subtitle = computed(() => {
  const n = catalog.value.length;
  if (!n) return 'Exercise library';
  const fmt = new Intl.NumberFormat().format(n);
  return results.value.length === n ? `${fmt} exercises` : `${results.value.length} of ${fmt} exercises`;
});

function groupLabel(ex: Exercise) {
  const g = [...groupsForExercise(ex).primary][0];
  return MUSCLE_GROUPS.find(m => m.id === g)?.label ?? ex.target;
}

function resetFilters() {
  query.value = '';
  bodyPart.value = null;
  equipment.value = null;
  favouritesOnly.value = false;
  muscles.value = [];
}

onIonViewWillEnter(async () => {
  await load();
  syncCatalog();
});
</script>

<style scoped>
.head { justify-content: space-between; align-items: flex-start; }
.by-muscle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 14px;
  border: 0;
  border-radius: 12px;
  background: var(--primary-soft);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.search {
  display: flex;
  height: 50px;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text-secondary);
}
.search input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 17px;
  outline: none;
}
.search:focus-within { outline: 2px solid var(--primary); }
.clear { display: flex; padding: 6px; border: 0; background: none; color: var(--text-secondary); cursor: pointer; }

.muscle-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  text-align: left;
  cursor: pointer;
}
.muscle-toggle span:nth-child(2) { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.muscle-toggle.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
.toggle-chev { display: flex; transition: transform 0.2s ease; }
.toggle-chev.open { transform: rotate(180deg); }
.map-panel { display: flex; flex-direction: column; gap: 10px; }
.picked-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.picked-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 0;
  border-radius: 999px;
  background: var(--primary);
  color: var(--on-primary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.chips {
  display: flex;
  gap: 8px;
  margin: 0 -18px;
  padding: 0 18px;
  overflow-x: auto;
  scrollbar-width: none;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  text-transform: capitalize;
  white-space: nowrap;
  cursor: pointer;
}
.chip.on { background: var(--primary); color: var(--on-primary); font-weight: 600; }
.chip.fav { color: var(--danger); }
.chip.fav.on { background: var(--danger); color: #fff; }

.create {
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 16px;
  color: var(--text-primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.create-icon {
  display: flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--surface-high);
  color: var(--text-secondary);
}
.create-text { display: flex; flex-direction: column; gap: 2px; }
.create-title { font-size: 16px; }

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 12px;
  color: var(--text-secondary);
  text-align: center;
}
.state p { margin: 0; font-size: 15px; }
.syncing { display: flex; align-items: center; gap: 6px; }

.error-card { display: flex; flex-direction: column; gap: 8px; }
.error-card p { margin: 0; color: var(--danger); font-size: 14px; }

.list { display: flex; flex-direction: column; gap: 8px; }
.row { padding: 12px; border-radius: 16px; }
.row-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.row-text { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.row-name { overflow: hidden; font-size: 16px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.fav-dot { color: var(--danger); }
.cap { text-transform: capitalize; }
.weight {
  padding: 3px 8px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
}
.plan-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
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
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
