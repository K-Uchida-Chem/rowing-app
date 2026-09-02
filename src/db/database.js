import Dexie from 'dexie';

/**
 * RowingAppDB — IndexedDB database for the Rowing Athlete Management App.
 *
 * All data is stored locally in the browser. No server required.
 * Uses Dexie.js as a friendly wrapper around IndexedDB.
 */
const db = new Dexie('RowingAppDB');

db.version(2).stores({
  // ─── エルゴメーター記録 ───────────────────────────────
  // PM5 OCR or manual input: time, distance, split, watts, rate, HR, RPE, memo
  ergoRecords: '++id, date, type, zone, [date+type]',

  // ─── 筋トレ記録 (BIG3 + 補助) ────────────────────────
  // Exercise, weight, reps, sets, estimated 1RM, Day (1/2/3)
  strengthRecords: '++id, date, exercise, day, [date+day], [date+exercise]',

  // ─── 食事記録 ─────────────────────────────────────────
  // Calories, Protein, Fat, Carbs per meal or daily total
  nutritionRecords: '++id, date, mealType',

  // ─── 体重記録 ─────────────────────────────────────────
  bodyWeightRecords: '++id, date',

  // ─── コンディション記録 ───────────────────────────────
  // Weather, subjective condition, sleep hours, overall RPE
  conditionRecords: '++id, date',

  // ─── 週間メニュー ─────────────────────────────────────
  // dayOfWeek (0: Sunday, 1: Monday, ..., 6: Saturday)
  weeklySchedule: 'dayOfWeek',
});

/**
 * Export all data as a JSON string
 */
export const exportData = async () => {
  const data = {
    ergoRecords: await db.ergoRecords.toArray(),
    strengthRecords: await db.strengthRecords.toArray(),
    nutritionRecords: await db.nutritionRecords.toArray(),
    conditionRecords: await db.conditionRecords.toArray(),
    bodyWeightRecords: await db.bodyWeightRecords.toArray(),
    weeklySchedule: await db.weeklySchedule.toArray(),
  };
  return JSON.stringify(data);
};

/**
 * Import data from a JSON string (WARNING: Overwrites existing data)
 */
export const importData = async (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    
    await db.transaction('rw', db.ergoRecords, db.strengthRecords, db.nutritionRecords, db.conditionRecords, db.bodyWeightRecords, db.weeklySchedule, async () => {
      // Clear all existing data
      await Promise.all([
        db.ergoRecords.clear(),
        db.strengthRecords.clear(),
        db.nutritionRecords.clear(),
        db.conditionRecords.clear(),
        db.bodyWeightRecords.clear(),
        db.weeklySchedule.clear(),
      ]);

      // Bulk add new data
      if (data.ergoRecords?.length) await db.ergoRecords.bulkAdd(data.ergoRecords);
      if (data.strengthRecords?.length) await db.strengthRecords.bulkAdd(data.strengthRecords);
      if (data.nutritionRecords?.length) await db.nutritionRecords.bulkAdd(data.nutritionRecords);
      if (data.conditionRecords?.length) await db.conditionRecords.bulkAdd(data.conditionRecords);
      if (data.bodyWeightRecords?.length) await db.bodyWeightRecords.bulkAdd(data.bodyWeightRecords);
      if (data.weeklySchedule?.length) await db.weeklySchedule.bulkAdd(data.weeklySchedule);
    });
    
    return true;
  } catch (err) {
    console.error('Failed to import data:', err);
    throw err;
  }
};

export default db;

// ─── Helper Functions ─────────────────────────────────────

/**
 * エルゴ記録を保存する
 * @param {Object} record
 * @param {string} record.date - ISO date string (YYYY-MM-DD)
 * @param {string} record.type - 'UT2' | 'UT1' | 'AT' | 'TR' | 'AN' | '2kTT' | 'other'
 * @param {string} record.zone - FISA zone code
 * @param {string} [record.time] - Total time (e.g., "30:00.0")
 * @param {number} [record.distance] - Distance in meters
 * @param {string} [record.split] - 500m split (e.g., "1:52.3")
 * @param {number} [record.watts] - Average watts
 * @param {number} [record.rate] - Strokes per minute (SPM)
 * @param {number} [record.avgHR] - Average heart rate
 * @param {number} [record.maxHR] - Max heart rate
 * @param {number} [record.calories] - Active calories
 * @param {number} [record.rpe] - RPE 1-10
 * @param {string} [record.memo] - Free text memo
 * @param {string} [record.videoUrl] - YouTube/Google Photos link
 * @param {Array} [record.intervals] - Array of interval pieces { id, distance, time, split }
 * @param {string} [record.imageData] - Base64 encoded PM5 image (optional, for reference)
 */
export async function addErgoRecord(record) {
  return db.ergoRecords.add({
    ...record,
    createdAt: new Date().toISOString(),
  });
}

/**
 * 筋トレ記録を保存する
 * @param {Object} record
 * @param {string} record.date - ISO date string (YYYY-MM-DD)
 * @param {string} record.exercise - Exercise name (e.g., 'squat', 'bench', 'deadlift')
 * @param {number} record.day - Day number (1, 2, or 3)
 * @param {number} record.weight - Weight in kg
 * @param {number} record.reps - Number of reps
 * @param {number} record.sets - Number of sets
 * @param {number} [record.estimated1RM] - Auto-calculated estimated 1RM
 * @param {string} [record.phase] - 'hypertrophy' | 'maxStrength' | 'power'
 * @param {string} [record.memo] - Free text memo
 */
