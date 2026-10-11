<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header class="cp-row head">
          <button type="button" class="cp-icon-btn" aria-label="Back to Home" @click="router.push('/home')">
            <LottieIcon name="chevronLeft" :size="20" :draw="false" />
          </button>
          <div class="head-text">
            <h1 class="cp-h1" style="font-size: 30px">Progress photos</h1>
            <p class="cp-sub">{{ all.length }} photo{{ all.length === 1 ? '' : 's' }}</p>
          </div>
          <button type="button" class="new-btn" @click="newOpen = true">
            <LottieIcon name="camera" :size="18" :draw="false" />Check in
          </button>
        </header>

        <SegmentedControl v-model="pose" label="Pose" :options="poseOptions" />

        <!-- Nothing for this pose yet -->
        <section v-if="!posePhotos.length" class="empty">
          <LottieIcon name="camera" :size="34" />
          <p>No {{ pose }} photos yet. Take a mirror photo now, then again in a week or two, and the AI will tell you how you've changed.</p>
          <button type="button" class="cp-primary" @click="newOpen = true">Take a {{ pose }} check-in</button>
        </section>

        <template v-else-if="selected">
          <!-- Before / after -->
          <section class="cp-card compare">
            <div class="pair" :class="{ single: !previous }">
              <figure v-if="previous">
                <img :src="previous.url" :alt="`${pose} photo from ${longDate(previous.date)}`" />
                <figcaption>
                  <span class="tag">Before</span>
                  <span>{{ shortDate(previous.date) }}</span>
                  <span v-if="previous.weightKg" class="cp-num">{{ previous.weightKg }} kg</span>
                </figcaption>
              </figure>
              <figure>
                <img :src="selected.url" :alt="`${pose} photo from ${longDate(selected.date)}`" />
                <figcaption>
                  <span class="tag now">{{ previous ? 'After' : 'Latest' }}</span>
                  <span>{{ shortDate(selected.date) }}</span>
                  <span v-if="selected.weightKg" class="cp-num">{{ selected.weightKg }} kg</span>
                </figcaption>
              </figure>
            </div>

            <p v-if="previous" class="cp-lbl">
              {{ daysBetween }} day{{ daysBetween === 1 ? '' : 's' }} apart<template v-if="weightChange !== null"> · {{ weightChange > 0 ? '+' : weightChange < 0 ? '−' : '' }}{{ Math.abs(weightChange) }} kg</template>
            </p>
            <p v-else class="cp-lbl">This is your first {{ pose }} photo. Check in again in a week or two to compare.</p>

            <!-- AI verdict -->
            <div v-if="previous" class="ai">
              <div v-if="comparingId === selected.id" class="cp-row thinking">
                <LottiePlayer name="liftLoader" :size="40" />
                <span class="cp-lbl">Comparing your photos… this can take up to a minute on the free AI tier.</span>
              </div>

              <template v-else-if="currentComparison">
                <div class="cp-row">
                  <span class="cp-tile amber"><LottieIcon name="sparkle" :size="20" /></span>
                  <p class="cp-eyebrow">How you've changed</p>
                </div>
                <p class="summary">{{ currentComparison.summary }}</p>
                <ul v-if="currentComparison.changes.length" class="changes">
                  <li v-for="(c, i) in currentComparison.changes" :key="i">{{ c }}</li>
                </ul>
                <p v-if="currentComparison.caveats" class="caveat">
                  <strong>Keep in mind:</strong> {{ currentComparison.caveats }}
                </p>
                <p class="cp-lbl small">AI observations from two photos, not a measurement. Lighting and pose can exaggerate or hide change.</p>
                <button type="button" class="cp-link" @click="requestCompare">
                  <LottieIcon name="refresh" :size="16" :draw="false" />Compare again
                </button>
              </template>

              <template v-else>
                <button type="button" class="cp-primary" @click="requestCompare">
                  <LottieIcon name="sparkle" :size="18" />Compare with AI
                </button>
                <p class="cp-lbl small">Sends smaller copies of these two photos to OpenRouter for analysis.</p>
              </template>

              <p v-if="error" class="error" role="alert">{{ error }}</p>
            </div>

            <button type="button" class="delete" @click="deleteOpen = true">
              <LottieIcon name="trash" :size="16" :draw="false" />Delete this photo
            </button>
          </section>

          <!-- Timeline -->
          <p class="cp-sec">All {{ pose }} photos</p>
          <div class="grid">
            <button
              v-for="p in posePhotos"
              :key="p.id"
              type="button"
              class="cell"
              :class="{ on: p.id === selected.id }"
              :aria-label="`Show ${pose} photo from ${longDate(p.date)}`"
              :aria-pressed="p.id === selected.id"
              @click="selectedId = p.id!"
            >
              <img :src="p.thumbUrl" alt="" loading="lazy" />
              <span class="cell-date">{{ shortDate(p.date) }}</span>
              <span v-if="p.comparison" class="cell-ai" aria-hidden="true"><LottieIcon name="sparkle" :size="12" :draw="false" /></span>
            </button>
          </div>
        </template>
      </main>
    </ion-content>

    <!-- New check-in -->
    <BottomSheet :open="newOpen" title="Photo check-in" @close="newOpen = false">
      <SegmentedControl v-model="pose" label="Pose" :options="poseOptions" />
      <ul class="tips">
        <li>Same mirror, same spot, same lighting every time.</li>
        <li>Phone at chest height, whole torso in frame.</li>
        <li>Relaxed stance, similar clothing, and before a workout, not after a pump.</li>
      </ul>
      <p v-if="saving" class="cp-lbl">Saving…</p>
      <div class="sources">
        <button type="button" class="cp-primary" :disabled="saving" @click="cameraInput?.click()">
          <LottieIcon name="camera" :size="18" />Take photo
        </button>
        <button type="button" class="secondary" :disabled="saving" @click="libraryInput?.click()">
          <LottieIcon name="image" :size="18" />Choose from library
        </button>
      </div>
      <p class="cp-lbl small">Photos stay on this device unless you choose to compare them with AI.</p>
    </BottomSheet>
    <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onFile" />
    <input ref="libraryInput" type="file" accept="image/*" class="hidden" @change="onFile" />

    <!-- One-time consent before any photo leaves the device -->
    <BottomSheet :open="consentOpen" title="Compare with AI?" @close="consentOpen = false">
      <p class="cp-lbl body">
        To compare, Forge sends smaller copies of your two progress photos, the dates and your logged weights to
        <strong>OpenRouter</strong>, which passes them to a free AI model. Free-tier providers may log what they receive.
      </p>
      <p class="cp-lbl body">Nothing is sent unless you tap Compare. You can turn this off any time in Settings › Data &amp; backup.</p>
      <button type="button" class="cp-primary" @click="grantConsent">Allow and compare</button>
      <button type="button" class="text-btn" @click="consentOpen = false">Not now</button>
    </BottomSheet>

    <BottomSheet :open="deleteOpen" title="Delete this photo?" @close="deleteOpen = false">
      <p class="cp-lbl body">It's removed from this device, along with its AI comparison. This can't be undone.</p>
      <button type="button" class="cp-primary destructive" @click="doDelete">Delete photo</button>
      <button type="button" class="text-btn" @click="deleteOpen = false">Cancel</button>
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
import LottiePlayer from '@/components/LottiePlayer.vue';
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import { usePhotoCheckIns } from '@/data/usePhotoCheckIns';
import { useSettings } from '@/data/useSettings';
import type { Pose } from '@/db/models/PhotoCheckIn.model';
import { parseLocalDate } from '@/utils/date';

