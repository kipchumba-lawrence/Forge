<template>
  <BottomSheet :open="open" title="Create an exercise" @close="emit('close')">
    <label class="field">
      <span class="cp-lbl">Name</span>
      <input v-model="name" type="text" placeholder="e.g. Landmine Press" />
    </label>

    <div class="field">
      <span class="cp-lbl">Main muscle</span>
      <div class="chips" role="radiogroup" aria-label="Main muscle">
        <button v-for="g in groups" :key="g.id" type="button" role="radio" class="chip" :class="{ on: group === g.id }" :aria-checked="group === g.id" @click="group = g.id">{{ g.label }}</button>
      </div>
    </div>

    <div class="field">
      <span class="cp-lbl">Equipment</span>
      <div class="chips" role="radiogroup" aria-label="Equipment">
        <button v-for="e in equipmentOptions" :key="e" type="button" role="radio" class="chip" :class="{ on: equipment === e }" :aria-checked="equipment === e" @click="equipment = e">{{ e }}</button>
      </div>
    </div>

    <div class="field">
      <span class="cp-lbl">Photo or video (optional)</span>
      <div class="cp-row media">
        <img v-if="previewUrl && media?.type.startsWith('image/')" :src="previewUrl" class="preview" alt="" />
        <video v-else-if="previewUrl" :src="previewUrl" class="preview" muted playsinline></video>
        <button type="button" class="pick" @click="fileInput?.click()">
          <LottieIcon name="camera" :size="18" :draw="false" />{{ media ? 'Change' : 'Add photo or video' }}
        </button>
        <button v-if="media" type="button" class="pick ghost" @click="setMedia(null)">Remove</button>
      </div>
      <input ref="fileInput" type="file" accept="image/*,video/*" class="hidden" @change="onFile" />
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <button type="button" class="cp-primary" :disabled="!name.trim() || saving" @click="save">Save exercise</button>
  </BottomSheet>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/data/static/muscleGroups';
import { useExerciseCatalog } from '@/data/useExerciseCatalog';
import type { Exercise } from '@/db/models/Exercise.model';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; created: [exercise: Exercise] }>();
const { addCustomExercise } = useExerciseCatalog();

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const groups = MUSCLE_GROUPS.filter(g => !['neck', 'hipFlexors'].includes(g.id));
const equipmentOptions = ['body weight', 'barbell', 'dumbbell', 'cable', 'machine', 'kettlebell', 'band', 'other'];
// Body part chip on the list, derived from the chosen muscle.
const BODY_PART: Partial<Record<MuscleGroup, string>> = {
  chest: 'chest', shoulders: 'shoulders', traps: 'back', upperBack: 'back', lowerBack: 'back',
  biceps: 'upper arms', triceps: 'upper arms', forearms: 'forearms', abs: 'waist', serratus: 'chest',
  glutes: 'hips', adductors: 'thighs', quads: 'thighs', hamstrings: 'thighs', calves: 'calves'
};

const name = ref('');
const group = ref<MuscleGroup>('chest');
const equipment = ref('body weight');
const media = ref<File | null>(null);
const previewUrl = ref('');
const saving = ref(false);
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function setMedia(file: File | null) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  media.value = file;
  previewUrl.value = file ? URL.createObjectURL(file) : '';
}

watch(() => props.open, on => {
  if (!on) return;
  name.value = '';
  group.value = 'chest';
  equipment.value = 'body weight';
  error.value = null;
  setMedia(null);
});

function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.size > MAX_MEDIA_BYTES) {
    error.value = 'That file is over 50 MB. Choose a shorter video.';
    return;
  }
  error.value = null;
  setMedia(file);
}

async function save() {
  saving.value = true;
  try {
    const ex = await addCustomExercise({
      name: name.value, group: group.value, equipment: equipment.value,
      bodyPart: BODY_PART[group.value] ?? 'other', media: media.value ?? undefined
    });
    emit('created', ex);
    emit('close');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

onBeforeUnmount(() => setMedia(null));
</script>

<style scoped>
.field { display: flex; flex-direction: column; gap: 8px; }
.field input[type='text'] {
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--surface-highest);
  border-radius: 12px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  padding: 7px 12px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  text-transform: capitalize;
  cursor: pointer;
}
.chip.on { background: var(--primary); color: var(--on-primary); font-weight: 600; }
.media { flex-wrap: wrap; }
.preview { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; }
.pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
.pick.ghost { background: transparent; color: var(--text-secondary); }
.hidden { display: none; }
.error { margin: 0; color: var(--danger); font-size: 14px; }
</style>
