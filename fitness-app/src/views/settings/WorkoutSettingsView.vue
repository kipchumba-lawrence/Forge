<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <SettingsHeader title="Workout" />

        <p class="cp-sec">Rest</p>
        <div class="cp-list">
          <button type="button" class="cp-li" @click="picker = 'rest'">
            <SettingsTile icon="timer" color="#4F7A3A" />
            <span class="cp-li-label">Rest timer</span>
            <span class="cp-li-value">{{ formatRest(settings.restTimerSec) }}</span>
            <span class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
          </button>
          <button type="button" class="cp-li" @click="picker = 'restPause'">
            <SettingsTile icon="flame" color="#9A6A20" />
            <span class="cp-li-label">Rest-pause rest</span>
            <span class="cp-li-value">{{ settings.restPauseSec }}s</span>
            <span class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
          </button>
        </div>
        <p class="cp-lbl">Each exercise will be able to set its own rest too, in the routine's exercise settings.</p>

        <p class="cp-sec">Logging</p>
        <div class="cp-list">
          <div class="cp-li wrap">
            <SettingsTile icon="trend" color="#3E6E80" />
            <span class="cp-li-label">
              Effort per set
              <span class="cp-li-hint">RIR: reps left in the tank. RPE: effort out of 10.</span>
            </span>
            <SegmentedControl
              class="cp-li-full"
              label="Effort per set"
              :model-value="settings.effortScale"
              :options="effortOptions"
              @update:model-value="v => setSetting('effortScale', v)"
            />
          </div>
          <button type="button" class="cp-li" @click="picker = 'under'">
            <SettingsTile icon="history" color="#6A4A80" />
            <span class="cp-li-label">Shown under each exercise</span>
            <span class="cp-li-value">{{ underLabel }}</span>
            <span class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
          </button>
          <div class="cp-li wrap">
            <SettingsTile icon="folder" color="#3E5E8A" />
            <span class="cp-li-label">Layout</span>
            <SegmentedControl
              class="cp-li-full"
              label="Workout layout"
              :model-value="settings.workoutLayout"
              :options="layoutOptions"
              @update:model-value="v => setSetting('workoutLayout', v)"
            />
          </div>
        </div>

        <p class="cp-sec">Before and during</p>
        <div class="cp-list">
          <div class="cp-li top">
            <SettingsTile icon="scale" color="#4F7A3A" />
            <span class="cp-li-label">
              Weigh in before workouts
              <span class="cp-li-hint">Asks for your body weight when a workout starts.</span>
            </span>
            <ToggleSwitch
              label="Weigh in before workouts"
              :model-value="settings.weighInBeforeWorkout"
              @update:model-value="v => setSetting('weighInBeforeWorkout', v)"
            />
          </div>
          <div class="cp-li top">
            <SettingsTile icon="info" color="#5A6553" />
            <span class="cp-li-label">
              Keep screen awake
              <span class="cp-li-hint">The screen stays on while a workout is running.</span>
            </span>
            <ToggleSwitch
              label="Keep screen awake during workouts"
              :model-value="settings.keepScreenAwake"
              @update:model-value="v => setSetting('keepScreenAwake', v)"
            />
          </div>
          <div class="cp-li wrap">
            <SettingsTile icon="play" color="#9A4A40" />
            <span class="cp-li-label">Exercise animations</span>
            <SegmentedControl
              class="cp-li-full"
              label="Exercise animations"
              :model-value="settings.exerciseAnimations"
              :options="animationOptions"
              @update:model-value="v => setSetting('exerciseAnimations', v)"
            />
          </div>
        </div>
        <p class="cp-lbl">These apply in the redesigned workout screens.</p>
      </main>
    </ion-content>

    <BottomSheet :open="picker !== null" :title="pickerTitle" @close="picker = null">
      <div class="options" role="radiogroup" :aria-label="pickerTitle">
        <button
          v-for="o in pickerOptions"
          :key="o.value"
          type="button"
          role="radio"
          class="option"
          :class="{ on: o.value === pickerValue }"
          :aria-checked="o.value === pickerValue"
          @click="choose(o.value)"
        >
          <span>{{ o.label }}</span>
          <LottieIcon v-if="o.value === pickerValue" name="check" :size="18" />
        </button>
      </div>
    </BottomSheet>

    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonContent, IonPage } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import SettingsHeader from '@/components/settings/SettingsHeader.vue';
import SettingsTile from '@/components/settings/SettingsTile.vue';
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import ToggleSwitch from '@/components/settings/ToggleSwitch.vue';
import { useSettings } from '@/data/useSettings';
import type { AnimationSize, EffortScale, UnderExercise, WorkoutLayout } from '@/db/models/AppSetting.model';
import { formatRest } from '@/utils/format';

const { settings, setSetting } = useSettings();

const effortOptions: { value: EffortScale; label: string }[] = [
  { value: 'off', label: 'Off' }, { value: 'rir', label: 'RIR' }, { value: 'rpe', label: 'RPE' }
];
const layoutOptions: { value: WorkoutLayout; label: string }[] = [
  { value: 'cards', label: 'Cards' }, { value: 'list', label: 'List' }, { value: 'compact', label: 'Compact' }
];
const animationOptions: { value: AnimationSize; label: string }[] = [
  { value: 'full', label: 'Full' }, { value: 'small', label: 'Small' }, { value: 'hidden', label: 'Hidden' }
];
const underOptions: { value: UnderExercise; label: string }[] = [
  { value: 'lastTime', label: 'Last time' }, { value: 'best', label: 'Best set' }, { value: 'nothing', label: 'Nothing' }
];
const underLabel = computed(() => underOptions.find(o => o.value === settings.underExercise)?.label ?? '');

type Picker = 'rest' | 'restPause' | 'under';
const picker = ref<Picker | null>(null);

const REST_CHOICES = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const REST_PAUSE_CHOICES = [5, 10, 15, 20, 30, 45, 60];

const pickerTitle = computed(() =>
  picker.value === 'rest' ? 'Rest timer' : picker.value === 'restPause' ? 'Rest-pause rest' : 'Shown under each exercise'
);

const pickerOptions = computed<{ value: string; label: string }[]>(() => {
  if (picker.value === 'rest') return REST_CHOICES.map(s => ({ value: String(s), label: formatRest(s) }));
  if (picker.value === 'restPause') return REST_PAUSE_CHOICES.map(s => ({ value: String(s), label: `${s} seconds` }));
  return underOptions;
});

const pickerValue = computed(() =>
  picker.value === 'rest' ? String(settings.restTimerSec)
    : picker.value === 'restPause' ? String(settings.restPauseSec)
    : settings.underExercise
);

async function choose(value: string) {
  if (picker.value === 'rest') await setSetting('restTimerSec', Number(value));
  else if (picker.value === 'restPause') await setSetting('restPauseSec', Number(value));
  else await setSetting('underExercise', value as UnderExercise);
  picker.value = null;
}
</script>

<style scoped>
.cp-li.top { align-items: flex-start; }

.options {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 16px;
  background: var(--surface-high);
}

.option {
  display: flex;
  min-height: 50px;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border: 0;
  border-top: 1px solid var(--surface-highest);
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
  text-align: left;
  cursor: pointer;
}

.option:first-child { border-top: 0; }
.option.on { color: var(--primary); font-weight: 600; }
</style>
