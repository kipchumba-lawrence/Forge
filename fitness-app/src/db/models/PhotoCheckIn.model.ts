export type Pose = 'front' | 'side' | 'back';

// AI comparison of this photo against an earlier one of the same pose.
export interface PhotoComparison {
  againstId: number;
  summary: string;
  changes: string[];
  caveats?: string;
  createdAt: string;
}

// A mirror progress photo, independent of workouts.
export interface PhotoCheckIn {
  id?: number;
  date: string;           // local 'YYYY-MM-DD'
  createdAt: string;      // ISO timestamp
  pose: Pose;
  blob: Blob;             // JPEG, max 1600px
  thumbnail: Blob;        // JPEG, max 400px
  width: number;
  height: number;
  weightKg?: number;      // that day's weigh-in, if there was one
  comparison?: PhotoComparison;
}
