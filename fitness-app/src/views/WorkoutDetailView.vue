<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main v-if="session" class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back to history" @click="router.push('/history')">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <div class="head-text">
            <h1 class="cp-h1" style="font-size: 30px">{{ session.name }}</h1>
            <p class="cp-sub">{{ meta }}</p>
          </div>
        </header>

        <!-- Exercises -->
        <div class="cp-list">
          <div v-for="(ex, i) in session.exercises" :key="i" class="cp-li ex">
            <img v-if="images.get(ex.exerciseDbId)" :src="images.get(ex.exerciseDbId)" class="thumb" alt="" loading="lazy" />
            <span v-else class="thumb placeholder"><LottieIcon name="exercises" :size="20" :draw="false" /></span>
            <span class="cp-li-label">
              <span class="ex-name">
                {{ ex.name }}
                <span v-if="prSet.has(ex.exerciseDbId)" class="pr"><LottieIcon name="trophy" :size="12" :draw="false" />PR</span>
              </span>
              <span class="cp-li-hint sets">{{ formatSets(ex.sets) || 'No sets finished' }}</span>
            </span>
          </div>
        </div>

        <!-- Photos & videos -->
        <section class="stack">
          <div class="cp-row spread">
            <span class="cp-sec" style="margin: 0 4px">Photos &amp; videos</span>
            <button type="button" class="cp-link" @click="mediaInput?.click()">
              <LottieIcon name="plus" :size="16" :draw="false" />Add photo
            </button>
          </div>
          <div v-if="media.length" class="media-grid">
            <button
              v-for="m in media"
              :key="m.id"
              type="button"
              class="media-cell"
              :aria-label="`Open ${m.kind}`"
              @click="viewing = m"
            >
              <img v-if="m.kind === 'photo'" :src="m.thumbUrl ?? m.url" alt="" />
              <video v-else :src="m.url" muted playsinline preload="metadata"></video>
            </button>
          </div>
          <p v-if="mediaError" class="error">{{ mediaError }}</p>
          <input ref="mediaInput" type="file" accept="image/*,video/*" class="hidden" @change="onMedia" />
        </section>

        <!-- Note -->
        <section class="stack">
          <label for="note" class="cp-sec" style="margin: 0 4px">Session note</label>
          <textarea
            id="note"
            v-model="note"
            class="note"
            rows="3"
            placeholder="How did it feel? Anything to remember next time?"
            @blur="saveNote"
          ></textarea>
          <p v-if="noteSaved" class="cp-lbl small" role="status">Saved</p>
        </section>

        <!-- Actions -->
        <div class="cp-list">
          <button type="button" class="cp-li" @click="openSaveRoutine">
            <LottieIcon name="save" :size="18" :draw="false" />
            <span class="cp-li-label">Save as routine</span>
          </button>
          <button type="button" class="cp-li" @click="copyText">
            <LottieIcon name="copy" :size="18" :draw="false" />
            <span class="cp-li-label">{{ copied ? 'Copied' : 'Copy as text' }}</span>
          </button>
          <button type="button" class="cp-li danger" @click="deleteOpen = true">
            <LottieIcon name="trash" :size="18" :draw="false" />
            <span class="cp-li-label">Delete workout</span>
          </button>
        </div>
        <p v-if="routineSaved" class="cp-lbl" role="status">Saved “{{ routineSaved }}” to your routines.</p>
      </main>
      <main v-else-if="notFound" class="cp-main">
        <p class="cp-lbl">This workout doesn't exist anymore.</p>
        <button type="button" class="cp-link" @click="router.push('/history')">Back to history</button>
      </main>
    </ion-content>

    <BottomSheet :open="viewing !== null" :title="viewing?.kind === 'video' ? 'Video' : 'Photo'" @close="viewing = null">
      <img v-if="viewing?.kind === 'photo'" :src="viewing.url" class="viewer" alt="Workout photo" />
      <video v-else-if="viewing" :src="viewing.url" class="viewer" controls playsinline></video>
      <button type="button" class="text-btn danger-text" @click="removeMedia">Delete</button>
    </BottomSheet>

    <BottomSheet :open="saveOpen" title="Save as routine" @close="saveOpen = false">
      <label class="field">
        <span class="cp-lbl">Routine name</span>
        <input v-model="routineName" type="text" />
      </label>
      <button type="button" class="cp-primary" :disabled="!routineName.trim()" @click="saveRoutine">Save routine</button>
    </BottomSheet>

    <BottomSheet :open="deleteOpen" title="Delete this workout?" @close="deleteOpen = false">
      <p class="cp-lbl body">The workout, its photos and its note are removed. This can't be undone.</p>
      <button type="button" class="cp-primary destructive" @click="doDelete">Delete workout</button>
      <button type="button" class="text-btn" @click="deleteOpen = false">Cancel</button>
    </BottomSheet>

    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import { db } from '@/db/AppDatabase';
import type { WorkoutSession } from '@/db/models/WorkoutSession.model';
import { useWorkoutData } from '@/data/useWorkoutData';
import { useWorkoutMedia, type MediaWithUrl } from '@/data/useWorkoutMedia';
import { useWorkoutTemplates } from '@/data/useWorkoutTemplates';
import { formatDuration, formatSets, personalRecords, sessionVolume } from '@/data/workoutSummary';
import { parseLocalDate } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const { updateSessionNote, deleteSession } = useWorkoutData();
const { items: media, error: mediaError, loadForSession, addMedia, deleteMedia } = useWorkoutMedia();
const { saveTemplate } = useWorkoutTemplates();

