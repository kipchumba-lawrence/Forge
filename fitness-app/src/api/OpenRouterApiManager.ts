const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// "openrouter/free" auto-selects among OpenRouter's free-tier models and
// filters for the capabilities the request needs (here, image input) —
// more resilient than pinning one free model, since individual free
// models get deprecated/rotated out without notice.
const MODEL = 'openrouter/free';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;

function apiKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || '';
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// The free router often picks a "reasoning" model, which spends its token
// budget thinking before it answers; with a small max_tokens it runs out
// (finish_reason "length") and returns empty content. Keep reasoning short,
// leave it out of the response, and give every request room to answer.
const REASONING = { effort: 'low', exclude: true } as const;

// Free-tier OpenRouter traffic can hit 429 (rate limit) / 503 (upstream
// model overloaded) during demand spikes; both are usually resolved within
// a couple seconds, so retry those with backoff instead of surfacing the
// raw error immediately.
async function callOpenRouter(body: Record<string, unknown>, attempt = 0): Promise<any> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey()}`,
      'X-Title': 'Forge Fitness'
    },
    body: JSON.stringify({ reasoning: REASONING, ...body })
  });

  if (res.ok) {
    const data = await res.json();
    // An upstream provider failure can arrive as HTTP 200 with an error body
    // and no choices; the router usually picks a working model on retry.
    if (!data?.choices?.length) {
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
        return callOpenRouter(body, attempt + 1);
      }
      throw new Error('The free AI tier is unavailable right now. Please try again in a moment.');
    }
    return data;
  }

  const retryable = res.status === 429 || res.status === 503;
  if (retryable && attempt < MAX_RETRIES) {
    await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
    return callOpenRouter(body, attempt + 1);
  }

  let apiMessage = '';
  try {
    apiMessage = (await res.json())?.error?.message || '';
  } catch {
    // response body wasn't JSON; fall through to the generic message
  }

  throw new Error(
    retryable
      ? 'The free AI tier is experiencing high demand right now. Please try again in a moment.'
      : apiMessage || `OpenRouter API error (${res.status})`
  );
}

// Finds the last JSON object in `text` that has `key`. Some free models
// ignore "JSON only" and print their reasoning (with stray braces) first.
function extractJson(text: string, key: string): Record<string, any> | null {
  let found: Record<string, any> | null = null;
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        try {
          const obj = JSON.parse(text.slice(start, i + 1));
          if (obj && typeof obj === 'object' && key in obj) found = obj;
        } catch { /* not valid JSON; keep scanning */ }
        break;
      }
    }
  }
  return found;
}

export const OpenRouterApiManager = {
  async analyzeFoodImage(base64Image: string): Promise<{
    name: string; kcal: number; protein: number;
    carbs: number; fats: number; confidence: number;
  }> {
    const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

    const data = await callOpenRouter({
      model: MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this food image. Identify the dish and estimate nutritional values.
Return ONLY valid JSON with no markdown, no explanation:
{"name":"string","kcal":number,"protein":number,"carbs":number,"fats":number,"confidence":number}
Confidence is 0-100. All numeric values are per serving shown.`
          },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }],
      max_tokens: 1500
    });

    const text: string = data.choices?.[0]?.message?.content ?? '';
    const result = extractJson(text, 'kcal');
    if (!result) throw new Error("The AI couldn't read that photo. Try again, or enter the meal manually.");
    return result as { name: string; kcal: number; protein: number; carbs: number; fats: number; confidence: number };
  },

  // Compares two progress photos of the same pose, oldest first.
  async compareProgressPhotos(input: {
    beforeImage: string; afterImage: string;      // JPEG data URLs
    beforeDate: string; afterDate: string;
    beforeWeightKg?: number; afterWeightKg?: number;
    pose: 'front' | 'side' | 'back';
  }): Promise<{ summary: string; changes: string[]; caveats?: string }> {
    const weightLine = input.beforeWeightKg != null && input.afterWeightKg != null
      ? `Logged body weight went from ${input.beforeWeightKg} kg to ${input.afterWeightKg} kg.`
      : 'Body weight was not logged for both photos.';

    const data = await callOpenRouter({
      model: MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an experienced physique coach reviewing a client's progress photos.
Image 1 is the earlier photo (${input.beforeDate}); image 2 is the latest (${input.afterDate}). Both are ${input.pose} poses, taken in a mirror.
${weightLine} The client is on a fat-loss cut.

Compare the two photos and describe what has visibly changed: waist and midsection, shoulders and arms, chest, back, legs, muscle definition and vascularity, posture. Be specific, honest and encouraging. Say so plainly if little has changed.
Only describe what you can actually see. Do not estimate body-fat percentage or make medical claims, and do not comment on anything other than physique.
If lighting, camera angle, distance, pump or clothing differ enough to distort the comparison, say so in caveats.

Return ONLY valid JSON with no markdown:
{"summary":"2-3 sentence overall verdict","changes":["specific visible change", "..."],"caveats":"comparison limitations, or empty string"}`
          },
          { type: 'image_url', image_url: { url: input.beforeImage } },
          { type: 'image_url', image_url: { url: input.afterImage } }
        ]
      }],
      max_tokens: 2000
    });

    const text = (data.choices?.[0]?.message?.content ?? '').trim();
    if (!text) throw new Error('The AI returned an empty comparison. Try again in a moment.');

    const parsed = extractJson(text, 'summary');
    if (parsed && typeof parsed.summary === 'string' && parsed.summary.trim()) {
      const changes = Array.isArray(parsed.changes) ? parsed.changes.filter((c: unknown) => typeof c === 'string' && c.trim()) : [];
      const caveats = typeof parsed.caveats === 'string' && parsed.caveats.trim() ? parsed.caveats.trim() : undefined;
      return { summary: parsed.summary.trim(), changes, caveats };
    }
    // No usable JSON. Short prose is still a usable answer; a long dump is
    // almost certainly leaked reasoning, so ask the user to retry instead.
    const prose = text.replace(/```(json)?/g, '').trim();
    if (prose.length > 1200) throw new Error("The AI's answer came back garbled. Tap Compare again.");
    return { summary: prose, changes: [] };
  },

  async generateInsight(activity: {
    calories: number; caloriesGoal: number;
    activeMinutes: number; activeMinutesGoal: number;
  }): Promise<string> {
    const data = await callOpenRouter({
      model: MODEL,
      messages: [{
        role: 'user',
        content: `You are a hardcore motivational coach channeling the mindset of David Goggins and Arnold Schwarzenegger. Based on today's activity:
Calories burned: ${activity.calories}/${activity.caloriesGoal} kcal
Active minutes: ${activity.activeMinutes}/${activity.activeMinutesGoal}

Write a 2-sentence, no-excuses motivational insight with one specific actionable tip.
Be intense, direct, and push past comfort zones - not soft or apologetic. No bullet points.`
      }],
      max_tokens: 1000
    });

    // Free-tier models occasionally answer with an empty message; treat that
    // as a failure so the caller falls back instead of caching a blank.
    const text = (data.choices?.[0]?.message?.content ?? '').trim();
    if (!text) throw new Error('The AI returned an empty insight');
    return text;
  }
};
