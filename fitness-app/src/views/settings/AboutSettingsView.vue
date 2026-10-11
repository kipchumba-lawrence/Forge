<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <SettingsHeader title="About & updates" />

        <div class="cp-list">
          <div class="cp-li">
            <SettingsTile icon="info" color="#5A6553" />
            <span class="cp-li-label">Version</span>
            <span class="cp-li-value">v{{ version }}</span>
          </div>
        </div>

        <template v-if="!isNativeApp">
          <p class="cp-sec">Tip</p>
          <div class="cp-list">
            <div class="cp-li top">
              <SettingsTile icon="share" color="#3E5E8A" />
              <span class="cp-li-label">
                In Safari: Share → Add to Home Screen
                <span class="cp-li-hint">Installs Forge as a full-screen app. Your data stays on this device, so export a backup now and then.</span>
              </span>
            </div>
          </div>
        </template>

        <p class="cp-lbl credits">
          Forge v{{ version }}<br />
          Exercise data and animations: ExerciseDB by AscendAPI<br />
          Food photo analysis and coaching: AI models via OpenRouter
        </p>
      </main>
    </ion-content>
    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core';
import { IonContent, IonPage } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import SettingsHeader from '@/components/settings/SettingsHeader.vue';
import SettingsTile from '@/components/settings/SettingsTile.vue';

const version = __APP_VERSION__;
// The "add to Home Screen" tip only makes sense in the browser build.
const isNativeApp = Capacitor.isNativePlatform();
</script>

<style scoped>
.cp-li.top { align-items: flex-start; }
.credits { line-height: 1.6; text-align: center; }
</style>
