// Structural balance tables: each lift's expected strength as a % of an
// anchor lift in the same chain, compared using estimated 1RMs.
//
// SOURCES — check these before shipping:
// - Poliquin "front squat 85%" and "deadlift 125%" of back squat match
//   published summaries of Poliquin's ratios (opexfit.com, breakingmuscle.com).
// - The other Poliquin numbers (incline 91%, dips 117%, supine pull-up 87%
//   of close-grip bench) come from the Cut Plan design mockup and have not
//   been checked against Poliquin's own material.
// - Thibaudeau and ATG are left empty on purpose: no complete source was
//   found, and invented ratios would mislabel real lifters as "weak".
//   Fill them in from the original material, then set `verified: true`.

export type RatioTableId = 'poliquin' | 'thibaudeau' | 'atg';

export interface RatioLift {
  id: string;
  label: string;
  chain: string;                 // lifts are only compared within a chain
  anchor?: boolean;              // the 100% lift for its chain
  ratio: number;                 // expected e1RM ÷ anchor e1RM
  defaultExerciseName: string;   // matched against the exercise catalog by name
  addsBodyWeight?: boolean;      // dips/pull-ups: load = body weight + logged weight
}

export interface RatioTable {
  id: RatioTableId;
  label: string;
  verified: boolean;
  lifts: RatioLift[];
}

export const RATIO_TABLES: Record<RatioTableId, RatioTable> = {
  poliquin: {
    id: 'poliquin',
    label: 'Poliquin',
    verified: false,
    lifts: [
      { id: 'cg-bench', label: 'Close-grip bench press', chain: 'upper', anchor: true, ratio: 1, defaultExerciseName: 'Barbell Close-Grip Bench Press' },
      { id: 'incline-bench', label: 'Incline bench press', chain: 'upper', ratio: 0.91, defaultExerciseName: 'Barbell Incline Bench Press' },
      { id: 'dips', label: 'Dips (bodyweight + load)', chain: 'upper', ratio: 1.17, defaultExerciseName: 'Chest Dip', addsBodyWeight: true },
      { id: 'supine-pullup', label: 'Supine pull-ups', chain: 'upper', ratio: 0.87, defaultExerciseName: 'Pull-Up', addsBodyWeight: true },
      { id: 'back-squat', label: 'High-bar back squat', chain: 'lower', anchor: true, ratio: 1, defaultExerciseName: 'Barbell Full Squat' },
      { id: 'front-squat', label: 'Front squat', chain: 'lower', ratio: 0.85, defaultExerciseName: 'Barbell Front Squat' },
      { id: 'deadlift', label: 'Deadlift', chain: 'lower', ratio: 1.25, defaultExerciseName: 'Barbell Deadlift' }
    ]
  },
  thibaudeau: { id: 'thibaudeau', label: 'Thibaudeau', verified: false, lifts: [] },
  atg: { id: 'atg', label: 'ATG', verified: false, lifts: [] }
};

// Within ±5% of the expected ratio counts as balanced.
export const BALANCE_TOLERANCE = 0.05;
