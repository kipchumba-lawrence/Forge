const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const VISION_MODEL = 'gpt-4o-mini';
const TEXT_MODEL = 'gpt-4o-mini';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;

function apiKey() {
  return import.meta.env.VITE_OPENAI_API_KEY || '';
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// OpenAI returns 429 (rate limit) / 503 (overloaded) during demand spikes;
// both are usually resolved within a couple seconds, so retry those with
// backoff instead of surfacing the raw error immediately.
async function callOpenAI(body: unknown, attempt = 0): Promise<any> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey()}`
    },
    body: JSON.stringify(body)
  });

  if (res.ok) return res.json();

  const retryable = res.status === 429 || res.status === 503;
  if (retryable && attempt < MAX_RETRIES) {
    await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
    return callOpenAI(body, attempt + 1);
  }

  let apiMessage = '';
  try {
    apiMessage = (await res.json())?.error?.message || '';
  } catch {
    // response body wasn't JSON; fall through to the generic message
  }

  throw new Error(
    retryable
      ? 'OpenAI is experiencing high demand right now. Please try again in a moment.'
      : apiMessage || `OpenAI API error (${res.status})`
  );
}

export const OpenAiApiManager = {
  async analyzeFoodImage(base64Image: string): Promise<{
    name: string; kcal: number; protein: number;
    carbs: number; fats: number; confidence: number;
  }> {
    const dataUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

    const data = await callOpenAI({
      model: VISION_MODEL,
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
      max_tokens: 300
    });

    const text = data.choices?.[0]?.message?.content ?? '{}';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  },

  async generateInsight(activity: {
    calories: number; caloriesGoal: number;
    activeMinutes: number; activeMinutesGoal: number;
  }): Promise<string> {
    const data = await callOpenAI({
      model: TEXT_MODEL,
      messages: [{
        role: 'user',
        content: `You are a hardcore motivational coach channeling the mindset of David Goggins and Arnold Schwarzenegger. Based on today's activity:
Calories burned: ${activity.calories}/${activity.caloriesGoal} kcal
Active minutes: ${activity.activeMinutes}/${activity.activeMinutesGoal}

Write a 2-sentence, no-excuses motivational insight with one specific actionable tip.
Be intense, direct, and push past comfort zones - not soft or apologetic. No bullet points.`
      }],
      max_tokens: 150
    });

    return data.choices?.[0]?.message?.content ?? '';
  }
};
