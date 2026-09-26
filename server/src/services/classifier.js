// Stage 1: AI / computer-vision classification of a food photo.
// Hybrid approach: Google Gemini/Claude for food type/name + segment_density.py for weight estimation
import fs from 'fs';
import path from 'path';
import { runSegmentDensityModel } from './aiService.js';

export const FOOD_TYPES = ['cooked', 'produce', 'bakery', 'dairy', 'meat', 'packaged', 'beverages', 'other'];
const fallback = { itemName: '', foodType: 'other', estimatedWeightKg: 5, confidence: 0, source: 'fallback' };

/**
 * Classifies food image using two-stage approach:
 * 1. Google Gemini or Claude Vision (if available) for food type, item name, and confidence
 * 2. segment_density.py (SAM + volume calculation) for precise weight estimation
 * @param {Buffer|string} photoBuffer - Image buffer or file path
 * @param {string} mimeType - MIME type of image
 * @returns {Promise<Object>} Classification result with foodType, itemName, estimatedWeightKg, confidence, source
 */
export async function classifyImage(photoBuffer, mimeType) {
    let aiResult = fallback;

    // Stage 1: Try Google Gemini first (better free tier)
    const googleKey = process.env.GOOGLE_API_KEY;
    const googleModel = process.env.GOOGLE_MODEL || 'gemini-3-flash-latest';
    if (googleKey) {
        try {
            const buffer = typeof photoBuffer === 'string' ? fs.readFileSync(photoBuffer) : photoBuffer;
            const base64Image = buffer.toString('base64');

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${googleKey}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: `Classify this surplus food photo. Respond with ONLY valid JSON on a single line, no markdown, no explanation: {"itemName": string describing the food, "foodType": one of ${JSON.stringify(FOOD_TYPES)}, "estimatedWeightKg": number 0.1-100, "confidence": number 0-1}` },
                            { inlineData: { mimeType: mimeType, data: base64Image } }
                        ]
                    }]
                })
            });

            const data = await res.json();
            if (data.error) {
                console.warn('❌ Google Gemini API error:', data.error.message);
            } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const text = data.candidates[0].content.parts[0].text.trim();
                const cleanedText = text.replace(/```json|```/g, '').trim();
                const out = JSON.parse(cleanedText);
                aiResult = {
                    itemName: String(out.itemName || ''),
                    foodType: FOOD_TYPES.includes(out.foodType) ? out.foodType : 'other',
                    estimatedWeightKg: Math.max(0.1, Math.min(100, Number(out.estimatedWeightKg) || 5)),
                    confidence: Math.min(1, Math.max(0, Number(out.confidence) || 0)),
                    source: 'gemini',
                };
                console.log('✅ Google Gemini classification result:', aiResult);
            }
        } catch (e) {
            console.warn('⚠️  Google Gemini classification failed:', e.message);
        }
    } else if (process.env.ANTHROPIC_API_KEY) {
        // Fallback to Claude if Google key not available
        try {
            const anthropicKey = process.env.ANTHROPIC_API_KEY;
            const buffer = typeof photoBuffer === 'string' ? fs.readFileSync(photoBuffer) : photoBuffer;
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'x-api-key': googleKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({
                    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
                    max_tokens: 300,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'image', source: { type: 'base64', media_type: mimeType, data: buffer.toString('base64') } },
                            { type: 'text', text: `Classify this surplus food photo. Reply with JSON only, no prose: {"itemName": string, "foodType": one of ${JSON.stringify(FOOD_TYPES)}, "estimatedWeightKg": number between 0.1 and 100, "confidence": number 0-1}` },
                        ],
                    }],
                }),
            });
            const data = await res.json();
            if (data.error) {
                console.warn('❌ Claude API error:', data.error);
            } else {
                const text = (data.content || []).map((c) => c.text || '').join('').replace(/```json|```/g, '').trim();
                const out = JSON.parse(text);
                aiResult = {
                    itemName: String(out.itemName || ''),
                    foodType: FOOD_TYPES.includes(out.foodType) ? out.foodType : 'other',
                    estimatedWeightKg: Math.max(0.1, Math.min(100, Number(out.estimatedWeightKg) || 5)),
                    confidence: Math.min(1, Math.max(0, Number(out.confidence) || 0)),
                    source: 'claude',
                };
                console.log('✅ Claude classification result:', aiResult);
            }
        } catch (e) {
            console.warn('⚠️  Claude classification failed:', e.message);
        }
    } else {
        console.warn('⚠️  GOOGLE_API_KEY or ANTHROPIC_API_KEY not set in .env - AI food classification disabled. Users must enter details manually.');
        return { ...fallback, source: 'unavailable', message: 'AI API key not configured' };
    }

    // // Stage 2: Use segment_density.py for weight estimation (SAM + volume)
    // // NOTE: This provides additional weight validation, but relies on calibrated camera parameters
    // if (typeof photoBuffer === 'string' && fs.existsSync(photoBuffer)) {
    //     try {
    //         const samResult = await runSegmentDensityModel(photoBuffer);
    //         if (samResult && !samResult.error) {
    //             // SAM returns mass in grams; convert to kg
    //             // Apply a sanity check: if result seems excessive, use AI's estimate instead
    //             const samWeightKg = Math.max(0.1, (samResult.estimated_mass_g || 5000) / 1000);
    //             console.log(`📊 SAM raw weight: ${samWeightKg.toFixed(2)} kg from ${samResult.estimated_mass_g}g`);
    //
    //             // Only trust SAM if it's within reasonable bounds (0.1 - 50 kg for food donations)
    //             if (samWeightKg <= 50) {
    //                 weightFromSAM = samWeightKg;
    //                 console.log(`✅ SAM weight ACCEPTED: ${weightFromSAM.toFixed(2)} kg`);
    //             } else {
    //                 console.warn(`⚠️  SAM weight rejected as unrealistic: ${samWeightKg.toFixed(2)} kg (likely miscalibrated camera params)`);
    //             }
    //         } else {
    //             console.warn('⚠️  SAM segmentation failed:', samResult?.error);
    //         }
    //     } catch (e) {
    //         console.warn('⚠️  segment_density.py execution failed:', e.message);
    //     }
    // }

    // Return final result
    const result = {
        itemName: aiResult.itemName,
        foodType: aiResult.foodType,
        estimatedWeightKg: aiResult.estimatedWeightKg,
        confidence: aiResult.confidence,
        source: aiResult.source,
    };

    console.log('📦 Final classification result:', result);
    return result;
}