const router = useRouter();
const { settings, setSetting } = useSettings();
const { all, comparingId, error, load, previousOf, addCheckIn, compare, remove } = usePhotoCheckIns();

const poseOptions: { value: Pose; label: string }[] = [
  { value: 'front', label: 'Front' }, { value: 'side', label: 'Side' }, { value: 'back', label: 'Back' }
];
const pose = ref<Pose>('front');
const selectedId = ref<number | null>(null);

const posePhotos = computed(() => all.value.filter(p => p.pose === pose.value));
const selected = computed(() => posePhotos.value.find(p => p.id === selectedId.value) ?? posePhotos.value[0] ?? null);
const previous = computed(() => (selected.value ? previousOf(selected.value) : null));

// Only show a comparison made against the photo now shown as "before".
const currentComparison = computed(() => {
  const c = selected.value?.comparison;
  return c && previous.value && c.againstId === previous.value.id ? c : null;
});

const daysBetween = computed(() => {
  if (!selected.value || !previous.value) return 0;
  return Math.round((parseLocalDate(selected.value.date).getTime() - parseLocalDate(previous.value.date).getTime()) / 86_400_000);
});
const weightChange = computed(() => {
  const a = previous.value?.weightKg, b = selected.value?.weightKg;
  return a != null && b != null ? Math.round((b - a) * 10) / 10 : null;
});

