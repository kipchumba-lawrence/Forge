import Dexie, { type Table } from 'dexie';
import type { Exercise } from './models/Exercise.model';
import type { FoodEntry } from './models/FoodEntry.model';
import type { WorkoutSession } from './models/WorkoutSession.model';
import type { WorkoutTemplate } from './models/WorkoutTemplate.model';
import type { DailyActivity } from './models/DailyActivity.model';
import type { BodyWeight } from './models/BodyWeight.model';
import type { WorkoutMedia } from './models/WorkoutMedia.model';
import type { AppSettingRow } from './models/AppSetting.model';
import type { PhotoCheckIn } from './models/PhotoCheckIn.model';

export class AppDatabase extends Dexie {
  exercises!: Table<Exercise>;
  foodEntries!: Table<FoodEntry>;
  workoutSessions!: Table<WorkoutSession>;
  workoutTemplates!: Table<WorkoutTemplate>;
  dailyActivity!: Table<DailyActivity>;
  aiInsights!: Table<{ id?: number; date: string; type: string; content: string }>;
  bodyWeights!: Table<BodyWeight>;
  workoutMedia!: Table<WorkoutMedia>;
  settings!: Table<AppSettingRow, string>;
  photoCheckIns!: Table<PhotoCheckIn>;

  constructor() {
    super('FitnessTrackerDB');
    this.version(1).stores({
      exercises:       '++id, bodyPart, equipment, target, name, exerciseDbId',
      foodEntries:     '++id, date, mealType',
      workoutSessions: '++id, date, status',
      dailyActivity:   '++id, date',
      aiInsights:      '++id, date, type',
    });
    this.version(2).stores({
      exercises:       '++id, bodyPart, equipment, target, name, &exerciseDbId',
    });
    this.version(3).stores({
      exercises:        '++id, bodyPart, equipment, target, name, &exerciseDbId, isFavorite',
      workoutTemplates: '++id, name, createdAt',
    });
    this.version(4).stores({
      bodyWeights:  '++id, date, loggedAt',
      workoutMedia: '++id, sessionId, date, kind',
      settings:     '&key',
    });
    this.version(5).stores({
      photoCheckIns: '++id, date, pose, createdAt',
    });
  }
}

export const db = new AppDatabase();
