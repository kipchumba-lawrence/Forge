<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <SettingsHeader title="Data & backup" />

        <p class="cp-sec">Back up</p>
        <div class="cp-list">
          <button type="button" class="cp-li" :disabled="busy" @click="doExport">
            <SettingsTile icon="download" color="#4F7A3A" />
            <span class="cp-li-label">
              Export backup (JSON)
              <span class="cp-li-hint">Workouts, weigh-ins, photos, meals and settings in one file.</span>
            </span>
            <span class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
          </button>
        </div>

        <p class="cp-sec">Bring data in</p>
        <div class="cp-list">
          <button type="button" class="cp-li" :disabled="busy" @click="fileInput?.click()">
            <SettingsTile icon="upload" color="#3E5E8A" />
            <span class="cp-li-label">
              Import backup
              <span class="cp-li-hint">Replaces everything on this device with the backup.</span>
            </span>
            <span class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
          </button>
        </div>
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFile" />

        <p class="cp-sec">Privacy</p>
        <div class="cp-list">
          <div class="cp-li top">
            <SettingsTile icon="sparkle" color="#9A6A20" />
            <span class="cp-li-label">
              AI photo comparison
              <span class="cp-li-hint">Allows sending smaller copies of two progress photos to OpenRouter when you tap Compare.</span>
            </span>
            <ToggleSwitch
              label="Allow AI photo comparison"
              :model-value="settings.aiPhotoConsent"
              @update:model-value="v => setSetting('aiPhotoConsent', v)"
            />
          </div>
        </div>

        <div class="cp-list">
          <button type="button" class="cp-li danger" :disabled="busy" @click="confirm = 'reset'">
            <SettingsTile icon="reset" color="#9A4A40" />
            <span class="cp-li-label">Reset everything</span>
          </button>
        </div>

        <p v-if="message" class="status" :class="{ error: isError }" role="status">{{ message }}</p>
        <p class="cp-lbl">Your data lives only on this device. Export a backup now and then so you don't lose it.</p>
      </main>
    </ion-content>

    <BottomSheet :open="confirm === 'import'" title="Restore backup?" @close="cancelImport">
      <p class="cp-lbl body">
        This replaces <strong>everything</strong> on this device with the backup from
        {{ pendingImport ? when(pendingImport.exportedAt) : '' }}:
      </p>
      <ul class="counts">
        <li v-for="c in importSummary" :key="c.label"><span>{{ c.label }}</span><span class="cp-num">{{ c.count }}</span></li>
      </ul>
      <button type="button" class="cp-primary" :disabled="busy" @click="doRestore">Replace and restore</button>
      <button type="button" class="cancel" @click="cancelImport">Cancel</button>
    </BottomSheet>

    <BottomSheet :open="confirm === 'reset'" title="Reset everything?" @close="confirm = null">
      <p class="cp-lbl body">
        Deletes every workout, weigh-in, photo, meal and setting on this device. This can't be undone.
        Export a backup first if you might want it back.
      </p>
      <button type="button" class="cp-primary destructive" :disabled="busy" @click="doReset">Delete all data</button>
      <button type="button" class="cancel" @click="confirm = null">Cancel</button>
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
import ToggleSwitch from '@/components/settings/ToggleSwitch.vue';
import { useSettings } from '@/data/useSettings';
import { useBackup, type BackupFile } from '@/data/useBackup';

const { exportBackup, readBackup, restoreBackup, resetEverything } = useBackup();
const { settings, setSetting } = useSettings();

const busy = ref(false);
const message = ref('');
const isError = ref(false);
const confirm = ref<'import' | 'reset' | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const pendingImport = ref<{ backup: BackupFile; counts: Record<string, number>; exportedAt: string } | null>(null);

function say(text: string, error = false) {
  message.value = text;
  isError.value = error;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const LABELS: Record<string, string> = {
  workoutSessions: 'Workouts', workoutTemplates: 'Routines', bodyWeights: 'Weigh-ins',
  workoutMedia: 'Workout photos & videos', photoCheckIns: 'Progress photos', foodEntries: 'Meals', exercises: 'Exercises (incl. favourites)', settings: 'Settings'
};
const importSummary = computed(() =>
  Object.entries(LABELS).map(([key, label]) => ({ label, count: pendingImport.value?.counts[key] ?? 0 }))
);

async function doExport() {
  busy.value = true;
  say('');
  try {
    const result = await exportBackup();
    if (result === 'downloaded') say('Backup downloaded.');
    else if (result === 'shared') say('Backup ready. Save it somewhere safe, like Files or iCloud Drive.');
  } catch (e) {
    say(`Export failed: ${(e as Error).message}`, true);
  } finally {
    busy.value = false;
  }
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  say('');
  try {
    pendingImport.value = await readBackup(file);
    confirm.value = 'import';
  } catch (e) {
    say((e as Error).message, true);
  }
}

function cancelImport() {
  confirm.value = null;
  pendingImport.value = null;
}

async function doRestore() {
  if (!pendingImport.value) return;
  busy.value = true;
  try {
    await restoreBackup(pendingImport.value.backup);
    say('Backup restored.');
  } catch (e) {
    say(`Restore failed, nothing was changed: ${(e as Error).message}`, true);
  } finally {
    busy.value = false;
    cancelImport();
  }
}

async function doReset() {
  busy.value = true;
  try {
    await resetEverything();
    say('All data deleted.');
  } catch (e) {
    say(`Reset failed: ${(e as Error).message}`, true);
  } finally {
    busy.value = false;
    confirm.value = null;
  }
}
</script>

<style scoped>
.cp-li:disabled { opacity: 0.6; }
.cp-li.top { align-items: flex-start; }
.cp-li.danger .cp-li-label { color: var(--danger); }
.hidden { display: none; }

.status { margin: 0; color: var(--primary); font-size: 14px; }
.status.error { color: var(--danger); }

.body { font-size: 14px; line-height: 1.5; }
.body strong { color: var(--text-primary); }

.counts {
  margin: 0;
  padding: 4px 16px;
  border-radius: 14px;
  background: var(--surface-high);
  list-style: none;
}

.counts li {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid var(--surface-highest);
  font-size: 15px;
}

.counts li:first-child { border-top: 0; }

.destructive { background: var(--danger); color: #fff; }

.cancel {
  padding: 8px;
  border: 0;
  background: none;
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 16px;
  cursor: pointer;
}
</style>
