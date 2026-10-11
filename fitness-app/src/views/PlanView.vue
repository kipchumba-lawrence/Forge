<template>
  <ion-page>
    <ion-content class="cp-page" :fullscreen="true">
      <main class="cp-main">
        <header>
          <h1 class="cp-h1">Plan</h1>
          <p class="cp-sub">Your weekly routine</p>
        </header>

        <SegmentedControl v-model="tab" label="Plan section" :options="tabOptions" />

        <!-- ===== Schedule ===== -->
        <template v-if="tab === 'schedule'">
          <section class="cp-card stack">
            <p class="cp-lbl" style="font-size: 14px">How you train</p>
            <SegmentedControl
              label="Schedule type"
              :model-value="settings.scheduleMode"
              :options="modeOptions"
              @update:model-value="v => setSetting('scheduleMode', v)"
            />
            <p class="cp-lbl">
              {{ settings.scheduleMode === 'fixed'
                ? 'The same routines on the same weekdays, every week.'
                : 'Routines in a repeating order. Each finished workout moves you to the next.' }}
            </p>
          </section>

          <p v-if="!routines.length" class="cp-lbl">
            Create a routine first, then plan your week.
            <button type="button" class="cp-link inline" @click="newRoutine">New routine</button>
          </p>

          <!-- Fixed week -->
          <template v-else-if="settings.scheduleMode === 'fixed'">
            <p class="cp-sec">This week</p>
            <div class="cp-list">
              <button v-for="(day, i) in DAY_SHORT" :key="day" type="button" class="cp-li day" @click="openDay(i)">
                <span class="day-label" :class="{ today: i === todayIndex }">{{ day }}</span>
                <span class="cp-li-label">
                  <template v-if="dayRoutines(i).length">
                    <span class="day-name">{{ dayRoutines(i).map(r => r.name).join(' + ') }}</span>
                    <span class="cp-li-hint">{{ exerciseCount(dayRoutines(i)) }}</span>
                  </template>
                  <template v-else>
                    <span class="rest">Rest day</span>
                    <span class="cp-li-hint">Tap to plan something</span>
                  </template>
                </span>
                <span class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
              </button>
            </div>
            <p class="cp-lbl">Want two routines on one day? Tap the day and pick both.</p>
          </template>

          <!-- Rotation -->
          <template v-else>
            <p class="cp-sec">Order</p>
            <div v-if="settings.rotation.length" class="cp-list">
              <div v-for="(id, i) in settings.rotation" :key="`${i}-${id}`" class="cp-li rot">
                <button type="button" class="rot-main" :aria-label="`Make ${rotLabel(id)} next`" @click="setSetting('rotationNext', i)">
                  <span class="rot-num">{{ i + 1 }}</span>
                  <span class="cp-li-label">
                    <span :class="{ rest: id === 0 }">{{ rotLabel(id) }}</span>
                    <span v-if="i === settings.rotationNext" class="next">Next up</span>
                  </span>
                </button>
                <button type="button" class="mini" :aria-label="`Move ${rotLabel(id)} up`" :disabled="i === 0" @click="moveRot(i, -1)"><LottieIcon name="chevronLeft" :size="14" :draw="false" class="up" /></button>
                <button type="button" class="mini" :aria-label="`Move ${rotLabel(id)} down`" :disabled="i === settings.rotation.length - 1" @click="moveRot(i, 1)"><LottieIcon name="chevronRight" :size="14" :draw="false" class="up" /></button>
                <button type="button" class="mini danger" :aria-label="`Remove ${rotLabel(id)}`" @click="removeRot(i)"><LottieIcon name="close" :size="14" :draw="false" /></button>
              </div>
            </div>
            <p v-else class="cp-lbl">Add routines in the order you want to repeat them.</p>
            <div class="cp-row">
              <button type="button" class="soft-btn" @click="rotPickOpen = true"><LottieIcon name="plus" :size="16" :draw="false" />Add routine</button>
              <button type="button" class="soft-btn" @click="setRotation([...settings.rotation, 0])"><LottieIcon name="moon" :size="16" :draw="false" />Add rest day</button>
            </div>
            <p class="cp-lbl">Tap an entry to make it next up.</p>
          </template>
        </template>

        <!-- ===== Routines ===== -->
        <template v-else>
          <div class="cp-row spread">
            <button type="button" class="cp-link" :disabled="!routines.length" @click="editing = !editing">{{ editing ? 'Done' : 'Edit' }}</button>
            <button type="button" class="soft-btn" @click="newRoutine"><LottieIcon name="plus" :size="16" :draw="false" />New routine</button>
          </div>

          <div v-if="routines.length" class="list">
            <div v-for="(r, i) in routines" :key="r.id" class="cp-card cp-row routine">
              <button type="button" class="routine-main" @click="!editing && router.push(`/plan/routine/${r.id}`)">
                <span class="cp-tile" :class="{ amber: r.isDeload }"><LottieIcon name="exercises" :size="20" :draw="false" /></span>
                <span class="text">
                  <span class="name">{{ r.name }}</span>
                  <span class="cp-lbl">{{ r.exercises.length }} exercise{{ r.exercises.length === 1 ? '' : 's' }}<template v-if="daysFor(r.id!).length"> · {{ daysFor(r.id!).join(', ') }}</template><template v-if="r.isDeload"> · Deload</template></span>
                </span>
              </button>
              <template v-if="editing">
                <button type="button" class="mini" :aria-label="`Move ${r.name} up`" :disabled="i === 0" @click="move(r.id!, -1)"><LottieIcon name="chevronLeft" :size="14" :draw="false" class="up" /></button>
                <button type="button" class="mini" :aria-label="`Move ${r.name} down`" :disabled="i === routines.length - 1" @click="move(r.id!, 1)"><LottieIcon name="chevronRight" :size="14" :draw="false" class="up" /></button>
                <button type="button" class="mini danger" :aria-label="`Delete ${r.name}`" @click="deleting = r"><LottieIcon name="trash" :size="14" :draw="false" /></button>
              </template>
              <span v-else class="cp-li-chev"><LottieIcon name="chevronRight" :size="18" :draw="false" /></span>
            </div>
          </div>
          <section v-else class="state">
            <LottiePlayer name="liftLoader" :size="64" />
            <p>No routines yet. Create one, add exercises, and pick a progression rule.</p>
          </section>
          <p v-if="routines.length" class="cp-lbl">Tap a routine to edit it. Reorder and delete are behind Edit.</p>
        </template>
      </main>
    </ion-content>

    <!-- Pick routines for a weekday -->
    <BottomSheet :open="dayOpen !== null" :title="dayOpen !== null ? DAY_LONG[dayOpen] : ''" @close="dayOpen = null">
      <p class="cp-lbl">Pick one or more routines, or none for a rest day.</p>
      <div class="checks">
        <label v-for="r in routines" :key="r.id" class="check">
          <input v-model="dayPick" type="checkbox" :value="r.id" />
          <span class="box"><LottieIcon v-if="dayPick.includes(r.id!)" name="check" :size="14" /></span>
          <span>{{ r.name }}</span>
        </label>
      </div>
      <button type="button" class="cp-primary" @click="saveDay">Save</button>
    </BottomSheet>

    <OptionSheet
      :open="rotPickOpen"
      title="Add to rotation"
      :model-value="undefined"
      :options="routines.map(r => ({ value: r.id, label: r.name }))"
      @update:model-value="v => v && setRotation([...settings.rotation, v as number])"
      @close="rotPickOpen = false"
    />

    <BottomSheet :open="deleting !== null" :title="`Delete ${deleting?.name ?? ''}?`" @close="deleting = null">
      <p class="cp-lbl">The routine is removed from your plan. Workouts you've logged with it stay in your history.</p>
      <button type="button" class="cp-primary destructive" @click="confirmDelete">Delete routine</button>
    </BottomSheet>

    <AppTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppTabBar from '@/components/AppTabBar.vue';