const session = ref<WorkoutSession | null>(null);
const notFound = ref(false);
const images = ref(new Map<string, string>());
const prSet = ref(new Set<string>());

const meta = computed(() => {
  const s = session.value;
  if (!s) return '';
  const parts = [parseLocalDate(s.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })];
  if (s.durationSeconds > 0) parts.push(formatDuration(s.durationSeconds));
  const vol = sessionVolume(s);
  if (vol > 0) parts.push(`${new Intl.NumberFormat().format(Math.round(vol * 10) / 10)} kg`);
  if (s.bodyWeightKg) parts.push(`${s.bodyWeightKg} kg body weight`);
  return parts.join(' · ');
});

async function load() {
  const id = Number(route.params.id);
  const s = await db.workoutSessions.get(id);
  notFound.value = !s;
  session.value = s ?? null;
  if (!s) return;
  note.value = s.note ?? '';
  const ids = s.exercises.map(e => e.exerciseDbId);
  const cached = await db.exercises.where('exerciseDbId').anyOf(ids).toArray();
  images.value = new Map(cached.map(e => [e.exerciseDbId, e.cachedImageUrl || e.gifUrl || '']));
  const all = await db.workoutSessions.where('status').equals('completed').toArray();
  prSet.value = personalRecords(all).get(id) ?? new Set();
  loadForSession(id);
}

// ---- Media ----
const mediaInput = ref<HTMLInputElement | null>(null);
const viewing = ref<MediaWithUrl | null>(null);
async function onMedia(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file && session.value?.id) await addMedia(session.value.id, file);
}
async function removeMedia() {
  if (viewing.value?.id) await deleteMedia(viewing.value.id);
  viewing.value = null;
}

// ---- Note ----
const note = ref('');
const noteSaved = ref(false);
async function saveNote() {
  if (!session.value?.id || (session.value.note ?? '') === note.value.trim()) return;
  await updateSessionNote(session.value.id, note.value);
  session.value.note = note.value.trim() || undefined;
  noteSaved.value = true;
  setTimeout(() => (noteSaved.value = false), 1500);
}

// ---- Actions ----
const saveOpen = ref(false);
const routineName = ref('');
const routineSaved = ref('');
function openSaveRoutine() {
  routineName.value = session.value?.name ?? '';
  saveOpen.value = true;
}
async function saveRoutine() {
  if (!session.value) return;
  // Keep the weights and reps as next-time targets, all unticked.
  const exercises = session.value.exercises.map(e => ({
    exerciseDbId: e.exerciseDbId,
    name: e.name,
    sets: e.sets.map((s, i) => ({ setNumber: i + 1, weight: s.weight, reps: s.reps, completed: false }))
  }));
  await saveTemplate(routineName.value.trim(), exercises);
  routineSaved.value = routineName.value.trim();
  saveOpen.value = false;
}

const copied = ref(false);
async function copyText() {
  const s = session.value;
  if (!s) return;
  const lines = [`${s.name} — ${meta.value}`, ...s.exercises.map(e => `${e.name}: ${formatSets(e.sets) || '—'}`)];
  if (s.note) lines.push('', s.note);
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    mediaError.value = "Couldn't copy to the clipboard.";
  }
}

const deleteOpen = ref(false);
async function doDelete() {
  if (session.value?.id) await deleteSession(session.value.id);
  deleteOpen.value = false;
  router.replace('/history');
}

onIonViewWillEnter(load);
</script>

<style scoped>
.head { align-items: flex-start; gap: 14px; }
.head-text { min-width: 0; flex: 1; }

.ex { align-items: flex-start; }
.thumb {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--surface-high);
  object-fit: cover;
}
.thumb.placeholder { display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
.ex-name { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-weight: 600; }
.sets { font-size: 13px; }
.pr {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 8px;
  background: rgba(var(--warning-rgb), 0.16);
  color: var(--warning);
  font-size: 11px;
  font-weight: 600;
}

.stack { display: flex; flex-direction: column; gap: 10px; }
.spread { justify-content: space-between; }
.media-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.media-cell { padding: 0; overflow: hidden; border: 0; border-radius: 12px; background: var(--surface); cursor: pointer; }
.media-cell img, .media-cell video { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }

.note {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--surface-highest);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.45;
  resize: vertical;
}
.note:focus { outline: 2px solid var(--primary); }
.small { font-size: 12px; margin: 0 4px; }
.error { margin: 0; color: var(--danger); font-size: 14px; }
.hidden { display: none; }

.cp-li.danger { color: var(--danger); }
.viewer { width: 100%; max-height: 60vh; border-radius: 14px; object-fit: contain; background: #000; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field input {
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--surface-highest);
  border-radius: 12px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
}
.body { font-size: 14px; line-height: 1.5; }
.destructive { background: var(--danger); color: #fff; }
.text-btn {
  padding: 8px;
  border: 0;
  background: none;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 16px;
  cursor: pointer;
}
.danger-text { color: var(--danger); }
</style>
