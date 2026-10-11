<template>
  <figure class="muscle-map" :class="{ compact }">
    <svg viewBox="0 0 216 224" role="group" :aria-label="label">
      <g v-for="side in SIDES" :key="side.id" :transform="side.id === 'front' ? 'translate(4,0)' : 'translate(112,0)'">
        <!-- Non-muscle silhouette: head, neck, hands, pelvis, knees, feet -->
        <g class="body">
          <circle cx="50" cy="15" r="10.5" />
          <path d="M45 25h10v8H45z" />
          <path d="M36 92c6 6 22 6 28 0l-2 13H38z" />
          <template v-for="m in [false, true]" :key="String(m)">
            <g :transform="m ? 'translate(100,0) scale(-1,1)' : undefined">
              <ellipse cx="20.5" cy="110" rx="3.5" ry="5" />
              <path d="M35 151h11l-1 5H36z" />
              <ellipse cx="40" cy="203" rx="6" ry="4" />
            </g>
          </template>
        </g>

        <!-- Muscles -->
        <template v-for="region in side.regions" :key="region.group + region.d">
          <template v-for="m in (region.mirror ? [false, true] : [false])" :key="String(m)">
            <path
              :d="region.d"
              :transform="m ? 'translate(100,0) scale(-1,1)' : undefined"
              class="muscle"
              :class="[stateOf(region.group), { picked: isPicked(region.group), pickable: selectable }]"
              :style="styleOf(region.group)"
              :tabindex="selectable && !m && region.focus ? 0 : undefined"
              :role="selectable && !m && region.focus ? 'button' : undefined"
              :aria-label="selectable && !m && region.focus ? labelOf(region.group) : undefined"
              :aria-pressed="selectable && !m && region.focus ? isPicked(region.group) : undefined"
              @click="pick(region.group)"
              @keydown.enter.prevent="pick(region.group)"
              @keydown.space.prevent="pick(region.group)"
            >
              <title>{{ titleOf(region.group) }}</title>
            </path>
          </template>
        </template>
      </g>
      <text x="54" y="221" class="cap" text-anchor="middle">Front</text>
      <text x="162" y="221" class="cap" text-anchor="middle">Back</text>
    </svg>

    <figcaption v-if="legend && (primary?.length || secondary?.length)" class="legend">
      <span v-if="primary?.length"><i class="dot primary"></i>{{ primary.map(labelOf).join(', ') }}</span>
      <span v-if="secondary?.length"><i class="dot secondary"></i>{{ secondary.map(labelOf).join(', ') }}</span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { MUSCLE_GROUPS, type MuscleGroup } from '@/data/static/muscleGroups';

// Stylised anatomical figure, front and back, on a 100×210 grid per side.
// Bilateral muscles are drawn on the viewer's left and mirrored. `focus`
// marks the one copy per group that takes keyboard focus when selectable.
interface Region { group: MuscleGroup; d: string; mirror?: boolean; focus?: boolean }

const DELT = 'M36 37C27 37 22 44 23 54c4-2 8-4 11-7 1-4 2-7 2-10z';
const UPPER_ARM = 'M23 55c-2 7-3 15-2 22 3 1 6 0 8-2 1-7 2-14 3-21-4 0-7 0-9 1z';
const FOREARM = 'M21 79c-2 9-3 18-3 25 3 1 5 1 7 0 2-8 3-16 4-26-3 1-6 1-8 1z';

const FRONT: Region[] = [
  { group: 'traps', d: 'M44 31l-8 6 10-1z', mirror: true, focus: true },
  { group: 'shoulders', d: DELT, mirror: true, focus: true },
  { group: 'chest', d: 'M36 39c5-2 11-2 13 0v17c-6 3-13 2-17-3 0-6 1-11 4-14z', mirror: true, focus: true },
  { group: 'serratus', d: 'M32 54c0 2 0 4 1 5l3 1-1-4z', mirror: true, focus: true },
  { group: 'biceps', d: UPPER_ARM, mirror: true, focus: true },
  { group: 'forearms', d: FOREARM, mirror: true, focus: true },
  { group: 'abs', d: 'M42 58c4 2 12 2 16 0l-1 34c-3 4-11 4-14 0z', focus: true },
  { group: 'abs', d: 'M33 58c3 3 6 4 9 4v28c-4-2-7-6-8-10-1-8-1-15-1-22z', mirror: true },
  { group: 'quads', d: 'M36 105c-3 14-3 30-1 45 3 2 7 2 10 0 2-14 3-30 3-44-4-2-8-3-12-1z', mirror: true, focus: true },
  { group: 'adductors', d: 'M48 107c1 10 1 20 0 28-2-4-3-14-3-26z', mirror: true, focus: true },
  { group: 'calves', d: 'M36 157c-2 12-2 26 0 40 3 1 5 1 7 0 2-14 2-28 1-40-3-2-6-2-8 0z', mirror: true, focus: true }
];

