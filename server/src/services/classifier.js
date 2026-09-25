// Stage 1: photo -> food type (vision model) + weight (OpenCV reference-object method).
export const FOOD_TYPES = ['cooked', 'produce', 'bakery', 'dairy', 'meat', 'packaged', 'beverages', 'other'];

async function claudeClassify(buffer, mimeType) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: buffer.toString('base64') } },
          { type: 'text', text: `Classify this surplus food photo. Reply with JSON only, no prose: {"itemName": string, "foodType": one of ${JSON.stringify(FOOD_TYPES)}, "estimatedWeightKg": number, "confidence": number 0-1}` },
        ] }],
      }),
    });
    const data = await res.json();
    const out = JSON.parse((data.content || []).map((c) => c.text || '').join('').replace(/```json|```/g, '').trim());
    return {
      itemName: String(out.itemName || ''),
      foodType: FOOD_TYPES.includes(out.foodType) ? out.foodType : 'other',
      weightKg: Math.max(0.1, Number(out.estimatedWeightKg) || 0) || null,
      confidence: Math.min(1, Math.max(0, Number(out.confidence) || 0)),
    };
  } catch (e) { console.error('Vision model failed:', e.message); return null; }
}

// OpenCV microservice: finds the reference card in the photo and converts food area to weight
async function opencvWeight(buffer, mimeType, foodType) {
  const url = process.env.VISION_URL || 'http://localhost:8000';
  try {
    const fd = new FormData();
    fd.append('file', new Blob([buffer], { type: mimeType }), 'photo.jpg');
    fd.append('food_type', foodType);
    fd.append('reference', process.env.REF_OBJECT || 'card');
    const res = await fetch(`${url}/estimate-weight`, { method: 'POST', body: fd, signal: AbortSignal.timeout(20000) });
    return await res.json();
  } catch (e) { console.error('OpenCV service unreachable:', e.message); return { unreachable: true }; }
}

export async function classifyImage(buffer, mimeType) {
  const out = { itemName: '', foodType: 'other', estimatedWeightKg: null, confidence: 0, source: 'none', weightSource: 'none', annotated: null, note: '' };
  const ai = await claudeClassify(buffer, mimeType);
  if (ai) Object.assign(out, { itemName: ai.itemName, foodType: ai.foodType, confidence: ai.confidence, source: 'ai' });

  const cv = await opencvWeight(buffer, mimeType, out.foodType);
  if (cv.reference_found && cv.weight_kg) {
    Object.assign(out, { estimatedWeightKg: cv.weight_kg, weightSource: 'opencv', annotated: cv.annotated, areaCm2: cv.area_cm2 });
    if (!ai) out.confidence = cv.confidence;
  } else {
    out.note = cv.unreachable ? 'Weight service is offline.' : cv.message || '';
    if (ai?.weightKg) Object.assign(out, { estimatedWeightKg: ai.weightKg, weightSource: 'ai' });
  }
  return out;
}
