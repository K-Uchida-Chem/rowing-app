import React, { useState, useEffect } from 'react';
import { STRENGTH_EXERCISES } from '../../db/masterData';

export default function RecordEditModal({ record, tableName, onClose, onSave }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (record) {
      setFormData({ ...record });
    }
  }, [record]);

  if (!record) return null;

  const handleChange = (e, field) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSave = () => {
    // Basic validation & numeric conversion based on table
    const dataToSave = { ...formData };
    
    if (tableName === 'ergoRecords') {
      if (dataToSave.distance) dataToSave.distance = Number(dataToSave.distance);
      if (dataToSave.watts) dataToSave.watts = Number(dataToSave.watts);
      if (dataToSave.rate) dataToSave.rate = Number(dataToSave.rate);
      if (dataToSave.hr) dataToSave.hr = Number(dataToSave.hr);
      if (dataToSave.rpe) dataToSave.rpe = Number(dataToSave.rpe);
    } else if (tableName === 'bodyWeightRecords') {
      if (dataToSave.weight) dataToSave.weight = Number(dataToSave.weight);
    } else if (tableName === 'nutritionRecords') {
      if (dataToSave.calories) dataToSave.calories = Number(dataToSave.calories);
      if (dataToSave.protein) dataToSave.protein = Number(dataToSave.protein);
      if (dataToSave.fat) dataToSave.fat = Number(dataToSave.fat);
      if (dataToSave.carbs) dataToSave.carbs = Number(dataToSave.carbs);
    }
    // For strengthRecords, the array mapping handles numeric conversion if needed, 
    // but we will keep sets as is unless modified below.

    onSave(dataToSave);
  };

  const renderErgoForm = () => (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><label className={labelStyle}>Time</label><input type="text" value={formData.time || ''} onChange={(e) => handleChange(e, 'time')} className={inputStyle} /></div>
        <div><label className={labelStyle}>Distance (m)</label><input type="number" value={formData.distance || ''} onChange={(e) => handleChange(e, 'distance')} className={inputStyle} /></div>
        <div><label className={labelStyle}>Split (500m)</label><input type="text" value={formData.split || ''} onChange={(e) => handleChange(e, 'split')} className={inputStyle} /></div>
        <div><label className={labelStyle}>Rate (SPM)</label><input type="number" value={formData.rate || ''} onChange={(e) => handleChange(e, 'rate')} className={inputStyle} /></div>
        <div><label className={labelStyle}>Watts</label><input type="number" value={formData.watts || ''} onChange={(e) => handleChange(e, 'watts')} className={inputStyle} /></div>
        <div><label className={labelStyle}>HR</label><input type="number" value={formData.hr || ''} onChange={(e) => handleChange(e, 'hr')} className={inputStyle} /></div>
      </div>
      <div><label className={labelStyle}>Memo</label><textarea value={formData.memo || ''} onChange={(e) => handleChange(e, 'memo')} className={`${inputStyle} h-20 resize-none`} /></div>
    </>
  );

  const renderStrengthForm = () => {
    // If it's the old corrupted format where sets is a number, we can't easily edit it here, but let's try to handle arrays.
    const isArray = Array.isArray(formData.sets);
    
    return (
      <>
        <div className="mb-4">
          <label className={labelStyle}>種目</label>
          <div className="text-[var(--color-text-primary)] font-bold mb-2">
             {STRENGTH_EXERCISES[formData.exercise]?.name || formData.exercise || '筋トレ'}
          </div>
        </div>

        {isArray ? (
          <div className="space-y-3 mb-4">
            {formData.sets.map((set, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-xs text-[var(--color-text-muted)] w-10">Set {idx + 1}</span>
                <input 
                  type="number" 
                  value={set.weight || ''} 
                  onChange={(e) => {
                    const newSets = [...formData.sets];
                    newSets[idx].weight = Number(e.target.value);
                    setFormData({...formData, sets: newSets});
                  }}
                  className={inputStyle} 
                  placeholder="kg"
                />
                <span className="text-[var(--color-text-muted)]">kg</span>
                <span className="text-[var(--color-text-muted)] mx-1">×</span>
                <input 
                  type="number" 
                  value={set.reps || ''} 
                  onChange={(e) => {
                    const newSets = [...formData.sets];
                    newSets[idx].reps = Number(e.target.value);
                    setFormData({...formData, sets: newSets});
                  }}
                  className={inputStyle} 
                  placeholder="reps"
                />
                <span className="text-[var(--color-text-muted)]">回</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[var(--color-accent-warning)] mb-4">
            このデータは旧形式のため、ここではセットの重量/回数を編集できません。削除して再登録してください。
          </div>
        )}
        
        <div><label className={labelStyle}>Memo</label><textarea value={formData.memo || ''} onChange={(e) => handleChange(e, 'memo')} className={`${inputStyle} h-20 resize-none`} /></div>
      </>
    );
  };

  const renderNutritionForm = () => (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><label className={labelStyle}>Calories (kcal)</label><input type="number" value={formData.calories || ''} onChange={(e) => handleChange(e, 'calories')} className={inputStyle} /></div>
        <div><label className={labelStyle}>Protein (g)</label><input type="number" value={formData.protein || ''} onChange={(e) => handleChange(e, 'protein')} className={inputStyle} /></div>
        <div><label className={labelStyle}>Fat (g)</label><input type="number" value={formData.fat || ''} onChange={(e) => handleChange(e, 'fat')} className={inputStyle} /></div>
        <div><label className={labelStyle}>Carbs (g)</label><input type="number" value={formData.carbs || ''} onChange={(e) => handleChange(e, 'carbs')} className={inputStyle} /></div>
      </div>
      <div><label className={labelStyle}>Memo</label><textarea value={formData.memo || ''} onChange={(e) => handleChange(e, 'memo')} className={`${inputStyle} h-20 resize-none`} /></div>
    </>
  );

  const renderBodyWeightForm = () => (
    <>
      <div className="mb-3">
        <label className={labelStyle}>Weight (kg)</label>
        <input type="number" step="0.1" value={formData.weight || ''} onChange={(e) => handleChange(e, 'weight')} className={inputStyle} />
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--color-surface-800)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            データの編集
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--color-surface-600)] border-none text-[var(--color-text-muted)] flex items-center justify-center text-sm hover:text-[var(--color-text-primary)] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto mb-5 pr-2">
          {tableName === 'ergoRecords' && renderErgoForm()}
          {tableName === 'strengthRecords' && renderStrengthForm()}
          {tableName === 'nutritionRecords' && renderNutritionForm()}
          {tableName === 'bodyWeightRecords' && renderBodyWeightForm()}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[var(--color-surface-600)] text-[var(--color-text-secondary)] border border-[rgba(56,189,248,0.06)] hover:bg-[var(--color-surface-500)]"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[var(--color-accent-primary)] text-white hover:opacity-90 border-none"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = "text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block";
const inputStyle = "w-full px-3 py-2 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)]";
