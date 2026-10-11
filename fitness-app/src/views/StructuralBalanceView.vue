<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back to Stats" @click="router.push('/stats')">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <div class="head-text">
            <h1 class="cp-h1" style="font-size: 30px">Structural balance</h1>
            <p class="cp-sub">Compare your lifts against a published ratio table to find the weak link.</p>
          </div>
        </header>

        <SegmentedControl
          label="Ratio table"
          :model-value="settings.structuralBalanceTable"
          :options="tableOptions"
          @update:model-value="v => setSetting('structuralBalanceTable', v)"
        />

        <template v-if="result">
          <section v-if="result.table.empty" class="cp-card">
            <p class="cp-lbl">
              The {{ result.table.label }} ratios aren't filled in yet. They need numbers from the original source
              before Forge can score your lifts against them.
            </p>
          </section>

          <template v-else>
            <p v-if="!result.table.verified" class="cp-lbl small">
              Some of these ratios still need checking against the original {{ result.table.label }} material.
            </p>
            <section v-for="chain in chains" :key="chain.id" class="cp-list">
              <div v-for="r in chain.rows" :key="r.id" class="cp-li row">
                <div class="row-top">
                  <span class="cp-li-label lift">
                    {{ r.label }}<span v-if="r.anchor" class="anchor"> (anchor)</span>
                  </span>
                  <span class="status" :class="r.status">{{ statusLabel[r.status] }}</span>
                </div>
                <div class="row-mid">
                  <span class="pct cp-num">{{ r.actualPct ?? '–' }}% <span class="of">/ {{ r.expectedPct }}%</span></span>
                  <span v-if="r.e1rm" class="cp-lbl">est. 1RM {{ r.e1rm }} kg</span>
                </div>
                <div class="row-bottom">
                  <span class="cp-lbl ex">{{ r.exerciseName }}</span>
                  <button type="button" class="cp-link small-link" @click="openPicker(r.id, r.label)">Change exercise</button>
                </div>
              </div>
            </section>
            <p class="cp-lbl small">
              Each lift's best estimated 1RM, as a percentage of its anchor. Within 5% of the target counts as balanced.
              Dips and pull-ups add your body weight to the load.
            </p>
          </template>
        </template>
      </main>
    </ion-content>

    <BottomSheet :open="picker !== null" :title="picker ? `Exercise for ${picker.label}` : ''" @close="picker = null">
      <label class="search">
        <LottieIcon name="search" :size="18" :draw="false" />
        <input v-model="query" type="search" placeholder="Search exercises" aria-label="Search exercises" />
      </label>
      <div class="options">
        <button
          v-for="o in filteredOptions"
          :key="o.id"
          type="button"
          class="option"
          @click="choose(o.id)"
        >
          <span>{{ o.name }}</span>
          <span v-if="o.logged" class="cp-lbl">logged</span>
        </button>
        <p v-if="!filteredOptions.length" class="cp-lbl empty">No matching exercises.</p>
      </div>
      <button v-if="picker && settings.structuralBalanceExercises[picker.id]" type="button" class="text-btn" @click="choose(null)">
        Use the default exercise
      </button>
    </BottomSheet>

    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import { db } from '@/db/AppDatabase';
import { useMuscleAnalytics } from '@/data/useMuscleAnalytics';
import { useSettings } from '@/data/useSettings';
import type { RatioTableId } from '@/data/static/structuralBalance';

const router = useRouter();
const { settings, setSetting } = useSettings();
const { structuralBalance } = useMuscleAnalytics();

const tableOptions: { value: RatioTableId; label: string }[] = [
  { value: 'poliquin', label: 'Poliquin' }, { value: 'thibaudeau', label: 'Thibaudeau' }, { value: 'atg', label: 'ATG' }
];
const statusLabel = { noData: 'No data', notScored: 'Not scored', balanced: 'Balanced', weak: 'Weak', strong: 'Strong' } as const;

const result = ref<Awaited<ReturnType<typeof structuralBalance>> | null>(null);
async function load() {
  result.value = await structuralBalance(settings.structuralBalanceTable);
}
watch(() => [settings.structuralBalanceTable, settings.structuralBalanceExercises], load, { deep: true });

const chains = computed(() => {
  const rows = result.value?.rows ?? [];
  const ids = [...new Set(rows.map(r => r.chain))];
  return ids.map(id => ({ id, rows: rows.filter(r => r.chain === id) }));
});

// ---- Change exercise ----
const picker = ref<{ id: string; label: string } | null>(null);
const query = ref('');
const options = ref<{ id: string; name: string; logged: boolean }[]>([]);

async function openPicker(id: string, label: string) {
  query.value = '';
  picker.value = { id, label };
  // Logged exercises first (they have data to score), then the catalog.
  const map = new Map<string, { id: string; name: string; logged: boolean }>();
  for (const s of await db.workoutSessions.where('status').equals('completed').toArray()) {
    for (const e of s.exercises) map.set(e.exerciseDbId, { id: e.exerciseDbId, name: e.name, logged: true });
  }
  for (const e of await db.exercises.toArray()) {
    if (!map.has(e.exerciseDbId)) map.set(e.exerciseDbId, { id: e.exerciseDbId, name: e.name, logged: false });
  }
  options.value = [...map.values()].sort((a, b) => Number(b.logged) - Number(a.logged) || a.name.localeCompare(b.name));
}

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase();
  return (q ? options.value.filter(o => o.name.toLowerCase().includes(q)) : options.value).slice(0, 100);
});

async function choose(exerciseDbId: string | null) {
  if (!picker.value) return;
  const next = { ...settings.structuralBalanceExercises };
  if (exerciseDbId) next[picker.value.id] = exerciseDbId;
  else delete next[picker.value.id];
  await setSetting('structuralBalanceExercises', next);
  picker.value = null;
}

onIonViewWillEnter(load);
</script>

<style scoped>
.head { align-items: flex-start; gap: 14px; }
.head-text { min-width: 0; flex: 1; }
.small { font-size: 12px; line-height: 1.45; }

.row { flex-direction: column; align-items: stretch; gap: 6px; }
.row-top, .row-mid, .row-bottom { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.lift { font-weight: 600; }
.anchor { color: var(--text-secondary); font-weight: 400; }
.pct { font-size: 20px; }
.of { color: var(--text-secondary); font-family: var(--font-body); font-size: 14px; font-weight: 400; }
.ex { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.small-link { flex-shrink: 0; font-size: 14px; }

.status {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--surface-high);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.status.balanced { background: var(--primary-soft); color: var(--primary); }
.status.weak { background: rgba(var(--warning-rgb), 0.16); color: var(--warning); }
.status.strong { background: rgba(var(--secondary-rgb), 0.16); color: var(--secondary); }

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
.search input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 16px;
  outline: none;
}
.options {
  display: flex;
  max-height: 50vh;
  flex-direction: column;
  overflow-y: auto;
  border-radius: 16px;
  background: var(--surface-high);
}
.option {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 16px;
  border: 0;
  border-top: 1px solid var(--surface-highest);
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  text-align: left;
  cursor: pointer;
}
.option:first-child { border-top: 0; }
.empty { padding: 14px 16px; }
.text-btn {
  padding: 8px;
  border: 0;
  background: none;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 16px;
  cursor: pointer;
}
</style>
