// Local calendar dates as 'YYYY-MM-DD'. Every stored `date` uses this.
// (toISOString() gives the UTC date, which rolls over at the wrong time
// outside UTC: a 1am workout in Nairobi would land on yesterday.)
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

// Weeks start on Monday, matching the design's "Week of 5 Oct" grouping.
export function weekStart(date: string): string {
  const d = parseLocalDate(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return localDateString(d);
}

// Consecutive weeks (Mon–Sun) with at least one of `dates`. The current week
// only breaks the streak once it's over, so a Monday with no workout yet
// still shows last week's streak.
export function weekStreak(dates: Iterable<string>, today: string = localDateString()): number {
  const weeks = new Set([...dates].map(weekStart));
  let cursor = weekStart(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}
