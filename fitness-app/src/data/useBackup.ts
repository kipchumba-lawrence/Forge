import { db } from '@/db/AppDatabase';
import { useSettings } from '@/data/useSettings';
import { localDateString } from '@/utils/date';
import { blobToDataUrl } from '@/utils/image';

// Backup file format. Bump FORMAT_VERSION if the shape changes, and teach
// importBackup to read older versions.
const APP_ID = 'forge-fitness';
const FORMAT_VERSION = 1;

// Tables that hold user data. The exercise catalog is a cache of ExerciseDB
// and re-syncs on its own, but it's included because favourites live on it.
const TABLES = [
  'exercises', 'foodEntries', 'workoutSessions', 'workoutTemplates', 'dailyActivity',
  'aiInsights', 'bodyWeights', 'workoutMedia', 'photoCheckIns', 'settings'
] as const;
type TableName = (typeof TABLES)[number];

interface BackupFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  tables: Partial<Record<TableName, unknown[]>>;
}

// JSON can't carry Blobs (progress photos), so they travel as data URLs and
// are turned back into Blobs on import.
const BLOB_TAG = '__blob__';

async function encode(value: unknown): Promise<unknown> {
  if (value instanceof Blob) return { [BLOB_TAG]: await blobToDataUrl(value) };
  if (Array.isArray(value)) return Promise.all(value.map(encode));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await encode(v);
    return out;
  }
  return value;
}

async function decode(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map(decode));
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj[BLOB_TAG] === 'string') return (await fetch(obj[BLOB_TAG] as string)).blob();
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = await decode(v);
    return out;
  }
  return value;
}

export function useBackup() {
  const { resetSettings, reload } = useSettings();

  async function buildBackup(): Promise<{ file: File; counts: Record<string, number> }> {
    const tables: BackupFile['tables'] = {};
    const counts: Record<string, number> = {};
    for (const name of TABLES) {
      const rows = await db.table(name).toArray();
      tables[name] = (await encode(rows)) as unknown[];
      counts[name] = rows.length;
    }
    const backup: BackupFile = { app: APP_ID, version: FORMAT_VERSION, exportedAt: new Date().toISOString(), tables };
    const file = new File([JSON.stringify(backup)], `forge-backup-${localDateString()}.json`, { type: 'application/json' });
    return { file, counts };
  }

  // Share sheet where supported (iOS Safari / installed web app), otherwise a
  // normal download. Returns how it was handed off.
  async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
    const { file } = await buildBackup();
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Forge backup' });
        return 'shared';
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return 'cancelled';
        // Share failed for another reason; fall through to a download.
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  }

  // Validates before touching anything, so a wrong file can't wipe data.
  async function readBackup(file: File) {
    let parsed: BackupFile;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new Error("That file isn't a Forge backup (it isn't valid JSON).");
    }
    if (parsed?.app !== APP_ID || typeof parsed.tables !== 'object') {
      throw new Error("That file isn't a Forge backup.");
    }
    if (parsed.version > FORMAT_VERSION) {
      throw new Error('This backup was made by a newer version of Forge. Update the app and try again.');
    }
    const counts: Record<string, number> = {};
    for (const name of TABLES) {
      const rows = parsed.tables[name];
      if (rows !== undefined && !Array.isArray(rows)) throw new Error(`The backup's "${name}" data is damaged.`);
      counts[name] = rows?.length ?? 0;
    }
    return { backup: parsed, counts, exportedAt: parsed.exportedAt };
  }

  // Replaces everything with the backup's contents in one transaction: if any
  // write fails, nothing changes.
  async function restoreBackup(backup: BackupFile) {
    const decoded: Partial<Record<TableName, unknown[]>> = {};
    for (const name of TABLES) decoded[name] = (await decode(backup.tables[name] ?? [])) as unknown[];

    await db.transaction('rw', TABLES.map(t => db.table(t)), async () => {
      for (const name of TABLES) {
        await db.table(name).clear();
        if (decoded[name]!.length) await db.table(name).bulkAdd(decoded[name]!);
      }
    });
    await reload();
  }

  async function resetEverything() {
    await db.transaction('rw', TABLES.map(t => db.table(t)), async () => {
      for (const name of TABLES) await db.table(name).clear();
    });
    await resetSettings();
  }

  return { buildBackup, exportBackup, readBackup, restoreBackup, resetEverything };
}

export type { BackupFile };
