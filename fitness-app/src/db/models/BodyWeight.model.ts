export interface BodyWeight {
  id?: number;
  date: string;           // local 'YYYY-MM-DD'
  weightKg: number;
  loggedAt: string;       // ISO timestamp, orders multiple weigh-ins on one day
  source: 'manual' | 'checkin';
}