import BottomSheet from '@/components/BottomSheet.vue';
import LottieIcon from '@/components/LottieIcon.vue';
import LottiePlayer from '@/components/LottiePlayer.vue';
import SegmentedControl from '@/components/settings/SegmentedControl.vue';
import OptionSheet from '@/components/workout/OptionSheet.vue';
import { DAY_LONG, DAY_SHORT, useRoutines, weekdayIndex } from '@/data/useRoutines';
import { useSettings } from '@/data/useSettings';
import type { ScheduleMode, WeekSchedule } from '@/db/models/AppSetting.model';
import type { WorkoutTemplate } from '@/db/models/WorkoutTemplate.model';

const router = useRouter();
const { settings, setSetting } = useSettings();
const { routines, load, byId, create, remove, move, setDay, setRotation, daysFor } = useRoutines();

type Tab = 'schedule' | 'routines';
const tab = ref<Tab>('schedule');
const tabOptions: { value: Tab; label: string }[] = [{ value: 'schedule', label: 'Schedule' }, { value: 'routines', label: 'Routines' }];
const modeOptions: { value: ScheduleMode; label: string }[] = [{ value: 'fixed', label: 'Fixed Week' }, { value: 'rotation', label: 'Rotation' }];
const todayIndex = weekdayIndex();

