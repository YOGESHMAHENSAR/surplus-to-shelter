// Stage 1: AI / computer-vision classification of a food photo.
export const FOOD_TYPES = ['cooked', 'produce', 'bakery', 'dairy', 'meat', 'packaged', 'beverages', 'other'];
const fallback = { itemName: '', foodType: 'other', estimatedWeightKg: 5, confidence: 0, source: 'fallback' };

export async function classifyImage(buffer, mimeType) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: buffer.toString('base64') } },
            { type: 'text', text: `Classify this surplus food photo. Reply with JSON only, no prose: {"itemName": string, "foodType": one of ${JSON.stringify(FOOD_TYPES)}, "estimatedWeightKg": number, "confidence": number 0-1}` },
          ],
        }],
      }),
    });
    const data = await res.json();
    const text = (data.content || []).map((c) => c.text || '').join('').replace(/```json|```/g, '').trim();
    const out = JSON.parse(text);
    return {
      itemName: String(out.itemName || ''),
      foodType: FOOD_TYPES.includes(out.foodType) ? out.foodType : 'other',
      estimatedWeightKg: Math.max(0.1, Number(out.estimatedWeightKg) || 5),
      confidence: Math.min(1, Math.max(0, Number(out.confidence) || 0)),
      source: 'ai',
    };
  } catch (e) {
    console.error('Classification failed:', e.message);
    return fallback;
  }
}
