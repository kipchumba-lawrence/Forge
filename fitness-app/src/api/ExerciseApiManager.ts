const BASE = 'https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1';
const RAPIDAPI_HOST = 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';

function headers() {
  return {
    'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY || '',
    'X-RapidAPI-Host': RAPIDAPI_HOST
  };
}

// The live API ignores `offset` and has no /bodyparts/{x}/exercises,
// /equipments/{x}/exercises, /muscles/{x}/exercises routes (all 404).
// Filtering is done via bodyParts/equipments/targetMuscles query params
// on /exercises, and pagination is cursor-based via `after` + meta.nextCursor.
async function listExercises(params: Record<string, string | number | undefined>) {
  const url = new URL(`${BASE}/exercises`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error('ExerciseDB fetch failed');
  const json = await res.json();
  return json.data || [];
}

export const ExerciseApiManager = {
  // One page of the catalog plus the cursor for the next (null at the end).
  // The API returns at most 25 per page regardless of `limit`.
  async getPage(after?: string): Promise<{ data: any[]; nextCursor: string | null; total: number }> {
    const url = new URL(`${BASE}/exercises`);
    url.searchParams.set('limit', '25');
    if (after) url.searchParams.set('after', after);
    const res = await fetch(url.toString(), { headers: headers() });
    if (res.status === 429) throw new Error('The exercise library is rate-limited right now. Try again later.');
    if (!res.ok) throw new Error('Could not reach the exercise library.');
    const json = await res.json();
    return {
      data: json.data || [],
      nextCursor: json.meta?.hasNextPage ? json.meta.nextCursor ?? null : null,
      total: json.meta?.total ?? 0
    };
  },
  async getAll(limit = 20, after?: string) {
    return listExercises({ limit, after });
  },
  // Combines all three facets in one request: comma-joined values within a
  // facet OR together (e.g. bodyParts=chest,back), while separate facets
  // AND together (bodyParts=chest&equipments=barbell narrows to both).
  async query(filters: { bodyParts?: string[]; equipments?: string[]; targets?: string[]; limit?: number; after?: string }) {
    return listExercises({
      bodyParts: filters.bodyParts?.length ? filters.bodyParts.join(',') : undefined,
      equipments: filters.equipments?.length ? filters.equipments.join(',') : undefined,
      targetMuscles: filters.targets?.length ? filters.targets.join(',') : undefined,
      limit: filters.limit,
      after: filters.after
    });
  },
  async getBodyPartList() {
    const res = await fetch(`${BASE}/bodyparts`, { headers: headers() });
    const json = await res.json();
    return (json.data || []).map((i: any) => i.name);
  },
  async getEquipmentList() {
    const res = await fetch(`${BASE}/equipments`, { headers: headers() });
    const json = await res.json();
    return (json.data || []).map((i: any) => i.name);
  },
  async getTargetList() {
    const res = await fetch(`${BASE}/muscles`, { headers: headers() });
    const json = await res.json();
    return (json.data || []).map((i: any) => i.name);
  },
  async getDetail(exerciseId: string) {
    const res = await fetch(`${BASE}/exercises/${exerciseId}`, { headers: headers() });
    if (!res.ok) throw new Error('ExerciseDB detail fetch failed');
    const json = await res.json();
    return json.data;
  },
  async search(query: string, limit?: number) {
    const url = new URL(`${BASE}/exercises/search`);
    url.searchParams.set('search', query);
    if (limit) url.searchParams.set('limit', String(limit));
    const res = await fetch(url.toString(), { headers: headers() });
    if (!res.ok) throw new Error('ExerciseDB search failed');
    const json = await res.json();
    return json.data || [];
  },
};