const dayRoutines = (i: number) =>
  settings.weekSchedule[String(i) as keyof WeekSchedule].map(byId).filter((r): r is WorkoutTemplate => !!r);
const exerciseCount = (list: WorkoutTemplate[]) => {
  const n = list.reduce((sum, r) => sum + r.exercises.length, 0);
  return `${n} exercise${n === 1 ? '' : 's'}`;
};

// ---- Fixed week ----
const dayOpen = ref<number | null>(null);
const dayPick = ref<number[]>([]);
function openDay(i: number) {
  dayPick.value = [...settings.weekSchedule[String(i) as keyof WeekSchedule]];
  dayOpen.value = i;
}
async function saveDay() {
  if (dayOpen.value === null) return;
  await setDay(dayOpen.value, dayPick.value);
  dayOpen.value = null;
}

// ---- Rotation ----
const rotPickOpen = ref(false);
const rotLabel = (id: number) => (id === 0 ? 'Rest day' : byId(id)?.name ?? 'Missing routine');
function moveRot(i: number, d: -1 | 1) {
  const list = [...settings.rotation];
  [list[i], list[i + d]] = [list[i + d], list[i]];
  setRotation(list);
}
function removeRot(i: number) {
  setRotation(settings.rotation.filter((_, j) => j !== i));
}

// ---- Routines ----
const editing = ref(false);
const deleting = ref<WorkoutTemplate | null>(null);
async function newRoutine() {
  const r = await create();
  router.push(`/plan/routine/${r.id}`);
}
async function confirmDelete() {
  if (deleting.value?.id) await remove(deleting.value.id);
  deleting.value = null;
}

onIonViewWillEnter(load);
</script>

<style scoped>
.stack { display: flex; flex-direction: column; gap: 10px; }
.spread { justify-content: space-between; }
.inline { display: inline; margin-left: 4px; }

.day { align-items: center; }
.day-label {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--surface-high);
  font-size: 13px;
  font-weight: 600;
}
.day-label.today { background: var(--primary); color: var(--on-primary); }
.day-name { font-weight: 600; }
.rest { color: var(--text-secondary); }

.rot { gap: 6px; padding: 8px 10px 8px 12px; }
.rot-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 16px;
  text-align: left;
  cursor: pointer;
}
.rot-num {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--surface-high);
  color: var(--text-secondary);
  font-size: 13px;
}
.next {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
}
.mini {
  display: flex;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: var(--surface-high);
  color: var(--text-primary);
  cursor: pointer;
}
.mini:disabled { opacity: 0.3; cursor: default; }
.mini.danger { background: rgba(var(--danger-rgb), 0.16); color: var(--danger); }
/* Chevrons rotated to point up/down for reorder buttons. */
.up { transform: rotate(90deg); }

.soft-btn {
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

.list { display: flex; flex-direction: column; gap: 8px; }
.routine { padding: 12px; border-radius: 16px; gap: 8px; }
.routine-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
}
.text { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.name { font-size: 17px; font-weight: 600; }

.state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 12px; color: var(--text-secondary); text-align: center; }
.state p { margin: 0; line-height: 1.5; }

.checks { display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; background: var(--surface-high); }
.check {
  position: relative;
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-top: 1px solid var(--surface-highest);
  font-size: 16px;
  cursor: pointer;
}
.check:first-child { border-top: 0; }
.check input { position: absolute; opacity: 0; pointer-events: none; }
.box {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--surface-highest);
  border-radius: 7px;
  color: var(--on-primary);
}
.check input:checked + .box { border-color: var(--primary); background: var(--primary); }
.check input:focus-visible + .box { outline: 2px solid var(--primary); outline-offset: 2px; }
.destructive { background: var(--danger); color: #fff; }
</style>