const shortDate = (d: string) => parseLocalDate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const longDate = (d: string) => parseLocalDate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

watch(pose, () => {
  selectedId.value = null;
  error.value = null;
});

// ---- New check-in ----
const newOpen = ref(false);
const saving = ref(false);
const cameraInput = ref<HTMLInputElement | null>(null);
const libraryInput = ref<HTMLInputElement | null>(null);

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  saving.value = true;
  try {
    const id = await addCheckIn(file, pose.value);
    if (id != null) {
      selectedId.value = id;
      newOpen.value = false;
    }
  } finally {
    saving.value = false;
  }
}

// ---- AI comparison ----
const consentOpen = ref(false);

function requestCompare() {
  if (!selected.value) return;
  if (!settings.aiPhotoConsent) {
    consentOpen.value = true;
    return;
  }
  compare(selected.value.id!);
}

async function grantConsent() {
  await setSetting('aiPhotoConsent', true);
  consentOpen.value = false;
  if (selected.value) compare(selected.value.id!);
}

// ---- Delete ----
const deleteOpen = ref(false);
async function doDelete() {
  if (selected.value) await remove(selected.value.id!);
  selectedId.value = null;
  deleteOpen.value = false;
}

onIonViewWillEnter(load);
</script>

<style scoped>
.head { align-items: flex-start; gap: 14px; }
.head-text { min-width: 0; flex: 1; }

.new-btn {
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

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 60px 12px;
  color: var(--text-secondary);
  text-align: center;
}
.empty p { margin: 0; font-size: 15px; line-height: 1.5; }

.compare { display: flex; flex-direction: column; gap: 14px; }

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.pair.single { grid-template-columns: 1fr; max-width: 260px; margin: 0 auto; width: 100%; }

figure { margin: 0; }
figure img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 14px;
  background: var(--surface-high);
  object-fit: cover;
}
figcaption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-top: 8px;
  font-size: 13px;
}
.tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-high);
  color: var(--text-secondary);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.tag.now { background: var(--primary-soft); color: var(--primary); }

.ai {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--surface-highest);
}
.thinking { color: var(--primary); }

.summary { margin: 0; font-size: 16px; line-height: 1.5; }
.changes { margin: 0; padding-left: 20px; line-height: 1.5; }
.changes li { margin: 4px 0; }
.caveat { margin: 0; color: var(--warning); font-size: 14px; line-height: 1.45; }
.small { font-size: 12px; line-height: 1.45; }
.error { margin: 0; color: var(--danger); font-size: 14px; }

.delete {
  display: flex;
  align-items: center;
  align-self: center;
  gap: 6px;
  padding: 6px;
  border: 0;
  background: none;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.cell {
  position: relative;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: var(--surface);
  cursor: pointer;
}
.cell img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; }
.cell.on { outline: 2.5px solid var(--primary); outline-offset: 2px; }
.cell-date {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
}
.cell-ai {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  padding: 4px;
  border-radius: 50%;
  background: var(--warning);
  color: #12160F;
}

.tips {
  margin: 0;
  padding-left: 20px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}
.sources { display: flex; flex-direction: column; gap: 10px; }
.secondary {
  display: flex;
  height: 52px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 14px;
  background: var(--surface-high);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.body { font-size: 14px; line-height: 1.5; }
.body strong { color: var(--text-primary); }
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
.hidden { display: none; }
</style>