export async function addStrengthRecord(record) {
  // Auto-calculate estimated 1RM using Epley formula
  const estimated1RM = record.reps === 1
    ? record.weight
    : Math.round(record.weight * (1 + record.reps / 30));

  return db.strengthRecords.add({
    ...record,
    estimated1RM,
    createdAt: new Date().toISOString(),
  });
}

/**
 * 食事記録を保存する
 * @param {Object} record
 * @param {string} record.date - ISO date string (YYYY-MM-DD)
 * @param {string} [record.mealType] - 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'total'
 * @param {number} record.calories - kcal
 * @param {number} record.protein - grams
 * @param {number} record.fat - grams
 * @param {number} record.carbs - grams
 */
export async function addNutritionRecord(record) {
  return db.nutritionRecords.add({
    ...record,
    createdAt: new Date().toISOString(),
  });
}

/**
 * 体重記録を保存する
 * @param {Object} record
 * @param {string} record.date - ISO date string (YYYY-MM-DD)
 * @param {number} record.weight - Body weight in kg
 */
export async function addBodyWeightRecord(record) {
  return db.bodyWeightRecords.add({
    ...record,
    createdAt: new Date().toISOString(),
  });
}

/**
 * コンディション記録を保存する
 * @param {Object} record
 * @param {string} record.date - ISO date string (YYYY-MM-DD)
 * @param {string} [record.weather] - 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy'
 * @param {string} [record.condition] - 'excellent' | 'good' | 'normal' | 'tired' | 'poor'
 * @param {string} [record.windDirection] - 'headwind' | 'tailwind' | 'crosswind' | 'none'
 * @param {string} [record.windSpeed] - String e.g. "2m/s"
 * @param {number} [record.sleepHours] - Hours of sleep
 * @param {number} [record.overallRPE] - Overall RPE for the day (1-10)
 * @param {string} [record.memo] - Free text memo
 */
export async function addConditionRecord(record) {
  return db.conditionRecords.add({
    ...record,
    createdAt: new Date().toISOString(),
  });
}

// ─── Query Helpers ────────────────────────────────────────

/**
 * 指定日のエルゴ記録をすべて取得する
 */
export async function getErgoRecordsByDate(date) {
  return db.ergoRecords.where('date').equals(date).toArray();
}

/**
 * 指定日の筋トレ記録をすべて取得する
 */
export async function getStrengthRecordsByDate(date) {
  return db.strengthRecords.where('date').equals(date).toArray();
}

/**
 * 指定日の食事記録をすべて取得する
 */
export async function getNutritionRecordsByDate(date) {
  return db.nutritionRecords.where('date').equals(date).toArray();
}

/**
 * 指定日のコンディション記録を取得する
 */
export async function getConditionByDate(date) {
  return db.conditionRecords.where('date').equals(date).first();
}

/**
 * 指定期間のエルゴ記録を取得する（グラフ用）
 */
export async function getErgoRecordsByRange(startDate, endDate) {
  return db.ergoRecords
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray();
}

/**
 * 自己ベストの2000m TT記録を取得する
 */
export async function getBest2kTT() {
  const tts = await db.ergoRecords
    .filter(record => record.type === '2kTT' && record.time)
    .toArray();
    
  if (tts.length === 0) return null;
  
  // time format is like "7:00.0" or "6:58.2", we sort by string since it's MM:SS.0
  // Note: this simple sort works as long as minutes are single digit (which they are for 2k)
  tts.sort((a, b) => {
    // Convert to seconds for accurate comparison
    const parseToSecs = (timeStr) => {
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return 9999;
    };
    return parseToSecs(a.time) - parseToSecs(b.time);
  });
  
  return tts[0];
}

/**
 * 指定種目の筋トレ推定1RM推移を取得する（グラフ用）
 */
export async function getStrength1RMHistory(exercise) {
  return db.strengthRecords
    .where('exercise')
    .equals(exercise)
    .toArray();
}

/**
 * 体重推移を取得する（グラフ用）
 */
export async function getBodyWeightHistory(startDate, endDate) {
  return db.bodyWeightRecords
    .where('date')
    .between(startDate, endDate, true, true)
    .sortBy('date');
}

/**
 * Epley式で推定1RMを計算する
 * @param {number} weight - 使用重量 (kg)
 * @param {number} reps - レップ数
 * @returns {number} 推定1RM
 */
export function calculateEstimated1RM(weight, reps) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// ─── Weekly Schedule Helpers ──────────────────────────────

/**
 * すべての曜日（0〜6）の週間メニューを取得する
 */
export async function getWeeklySchedule() {
  return db.weeklySchedule.toArray();
}

/**
 * 週間メニューを一括更新する
 * @param {Array} scheduleArray - [{ dayOfWeek: 0, ergoType: 'UT2', strengthDay: '1', description: '...' }, ...]
 */
export async function updateWeeklySchedule(scheduleArray) {
  return db.transaction('rw', db.weeklySchedule, async () => {
    await db.weeklySchedule.clear();
    await db.weeklySchedule.bulkAdd(scheduleArray);
  });
}

// ─── Generic CRUD Helpers ───────────────────────────────

/**
 * Delete a specific record from a specific table.
 */
export async function deleteRecord(tableName, id) {
  if (db[tableName]) {
    return await db[tableName].delete(id);
  }
  throw new Error(`Table ${tableName} not found.`);
}

/**
 * Update a specific record in a specific table.
 */
export async function updateRecord(tableName, id, newData) {
  if (db[tableName]) {
    return await db[tableName].update(id, newData);
  }
  throw new Error(`Table ${tableName} not found.`);
}
