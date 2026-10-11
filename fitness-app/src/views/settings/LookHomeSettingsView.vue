<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <SettingsHeader title="Look & Home" />

        <div class="cp-list">
          <div class="cp-li wrap">
            <SettingsTile icon="moon" color="#4E4A80" />
            <span class="cp-li-label">Theme</span>
            <SegmentedControl
              class="cp-li-full"
              label="Theme"
              :model-value="settings.theme"
              :options="themeOptions"
              @update:model-value="v => setSetting('theme', v)"
            />
          </div>

          <div class="cp-li wrap">
            <SettingsTile icon="palette" color="#6A4A80" />
            <span class="cp-li-label">Accent color</span>
            <span class="cp-li-value">{{ currentAccent.label }}</span>
            <div class="cp-li-full swatches" role="radiogroup" aria-label="Accent color">
              <button
                v-for="(a, key) in ACCENTS"
                :key="key"
                type="button"
                role="radio"
                class="swatch"
                :class="{ on: settings.accent === key }"
                :style="{ background: a[scheme][0] }"
                :aria-checked="settings.accent === key"
                :aria-label="a.label"
                @click="setSetting('accent', key)"
              ></button>
            </div>
          </div>

          <div class="cp-li wrap">
            <SettingsTile icon="person" color="#3E6E80" />
            <span class="cp-li-label">Body diagram</span>
            <SegmentedControl
              class="cp-li-full"
              label="Body diagram"
              :model-value="settings.bodyDiagram"
              :options="bodyOptions"
              @update:model-value="v => setSetting('bodyDiagram', v)"
            />
          </div>
        </div>

        <p class="cp-sec">On Home</p>
        <div class="cp-list">
          <div class="cp-li top">
            <SettingsTile icon="qr" color="#3E5E8A" />
            <span class="cp-li-label">
              Gym check-in
              <span class="cp-li-hint">Show a card on Home with your membership QR codes.</span>
            </span>
            <ToggleSwitch
              label="Show gym check-in on Home"
              :model-value="settings.homeShowGymCheckIn"
              @update:model-value="v => setSetting('homeShowGymCheckIn', v)"
            />
          </div>
          <div class="cp-li top">
            <SettingsTile icon="scale" color="#4F7A3A" />
            <span class="cp-li-label">
              Body weight
              <span class="cp-li-hint">Show the body weight card on Home.</span>
            </span>
            <ToggleSwitch
              label="Show body weight on Home"
              :model-value="settings.homeShowBodyWeight"
              @update:model-value="v => setSetting('homeShowBodyWeight', v)"
            />
          </div>
        </div>
        <p class="cp-lbl">The gym check-in card appears once the check-in screen is built.</p>
      </main>
    </ion-content>
    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonContent, IonPage } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import SettingsHeader from '@/components/settings/SettingsHeader.vue';
import SettingsTile from '@/components/settings/SettingsTile.vue';
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import ToggleSwitch from '@/components/settings/ToggleSwitch.vue';
import { useSettings } from '@/data/useSettings';
import { ACCENTS } from '@/data/useTheme';
import type { ThemeMode } from '@/db/models/AppSetting.model';

const { settings, setSetting } = useSettings();

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' }
];
const bodyOptions: { value: 'male' | 'female'; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

const currentAccent = computed(() => ACCENTS[settings.accent] ?? ACCENTS.green);
// Swatches preview the shade that will actually be used in the current theme.
const scheme = computed<'dark' | 'light'>(() => {
  if (settings.theme !== 'system') return settings.theme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
});
</script>

<style scoped>
.cp-li.top { align-items: flex-start; }

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 6px 2px;
}

.swatch {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.swatch.on {
  outline: 2.5px solid var(--text-primary);
  outline-offset: 2px;
}
</style>
