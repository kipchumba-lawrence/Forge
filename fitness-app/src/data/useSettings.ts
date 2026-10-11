import { reactive, readonly } from 'vue';
import { db } from '@/db/AppDatabase';
import { DEFAULT_SETTINGS, type AppSettings } from '@/db/models/AppSetting.model';

// Module-level so every component shares one copy.
const state = reactive<AppSettings>({ ...DEFAULT_SETTINGS });
let loaded: Promise<void> | null = null;

async function load() {
  const rows = await db.settings.toArray();
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) (state as any)[row.key] = row.value;
  }
}

export function useSettings() {
  function ensureLoaded() {
    return (loaded ??= load());
  }

  async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    // Plain JSON copy: IndexedDB can't clone Vue proxies, and settings are JSON anyway.
    const plain = JSON.parse(JSON.stringify(value)) as AppSettings[K];
    state[key] = plain;
    await db.settings.put({ key, value: plain });
  }

  // Re-read from the database, e.g. after a backup restore replaced the rows.
  async function reload() {
    Object.assign(state, DEFAULT_SETTINGS);
    loaded = load();
    await loaded;
  }

  async function resetSettings() {
    Object.assign(state, DEFAULT_SETTINGS);
    await db.settings.clear();
  }

  return { settings: readonly(state), ensureLoaded, setSetting, resetSettings, reload };
}
