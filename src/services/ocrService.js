/**
 * OCR Service — Gemini API Vision for PM5 monitor and smartwatch screenshot analysis.
 *
 * Uses the @google/genai SDK to extract rowing metrics from images.
 * API key is stored in localStorage for privacy (never sent to any server except Google's API).
 */

import { GoogleGenAI } from '@google/genai';

const API_KEY_STORAGE_KEY = 'rowpro_gemini_api_key';

/**
 * Get stored API key from localStorage
 */
export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

/**
 * Save API key to localStorage
 */
export function setApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

/**
 * Check if API key is configured
 */
export function hasApiKey() {
  return !!getApiKey();
}

/**
 * Convert a File object to base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove the data:image/...;base64, prefix
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract ergo data from a PM5 monitor image using Gemini Vision.
 *
 * @param {File} imageFile - The image file from input or camera
 * @returns {Promise<Object>} Extracted ergo data: { time, distance, split, watts, rate }
 */
export async function extractErgoData(imageFile) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API キーが設定されていません。設定画面からAPIキーを入力してください。');
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToBase64(imageFile);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are an OCR system specialized in reading Concept2 PM5 rowing ergometer monitors.
Analyze this image of a PM5 monitor screen and extract the following data.
Return ONLY a valid JSON object with these exact keys (use null if a value cannot be read):

{
  "time": "string - total time in format MM:SS.T or H:MM:SS.T",
  "distance": "number - total distance in meters",
  "split": "string - 500m split time in format M:SS.T",
  "watts": "number - average watts",
  "rate": "number - strokes per minute (s/m or SPM)"
}

Important:
- The PM5 displays time, distance, pace (/500m), watts, and s/m (stroke rate)
- Split/pace is labeled as "/500m" and is in format like 2:00.0 or 1:52.3
- Rate/stroke rate is labeled as "s/m" or "SPM"
- Distance is in meters
- If this is not a PM5 image, return all null values
- Return ONLY the JSON, no explanation`,
          },
          {
            inlineData: {
              mimeType: imageFile.type || 'image/jpeg',
              data: base64Data,
            },
          },
        ],
      },
    ],
  });

  const text = response.response.text();

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('OCR結果のパースに失敗しました。画像が正しいか確認してください。');
  }

  try {
    const data = JSON.parse(jsonMatch[0]);
    return {
      time: data.time || '',
      distance: data.distance ? String(data.distance) : '',
      split: data.split || '',
      watts: data.watts ? String(data.watts) : '',
      rate: data.rate ? String(data.rate) : '',
    };
  } catch (e) {
    throw new Error('OCR結果のパースに失敗しました: ' + e.message);
  }
}

/**
 * Extract heart rate data from a smartwatch screenshot.
 *
 * @param {File} imageFile - Screenshot from Apple Watch, Garmin, etc.
 * @returns {Promise<Object>} Extracted HR data: { avgHR, maxHR, calories }
 */
export async function extractWatchData(imageFile) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API キーが設定されていません。');
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToBase64(imageFile);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are an OCR system for smartwatch workout screenshots (Apple Watch, Garmin, Polar, etc.).
Extract heart rate and calorie data from this workout screenshot.
Return ONLY a valid JSON object:

{
  "avgHR": "number or null - average heart rate in bpm",
  "maxHR": "number or null - maximum heart rate in bpm",
  "calories": "number or null - active/total calories burned"
}

Return ONLY the JSON, no explanation.`,
          },
          {
            inlineData: {
              mimeType: imageFile.type || 'image/jpeg',
              data: base64Data,
            },
          },
        ],
      },
    ],
  });

  const text = response.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('スマートウォッチ画像の解析に失敗しました。');
  }

  try {
    const data = JSON.parse(jsonMatch[0]);
    return {
      avgHR: data.avgHR ? String(data.avgHR) : '',
      maxHR: data.maxHR ? String(data.maxHR) : '',
      calories: data.calories ? String(data.calories) : '',
    };
  } catch (e) {
    throw new Error('解析結果のパースに失敗しました: ' + e.message);
  }
}
