<template>
  <BottomSheet :open="open" :title="titles[mode]" @close="emit('close')">
    <p class="hint">{{ hints[mode] }}</p>

    <div class="stepper">
      <button type="button" class="round" aria-label="Decrease by 0.1 kilograms" @click="nudge(-0.1)">
        <LottieIcon name="minus" :size="22" :draw="false" />
      </button>
      <span class="value">
        <span class="num">{{ value.toFixed(1) }}</span>
        <span class="unit">kg</span>
      </span>
      <button type="button" class="round" aria-label="Increase by 0.1 kilograms" @click="nudge(0.1)">
        <LottieIcon name="plus" :size="22" :draw="false" />
      </button>
    </div>

    <div class="chips">
      <button v-for="d in [-1, -0.5, 0.5, 1]" :key="d" type="button" class="chip" @click="nudge(d)">
        {{ d > 0 ? '+' : '−' }}{{ Math.abs(d) }}
      </button>
    </div>

    <input
      v-model.number="value"
      class="slider"
      type="range"
      :min="range.min"
      :max="range.max"
      step="0.1"
      aria-label="Weight in kilograms"
      :style="{ '--fill': `${fillPct}%` }"
    />

    <button type="button" class="primary" :disabled="saving" @click="save">
      {{ mode === 'goal' ? 'Save goal' : mode === 'checkin' ? 'Save & start workout' : 'Save weight' }}
    </button>
    <button v-if="mode === 'checkin'" type="button" class="text-action" @click="skip">
      Start without weighing in
    </button>
    <button v-if="mode === 'goal' && hasGoal" type="button" class="text-action" @click="clearGoal">
      Remove goal
    </button>
  </BottomSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import { useBodyWeightData } from '@/data/useBodyWeightData';

// 'checkin' is the pre-workout prompt: it reports the weight (or null when
// skipped) through `checkin` so the caller can start the workout with it.
const props = defineProps<{ open: boolean; mode: 'weight' | 'goal' | 'checkin' }>();
const emit = defineEmits<{ close: []; saved: []; checkin: [weightKg: number | null] }>();

const titles = { weight: 'Log weight', goal: 'Goal weight', checkin: 'Quick check-in' };
const hints = {
  weight: 'Slide or tap to set your weight. Weighing in regularly keeps your curve honest.',
  goal: 'Where you want to land. Home shows how far you have to go.',
  checkin: 'Slide or tap to set your weight. We ask before every workout so your curve stays honest.'
};

const { entries, suggestedWeight, goal, logWeight, setGoal, load } = useBodyWeightData();
const value = ref(75);
const saving = ref(false);
const hasGoal = computed(() => goal.value != null);

// The slider spans ±10 kg around the starting value, so a drag moves in
// useful steps instead of across 40–200 kg.
const range = ref({ min: 65, max: 85 });
const fillPct = computed(() => ((value.value - range.value.min) / (range.value.max - range.value.min)) * 100);

watch(() => props.open, async on => {
  if (!on) return;
  // Opened from a screen that never loaded weigh-ins (e.g. the workout builder).
  if (!entries.value.length) await load();
  const start = props.mode === 'goal' ? goal.value ?? suggestedWeight.value - 2 : suggestedWeight.value;
  value.value = Math.round(start * 10) / 10;
  range.value = { min: Math.max(30, Math.floor(start - 10)), max: Math.ceil(start + 10) };
});

function nudge(delta: number) {
  value.value = Math.round(Math.min(300, Math.max(30, value.value + delta)) * 10) / 10;
  if (value.value < range.value.min) range.value.min = Math.floor(value.value);
  if (value.value > range.value.max) range.value.max = Math.ceil(value.value);
}

async function save() {
  saving.value = true;
  try {
    if (props.mode === 'goal') await setGoal(value.value);
    else if (props.mode === 'checkin') {
      const entry = await logWeight(value.value, { source: 'checkin' });
      emit('checkin', entry.weightKg);
    } else await logWeight(value.value);
    emit('saved');
    emit('close');
  } finally {
    saving.value = false;
  }
}

function skip() {
  emit('checkin', null);
  emit('close');
}

async function clearGoal() {
  await setGoal(null);
  emit('close');
}
</script>

<style scoped>
.hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.round {
  display: flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: var(--surface-high);
  color: var(--text-primary);
  cursor: pointer;
}

.value .num {
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.value .unit {
  margin-left: 4px;
  color: var(--text-secondary);
  font-size: 18px;
}

.chips {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.chip {
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}

.slider {
  width: 100%;
  height: 28px;
  margin: 0;
  background: transparent;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 99px;
  background: linear-gradient(to right, var(--primary) var(--fill), var(--surface-high) var(--fill));
}

.slider::-webkit-slider-thumb {
  width: 26px;
  height: 26px;
  margin-top: -10px;
  border-radius: 50%;
  background: var(--text-primary);
  -webkit-appearance: none;
}

.slider::-moz-range-track {
  height: 6px;
  border-radius: 99px;
  background: linear-gradient(to right, var(--primary) var(--fill), var(--surface-high) var(--fill));
}

.slider::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: var(--text-primary);
}

.primary {
  height: 52px;
  border: 0;
  border-radius: 14px;
  background: var(--primary);
  color: var(--on-primary);
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.6;
}

.text-action {
  padding: 8px;
  border: 0;
  background: transparent;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 16px;
  cursor: pointer;
}
</style>
