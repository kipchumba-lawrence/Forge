// Display groups used by Stats (muscle balance, weekly volume), Explore
// muscles and the routine editor's "What this session hits".
export type MuscleGroup =
  | 'traps' | 'shoulders' | 'chest' | 'upperBack' | 'lowerBack'
  | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'serratus'
  | 'glutes' | 'hipFlexors' | 'adductors' | 'quads' | 'hamstrings' | 'calves' | 'neck';

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'traps', label: 'Traps' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'chest', label: 'Chest' },
  { id: 'upperBack', label: 'Upper back' },
  { id: 'lowerBack', label: 'Lower back' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'abs', label: 'Abs' },
  { id: 'serratus', label: 'Serratus' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'hipFlexors', label: 'Hip flexors' },
  { id: 'adductors', label: 'Adductors' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'calves', label: 'Calves' },
  { id: 'neck', label: 'Neck' }
];

// Every muscle name the ExerciseDB /muscles endpoint returns (lowercased, as
// stored on Exercise). Unknown names are ignored rather than guessed, so a new
// API muscle shows up as "unmapped" instead of inflating the wrong group.
export const MUSCLE_TO_GROUP: Record<string, MuscleGroup> = {
  'trapezius upper fibers': 'traps',
  'levator scapulae': 'traps',

  'anterior deltoid': 'shoulders',
  'lateral deltoid': 'shoulders',
  'posterior deltoid': 'shoulders',
  'infraspinatus': 'shoulders',
  'teres minor': 'shoulders',
  'subscapularis': 'shoulders',

  'pectoralis major clavicular head': 'chest',
  'pectoralis major sternal head': 'chest',

  'latissimus dorsi': 'upperBack',
  'teres major': 'upperBack',
  'trapezius middle fibers': 'upperBack',
  'trapezius lower fibers': 'upperBack',

  'erector spinae': 'lowerBack',

  'biceps brachii': 'biceps',
  'brachialis': 'biceps',
  'triceps brachii': 'triceps',
  'brachioradialis': 'forearms',
  'wrist extensors': 'forearms',
  'wrist flexors': 'forearms',

  'rectus abdominis': 'abs',
  'obliques': 'abs',
  'transversus abdominis': 'abs',
  'serratus anterior': 'serratus',
  'serratus ante': 'serratus',          // truncated duplicate the API also returns

  'gluteus maximus': 'glutes',
  'gluteus medius': 'glutes',
  'gluteus minimus': 'glutes',
  'deep hip external rotators': 'glutes',
  'tensor fasciae latae': 'glutes',
  'iliopsoas': 'hipFlexors',
  'sartorius': 'hipFlexors',
  'adductor longus': 'adductors',
  'adductor brevis': 'adductors',
  'adductor magnus': 'adductors',
  'gracilis': 'adductors',
  'pectineus': 'adductors',

  'quadriceps': 'quads',
  'hamstrings': 'hamstrings',
  'gastrocnemius': 'calves',
  'soleus': 'calves',
  'popliteus': 'calves',
  'tibialis anterior': 'calves',

  'splenius': 'neck',
  'sternocleidomastoid': 'neck'
};

// A set counts fully toward each primary group and fractionally toward each
// secondary group, so a bench press set adds 1 to chest and 0.5 to triceps
// and shoulders. This is where fractional totals like "14.4 sets" come from.
// Groups are deduped per exercise: three secondary deltoid heads still add
// 0.5 to shoulders, not 1.5.
export const SECONDARY_SET_WEIGHT = 0.5;

export function groupFor(muscle: string): MuscleGroup | undefined {
  return MUSCLE_TO_GROUP[muscle.toLowerCase().trim()];
}

export function groupsForExercise(ex: { target?: string; targetMuscles?: string[]; secondaryMuscles?: string[] }) {
  const primaryNames = ex.targetMuscles?.length ? ex.targetMuscles : ex.target ? [ex.target] : [];
  const primary = new Set<MuscleGroup>();
  for (const m of primaryNames) {
    const g = groupFor(m);
    if (g) primary.add(g);
  }
  const secondary = new Set<MuscleGroup>();
  for (const m of ex.secondaryMuscles ?? []) {
    const g = groupFor(m);
    if (g && !primary.has(g)) secondary.add(g);
  }
  return { primary, secondary };
}
