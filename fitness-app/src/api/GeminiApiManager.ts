// Pinned dated models get sunset without notice (2.5-flash was cut off for
// this key); the "latest" alias tracks whatever Google currently serves.
const MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;

function apiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Gemini returns 503 UNAVAILABLE / 429 RESOURCE_EXHAUSTED during demand
// spikes; both are usually resolved within a couple seconds, so retry
// those with backoff instead of surfacing the raw error immediately.
async function callGemini(body: unknown, attempt = 0): Promise<any> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.ok) return res.json();

  const retryable = res.status === 503 || res.status === 429;
  if (retryable && attempt < MAX_RETRIES) {
    await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
    return callGemini(body, attempt + 1);
  }

  let apiMessage = '';
  try {
    apiMessage = (await res.json())?.error?.message || '';
  } catch {
    // response body wasn't JSON; fall through to the generic message
  }

  throw new Error(
    retryable
      ? "Gemini is experiencing high demand right now. Please try again in a moment."
      : apiMessage || `Gemini API error (${res.status})`
  );
}

export const GeminiApiManager = {
  async analyzeFoodImage(base64Image: string): Promise<{
    name: string; kcal: number; protein: number;
    carbs: number; fats: number; confidence: number;
  }> {
    const base64Data = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;

    const data = await callGemini({
      contents: [{
        parts: [
          {
            text: `Analyze this food image. Identify the dish and estimate nutritional values.
Return ONLY valid JSON with no markdown, no explanation:
{"name":"string","kcal":number,"protein":number,"carbs":number,"fats":number,"confidence":number}
Confidence is 0-100. All numeric values are per serving shown.`
          },
          { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
        ]
      }]
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  },

  async generateInsight(activity: {
    calories: number; caloriesGoal: number;
    activeMinutes: number; activeMinutesGoal: number;
  }): Promise<string> {
    const data = await callGemini({
      contents: [{
        parts: [{
          text: `You are a hardcore motivational coach channeling the mindset of David Goggins and Arnold Schwarzenegger. Based on today's activity:
Calories burned: ${activity.calories}/${activity.caloriesGoal} kcal
Active minutes: ${activity.activeMinutes}/${activity.activeMinutesGoal}

Write a 2-sentence, no-excuses motivational insight with one specific actionable tip.
Be intense, direct, and push past comfort zones - not soft or apologetic. No bullet points.`
        }]
      }]
    });

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
};
