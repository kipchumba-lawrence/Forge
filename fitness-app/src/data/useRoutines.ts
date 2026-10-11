import { computed, ref } from 'vue';
import { db } from '@/db/AppDatabase';
import type { WorkoutTemplate } from '@/db/models/WorkoutTemplate.model';
import type { WeekSchedule } from '@/db/models/AppSetting.model';
import { useSettings } from '@/data/useSettings';
import { localDateString, parseLocalDate } from '@/utils/date';

// Routines (stored as workout templates) and the weekly plan built from them.
const routines = ref<WorkoutTemplate[]>([]);

const DAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'] as const;
export const DAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
export const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Monday = 0 … Sunday = 6
export const weekdayIndex = (date: string = localDateString()) => (parseLocalDate(date).getDay() + 6) % 7;

// Plain copy for IndexedDB: Vue proxies can't be stored.
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function useRoutines() {
  const { settings, setSetting } = useSettings();

  async function load() {
    const rows = await db.workoutTemplates.toArray();
    routines.value = rows.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.createdAt.localeCompare(b.createdAt));
  }

  const byId = (id: number) => routines.value.find(r => r.id === id) ?? null;

  async function save(routine: WorkoutTemplate) {
    const row = plain(routine);
    row.id = await db.workoutTemplates.put(row) as number;
    await load();
    return row;
  }

  async function create(name = 'New routine') {
    return save({ name, createdAt: new Date().toISOString(), exercises: [], progression: 'linear', order: routines.value.length });
  }

  async function duplicate(id: number) {
    const r = byId(id);
    if (!r) return null;
    const { id: _drop, ...rest } = plain(r);
    void _drop;
    return save({ ...rest, name: `${r.name} (copy)`, createdAt: new Date().toISOString(), order: routines.value.length });
  }

  async function remove(id: number) {
    await db.workoutTemplates.delete(id);
    // Drop it from the plan too, so no day points at a missing routine.
    const week = plain(settings.weekSchedule) as WeekSchedule;
    for (const k of DAY_KEYS) week[k] = week[k].filter(x => x !== id);
    await setSetting('weekSchedule', week);
    const rotation = settings.rotation.filter(x => x !== id);
    await setSetting('rotation', rotation);
    if (settings.rotationNext >= rotation.length) await setSetting('rotationNext', 0);
    await load();
  }

  async function move(id: number, delta: -1 | 1) {
    const list = [...routines.value];
    const i = list.findIndex(r => r.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await db.transaction('rw', db.workoutTemplates, async () => {
      for (const [order, r] of list.entries()) await db.workoutTemplates.update(r.id!, { order });
    });
    await load();
  }

  // ---- Schedule ----
  async function setDay(day: number, ids: number[]) {
    const week = plain(settings.weekSchedule) as WeekSchedule;
    week[DAY_KEYS[day]] = ids;
    await setSetting('weekSchedule', week);
  }

  async function setRotation(ids: number[]) {
    await setSetting('rotation', ids);
    if (settings.rotationNext >= ids.length) await setSetting('rotationNext', 0);
  }

  // Days of the fixed week each routine is on, e.g. "Mo, Th".
  function daysFor(id: number) {
    return DAY_KEYS.filter(k => settings.weekSchedule[k].includes(id)).map(k => DAY_SHORT[Number(k)]);
  }

  // Routines planned for today: the weekday's in Fixed Week, the next
  // non-rest entry in Rotation.
  const today = computed<WorkoutTemplate[]>(() => {
    if (settings.scheduleMode === 'rotation') {
      const id = settings.rotation[settings.rotationNext];
      return id ? [byId(id)].filter((r): r is WorkoutTemplate => !!r) : [];
    }
    return settings.weekSchedule[DAY_KEYS[weekdayIndex()]].map(byId).filter((r): r is WorkoutTemplate => !!r);
  });

  const rotationRestToday = computed(() => settings.scheduleMode === 'rotation' && settings.rotation.length > 0 && settings.rotation[settings.rotationNext] === 0);

  // Called when a workout finishes: in Rotation, step past what was just
  // done (and any rest day after it) so "next up" moves on.
  async function advanceRotation(completedTemplateId?: number) {
    if (settings.scheduleMode !== 'rotation' || !settings.rotation.length) return;
    const rot = settings.rotation;
    let i = settings.rotationNext;
    if (completedTemplateId !== undefined && rot[i] !== completedTemplateId) {
      const found = rot.indexOf(completedTemplateId);
      if (found >= 0) i = found;
    }
    await setSetting('rotationNext', (i + 1) % rot.length);
  }

  async function skipRestDay() {
    if (rotationRestToday.value) await setSetting('rotationNext', (settings.rotationNext + 1) % settings.rotation.length);
  }

  return {
    routines, load, byId, save, create, duplicate, remove, move,
    setDay, setRotation, daysFor, today, rotationRestToday, advanceRotation, skipRestDay
  };
}
