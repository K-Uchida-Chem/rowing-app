import { useState, useRef } from 'react';
import { Scale, Utensils, Save, FileImage } from 'lucide-react';
import { NUTRITION_TARGETS } from '../../db/masterData';
import { addNutritionRecord, addBodyWeightRecord } from '../../db/database';

const MEAL_TYPES = [
  { id: 'breakfast', label: '朝食' },
  { id: 'lunch', label: '昼食' },
  { id: 'dinner', label: '夕食' },
  { id: 'snack', label: '間食/補食' },
  { id: 'total', label: '1日合計' },
];

export default function NutritionLogger() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bodyWeight, setBodyWeight] = useState('');
  const [mealType, setMealType] = useState('total');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  const [nutrition, setNutrition] = useState({
    calories: '',
    protein: '',
    fat: '',
    carbs: '',
  });

  const updateNutrition = (field, value) => {
    setNutrition((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const targets = NUTRITION_TARGETS;
  const macroFields = [
    {
      key: 'calories',
      label: 'カロリー',
      unit: 'kcal',
      target: targets.calories,
      color: '#38bdf8',
      gradient: 'linear-gradient(90deg, #38bdf8, #818cf8)',
    },
    {
      key: 'protein',
      label: 'タンパク質 (P)',
      unit: 'g',
      target: targets.protein,
      color: '#f87171',
      gradient: 'linear-gradient(90deg, #f87171, #fb923c)',
    },
    {
      key: 'fat',
      label: '脂質 (F)',
      unit: 'g',
      target: targets.fat,
      color: '#fbbf24',
      gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
    },
    {
      key: 'carbs',
      label: '炭水化物 (C)',
      unit: 'g',
      target: targets.carbs,
      color: '#34d399',
      gradient: 'linear-gradient(90deg, #34d399, #10b981)',
    },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = [];

      if (bodyWeight) {
        promises.push(
          addBodyWeightRecord({
            date,
            weight: Number(bodyWeight),
          })
        );
      }

      if (nutrition.calories || nutrition.protein || nutrition.fat || nutrition.carbs) {
        promises.push(
          addNutritionRecord({
            date,
            mealType,
            calories: nutrition.calories ? Number(nutrition.calories) : 0,
            protein: nutrition.protein ? Number(nutrition.protein) : 0,
            fat: nutrition.fat ? Number(nutrition.fat) : 0,
            carbs: nutrition.carbs ? Number(nutrition.carbs) : 0,
          })
        );
      }

      await Promise.all(promises);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setBodyWeight('');
    setNutrition({ calories: '', protein: '', fat: '', carbs: '' });
    setSaved(false);
  };

  return (
    <div className="space-y-4" id="nutrition-logger">
      <div className="glass-card p-4" id="body-weight-section">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--color-surface-600)] pb-2">
          <Scale size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            体重記録
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              日付
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setSaved(false); }}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)]"
              id="nutrition-date"
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
              体重 (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={bodyWeight}
              onChange={(e) => { setBodyWeight(e.target.value); setSaved(false); }}
              placeholder="75.0"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums text-center text-lg font-bold placeholder:text-[var(--color-text-muted)] placeholder:font-normal"
              id="body-weight-input"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-4" id="meal-type-section">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--color-surface-600)] pb-2">
          <Utensils size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            食事データ
          </h3>
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {MEAL_TYPES.map((meal) => {
            const isActive = mealType === meal.id;
            return (
              <button
                key={meal.id}
                id={`meal-${meal.id}`}
                onClick={() => setMealType(meal.id)}
                className={`
                  flex-shrink-0 px-3 py-2 rounded-xl border cursor-pointer
                  transition-all duration-200 text-xs font-medium whitespace-nowrap
                  ${isActive
                    ? 'bg-[rgba(56,189,248,0.12)] border-[rgba(56,189,248,0.25)] text-[var(--color-accent-primary)]'
                    : 'bg-transparent border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
                  }
                `}
              >
                {meal.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {macroFields.map((macro) => {
            const value = nutrition[macro.key];
            const numVal = value ? Number(value) : 0;
            const pct = Math.min(100, Math.round((numVal / macro.target) * 100));

            return (
              <div key={macro.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {macro.label}
                  </label>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    目標: {macro.target.toLocaleString()} {macro.unit}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => updateNutrition(macro.key, e.target.value)}
                    placeholder="0"
                    className="w-28 px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums text-center font-bold placeholder:font-normal"
                    id={`nutrition-${macro.key}`}
                  />
                  <div className="flex-1">
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: macro.gradient,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] tabular-nums" style={{ color: macro.color }}>
                        {numVal > 0 ? `${numVal.toLocaleString()} ${macro.unit}` : '—'}
                      </span>
                      <span className="text-[9px] tabular-nums font-bold" style={{ color: macro.color }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(nutrition.protein || nutrition.fat || nutrition.carbs) && (
          <PFCRatio
            protein={Number(nutrition.protein) || 0}
            fat={Number(nutrition.fat) || 0}
            carbs={Number(nutrition.carbs) || 0}
          />
        )}
      </div>

      <div className="flex gap-3">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
        <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full px-4 py-3 rounded-xl text-xs font-bold text-[var(--color-text-secondary)] bg-[rgba(255,255,255,0.03)] border border-[var(--color-surface-600)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[var(--color-surface-500)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
                アップロード中...
              </span>
            ) : (
              <><FileImage size={16} /> 料理の写真をアップロード</>
            )}
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-[var(--color-surface-600)] text-[var(--color-text-secondary)] border border-[rgba(56,189,248,0.06)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface-500)]"
          id="nutrition-reset-btn"
        >
          リセット
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`
            flex-[2] px-4 py-3 rounded-xl text-sm font-bold border-none cursor-pointer
            transition-all duration-200
            ${saved
              ? 'bg-[var(--color-accent-success)] text-white'
              : 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white hover:opacity-90'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          id="nutrition-save-btn"
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              保存中...
            </span>
          ) : saved ? (
            '✓ 保存しました'
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Save size={16} /> 記録を保存
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── PFC Ratio Visualization ───────────────────────────────

function PFCRatio({ protein, fat, carbs }) {
  const pCal = protein * 4;
  const fCal = fat * 9;
  const cCal = carbs * 4;
  const total = pCal + fCal + cCal;

  if (total === 0) return null;

  const pPct = Math.round((pCal / total) * 100);
  const fPct = Math.round((fCal / total) * 100);
  const cPct = 100 - pPct - fPct;

  return (
    <div className="mt-4 p-3 rounded-xl bg-[rgba(56,189,248,0.04)] border border-[rgba(56,189,248,0.06)]" id="pfc-ratio">
      <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-2">
        PFC比率（カロリーベース）
      </p>
      <div className="flex rounded-lg overflow-hidden h-3 mb-2">
        <div style={{ width: `${pPct}%`, background: 'linear-gradient(90deg, #f87171, #fb923c)' }} />
        <div style={{ width: `${fPct}%`, background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }} />
        <div style={{ width: `${cPct}%`, background: 'linear-gradient(90deg, #34d399, #10b981)' }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-[#f87171] font-bold">P {pPct}%</span>
        <span className="text-[#fbbf24] font-bold">F {fPct}%</span>
        <span className="text-[#34d399] font-bold">C {cPct}%</span>
      </div>
    </div>
  );
}