const BACK: Region[] = [
  { group: 'traps', d: 'M50 28l12 10-12 24-12-24z', focus: true },
  { group: 'shoulders', d: DELT, mirror: true, focus: true },
  { group: 'upperBack', d: 'M37 40c5 2 9 10 12 22v14c-5-2-10-6-14-12-2-8-1-17 2-24z', mirror: true, focus: true },
  { group: 'lowerBack', d: 'M43 76c3 2 11 2 14 0l1 16c-4 2-12 2-16 0z', focus: true },
  { group: 'triceps', d: UPPER_ARM, mirror: true, focus: true },
  { group: 'forearms', d: FOREARM, mirror: true },
  { group: 'glutes', d: 'M37 92c5 0 11 2 12 6v12c-5 3-11 2-14-2-1-6 0-12 2-16z', mirror: true, focus: true },
  { group: 'hamstrings', d: 'M36 112c-2 12-2 26 0 38 3 2 7 2 10 0 1-12 2-26 2-38-4 1-8 1-12 0z', mirror: true, focus: true },
  { group: 'calves', d: 'M35 157c-2 10-1 22 1 34 3 1 6 1 8 0 2-12 2-24 0-34-3-2-6-2-9 0z', mirror: true }
];

const SIDES = [{ id: 'front', regions: FRONT }, { id: 'back', regions: BACK }];

const props = withDefaults(defineProps<{
  label: string;
  primary?: MuscleGroup[];          // full colour
  secondary?: MuscleGroup[];        // lighter
  intensity?: Partial<Record<MuscleGroup, number>>;  // heat by value (e.g. sets)
  selected?: MuscleGroup[];         // outlined, for filters
  selectable?: boolean;
  legend?: boolean;
  compact?: boolean;
}>(), { primary: () => [], secondary: () => [], intensity: undefined, selected: () => [], selectable: false, legend: false, compact: false });

const emit = defineEmits<{ select: [group: MuscleGroup] }>();

const labelOf = (g: MuscleGroup) => MUSCLE_GROUPS.find(m => m.id === g)?.label ?? g;
const isPicked = (g: MuscleGroup) => props.selected.includes(g);

function stateOf(g: MuscleGroup) {
  if (props.intensity) return (props.intensity[g] ?? 0) > 0 ? 'heat' : 'off';
  if (props.primary.includes(g)) return 'primary';
  if (props.secondary.includes(g)) return 'secondary';
  if (props.selected.length) return isPicked(g) ? 'primary' : 'off';
  return 'off';
}

// Heat mode: opacity 0.35–1 by share of the largest value.
function styleOf(g: MuscleGroup) {
  if (!props.intensity) return undefined;
  const v = props.intensity[g] ?? 0;
  if (v <= 0) return undefined;
  const max = Math.max(...Object.values(props.intensity).map(x => x ?? 0));
  return { opacity: 0.35 + 0.65 * (v / max) };
}

function titleOf(g: MuscleGroup) {
  if (props.intensity) return `${labelOf(g)}: ${Math.round((props.intensity[g] ?? 0) * 10) / 10}`;
  const state = stateOf(g);
  return state === 'primary' ? `${labelOf(g)} (primary)` : state === 'secondary' ? `${labelOf(g)} (secondary)` : labelOf(g);
}

function pick(g: MuscleGroup) {
  if (props.selectable) emit('select', g);
}
</script>

<style scoped>
.muscle-map { margin: 0; }
svg { display: block; width: 100%; max-width: 340px; height: auto; margin: 0 auto; }
.compact svg { max-width: 220px; }

.body { fill: var(--surface-high); }
.muscle {
  /* Neutral (not green-tinted) when inactive, so a faded accent still stands out. */
  fill: color-mix(in srgb, var(--surface-highest) 80%, #8a8a8a);
  stroke: var(--surface);
  stroke-width: 0.6;
  transition: fill 0.2s ease, opacity 0.2s ease;
}
.muscle.primary, .muscle.heat { fill: var(--primary); }
.muscle.secondary { fill: var(--primary); opacity: 0.55; }
.muscle.pickable { cursor: pointer; }
.muscle.pickable:hover { opacity: 0.85; }
.muscle.picked { stroke: var(--text-primary); stroke-width: 1.4; }
.muscle:focus-visible { outline: none; stroke: var(--text-primary); stroke-width: 2; }

.cap { fill: var(--text-secondary); font-family: var(--font-body); font-size: 9px; }

.legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}
.legend span { display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; }
.dot { width: 10px; height: 10px; flex-shrink: 0; margin-top: 4px; border-radius: 3px; background: var(--primary); }
.dot.secondary { opacity: 0.55; }

@media (prefers-reduced-motion: reduce) { .muscle { transition: none; } }
</style>
