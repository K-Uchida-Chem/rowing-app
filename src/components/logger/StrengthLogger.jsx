import { useState, useMemo, useEffect } from 'react';
import { Dumbbell, PlusCircle, Activity, Save, Settings, Trash2, Calendar } from 'lucide-react';
import { DAY_PRESETS, STRENGTH_EXERCISES, PERIODIZATION_PHASES } from '../../db/masterData';
import { addStrengthRecord, calculateEstimated1RM } from '../../db/database';

export default function StrengthLogger() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState('AM');
  const [phase, setPhase] = useState('hypertrophy');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const preset = DAY_PRESETS[selectedDay];
  const phaseData = PERIODIZATION_PHASES[phase];

  const [exercises, setExercises] = useState(() => preset.exercises.map((id) => STRENGTH_EXERCISES[id]));
  
  useEffect(() => {
    setExercises(DAY_PRESETS[selectedDay].exercises.map((id) => STRENGTH_EXERCISES[id]));
  }, [selectedDay]);

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addExerciseMode, setAddExerciseMode] = useState('select'); // 'select' or 'custom'
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [customExerciseName, setCustomExerciseName] = useState('');

  const handleAddExercise = () => {
    if (addExerciseMode === 'select' && selectedExerciseId) {
      const ex = STRENGTH_EXERCISES[selectedExerciseId];
      if (ex && !exercises.find(e => e.id === ex.id)) {
        setExercises([...exercises, ex]);
      }
    } else if (addExerciseMode === 'custom' && customExerciseName.trim()) {
      const newEx = {
        id: 'custom-' + Date.now(),
        name: customExerciseName.trim(),
        nameEn: 'Custom Exercise',
        isCustom: true
      };
      setExercises([...exercises, newEx]);
    }
    setShowAddExercise(false);
    setSelectedExerciseId('');
    setCustomExerciseName('');
  };

  // State for each exercise's sets
  const [exerciseSets, setExerciseSets] = useState({});

  // Initialize sets for an exercise if not yet done
  const getSets = (exerciseId) => {
    if (!exerciseSets[exerciseId]) {
      return [{ weight: '', reps: '', done: false }];
    }
    return exerciseSets[exerciseId];
  };

  const updateSet = (exerciseId, setIndex, field, value) => {
    setExerciseSets((prev) => {
      const current = prev[exerciseId] || [{ weight: '', reps: '', done: false }];
      const updated = [...current];
      updated[setIndex] = { ...updated[setIndex], [field]: value };
      return { ...prev, [exerciseId]: updated };
    });
    setSaved(false);
  };

  const addSet = (exerciseId) => {
    setExerciseSets((prev) => {
      const current = prev[exerciseId] || [{ weight: '', reps: '', done: false }];
      // Copy weight from last set for convenience
      const lastSet = current[current.length - 1];
      return {
        ...prev,
        [exerciseId]: [...current, { weight: lastSet.weight, reps: '', done: false }],
      };
    });
  };

  const removeSet = (exerciseId, setIndex) => {
    setExerciseSets((prev) => {
      const current = prev[exerciseId] || [];
      if (current.length <= 1) return prev;
      return {
        ...prev,
        [exerciseId]: current.filter((_, i) => i !== setIndex),
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = [];
      for (const exercise of exercises) {
        const setsArray = getSets(exercise.id)
          .filter(s => s.weight && s.reps)
          .map(s => ({ weight: Number(s.weight), reps: Number(s.reps) }));
          
        if (setsArray.length > 0) {
          promises.push(
            addStrengthRecord({
              date,
              session,
              exercise: exercise.id,
              day: selectedDay,
              sets: setsArray,
              phase,
            })
          );
        }
      }
      await Promise.all(promises);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save strength records:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setExerciseSets({});
    setSaved(false);
  };

  return (
    <div className="space-y-4" id="strength-logger">
      {/* ─── Day Selector ────────────────────────────────── */}
      <div className="glass-card p-4" id="day-selector">
        <div className="flex items-center gap-2 mb-3 border-b border-[var(--color-surface-600)] pb-2">
          <Activity size={16} className="text-[var(--color-text-secondary)]" />
          <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
            トレーニングDay選択
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(DAY_PRESETS).map(([key, preset]) => {
            const dayNum = Number(key);
            const isActive = selectedDay === dayNum;
            return (
              <button
                key={key}
                id={`day-btn-${key}`}
                onClick={() => setSelectedDay(dayNum)}
                className={`
                  px-3 py-3 rounded-xl border cursor-pointer
                  transition-all duration-200 text-center
                  ${isActive
                    ? 'border-[rgba(56,189,248,0.3)] text-[var(--color-text-primary)]'
                    : 'border-[rgba(56,189,248,0.06)] text-[var(--color-text-secondary)] hover:border-[rgba(56,189,248,0.15)]'
                  }
                `}
                style={{
                  background: isActive ? `${preset.color}18` : 'rgba(11, 15, 25, 0.5)',
                }}
              >
                <p className="text-xs font-bold mb-0.5">Day {key}</p>
                <p className="text-[9px] text-[var(--color-text-muted)] leading-tight">
                  {preset.label.split('—')[1]?.trim()}
                </p>
              </button>
            );
          })}
        </div>

        {/* Date & Phase */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5">
              <Calendar size={10} /> 日付
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setSaved(false); }}
                className="w-2/3 px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)]"
                id="strength-date"
              />
              <select
                value={session}
                onChange={(e) => { setSession(e.target.value); setSaved(false); }}
                className="w-1/3 px-2 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] cursor-pointer appearance-none text-center"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
                <option value="Night">Night</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5">
              <Settings size={10} /> ピリオド
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] cursor-pointer appearance-none"
              id="strength-phase"
            >
              {Object.values(PERIODIZATION_PHASES).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.intensityRange})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Exercise Cards ──────────────────────────────── */}
      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          sets={getSets(exercise.id)}
          onUpdateSet={(setIdx, field, val) => updateSet(exercise.id, setIdx, field, val)}
          onAddSet={() => addSet(exercise.id)}
          onRemoveSet={(setIdx) => removeSet(exercise.id, setIdx)}
          dayColor={preset.color}
        />
      ))}

      {/* ─── Add Exercise Button/Form ──────────────────────── */}
      {!showAddExercise ? (
        <button
          onClick={() => setShowAddExercise(true)}
          className="w-full px-4 py-3 rounded-xl border border-dashed border-[var(--color-surface-600)] text-[var(--color-text-muted)] text-sm font-medium hover:border-[var(--color-accent-primary)] hover:text-[var(--color-text-primary)] transition-all duration-200 flex items-center justify-center gap-2"
        >
          <PlusCircle size={16} /> 新規種目追加
        </button>
      ) : (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">種目を追加</h4>
            <button onClick={() => setShowAddExercise(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">✕</button>
          </div>
          
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setAddExerciseMode('select')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${addExerciseMode === 'select' ? 'bg-[var(--color-surface-600)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-600)]'}`}
            >
              既存から選択
            </button>
            <button
              onClick={() => setAddExerciseMode('custom')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${addExerciseMode === 'custom' ? 'bg-[var(--color-surface-600)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-600)]'}`}
            >
              自由入力
            </button>
          </div>

          {addExerciseMode === 'select' ? (
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] appearance-none"
            >
              <option value="">種目を選択...</option>
              {Object.values(STRENGTH_EXERCISES)
                .filter(ex => !exercises.some(e => e.id === ex.id))
                .map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={customExerciseName}
              onChange={(e) => setCustomExerciseName(e.target.value)}
              placeholder="種目名を入力"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)]"
            />
          )}

          <button
            onClick={handleAddExercise}
            disabled={
              (addExerciseMode === 'select' && !selectedExerciseId) ||
              (addExerciseMode === 'custom' && !customExerciseName.trim())
            }
            className="w-full mt-2 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all duration-200 border-none cursor-pointer"
          >
            追加
          </button>
        </div>
      )}

      {/* ─── Action Buttons ──────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-[var(--color-surface-600)] text-[var(--color-text-secondary)] border border-[rgba(56,189,248,0.06)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface-500)]"
          id="strength-reset-btn"
        >
          リセット
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`
            flex-[2] px-4 py-3 rounded-xl text-sm font-bold border-none cursor-pointer
            transition-all duration-200 flex items-center justify-center gap-2
            ${saved
              ? 'bg-[var(--color-accent-success)] text-white'
              : 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white hover:opacity-90'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          id="strength-save-btn"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSaving ? '保存中...' : saved ? '保存しました' : '記録を保存'}
        </button>
      </div>
    </div>
  );
}

// ─── Exercise Card Component ───────────────────────────────

function ExerciseCard({ exercise, sets, onUpdateSet, onAddSet, onRemoveSet, dayColor }) {
  const best1RM = useMemo(() => {
    let max = 0;
    for (const set of sets) {
      if (set.weight && set.reps) {
        const est = calculateEstimated1RM(Number(set.weight), Number(set.reps));
        if (est > max) max = est;
      }
    }
    return max;
  }, [sets]);

  return (
    <div
      className="glass-card p-4"
      id={`exercise-${exercise.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
            {exercise.name}
          </h4>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {exercise.nameEn}
          </p>
        </div>
        {best1RM > 0 && (
          <div
            className="text-right px-3 py-1.5 rounded-lg bg-[rgba(56,189,248,0.1)] border border-[rgba(56,189,248,0.2)]"
          >
            <p className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">
              推定1RM
            </p>
            <p className="text-lg font-bold tabular-nums text-[var(--color-accent-primary)]">
              {best1RM}<span className="text-xs ml-0.5 text-[var(--color-text-secondary)]">kg</span>
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[32px_1fr_1fr_32px] gap-2 mb-1.5 px-1">
        <span className="text-[9px] text-[var(--color-text-muted)] font-semibold text-center">Set</span>
        <span className="text-[9px] text-[var(--color-text-muted)] font-semibold">重量 (kg)</span>
        <span className="text-[9px] text-[var(--color-text-muted)] font-semibold">レップ数</span>
        <span />
      </div>

      <div className="space-y-2">
        {sets.map((set, idx) => {
          const est1RM = (set.weight && set.reps)
            ? calculateEstimated1RM(Number(set.weight), Number(set.reps))
            : null;

          return (
            <div
              key={idx}
              className="grid grid-cols-[32px_1fr_1fr_32px] gap-2 items-center"
            >
              <span className="text-xs font-bold text-[var(--color-text-muted)] text-center tabular-nums">
                {idx + 1}
              </span>
              <input
                type="number"
                value={set.weight}
                onChange={(e) => onUpdateSet(idx, 'weight', e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-2 rounded-lg bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums text-center"
              />
              <div className="relative">
                <input
                  type="number"
                  value={set.reps}
                  onChange={(e) => onUpdateSet(idx, 'reps', e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-2 rounded-lg bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] tabular-nums text-center"
                />
                {est1RM && (
                  <span
                    className="absolute -right-0.5 -top-1.5 text-[8px] font-bold px-1 rounded text-[var(--color-accent-primary)] bg-[rgba(56,189,248,0.15)]"
                  >
                    ≈{est1RM}
                  </span>
                )}
              </div>
              <button
                onClick={() => onRemoveSet(idx)}
                className="w-7 h-7 rounded-lg bg-transparent border border-[rgba(248,113,113,0.15)] text-[var(--color-accent-danger)] cursor-pointer flex items-center justify-center text-xs transition-all duration-200 hover:bg-[rgba(248,113,113,0.1)]"
                title="セット削除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onAddSet}
        className="w-full mt-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--color-text-muted)] bg-transparent border border-dashed border-[rgba(56,189,248,0.1)] cursor-pointer transition-all duration-200 hover:border-[rgba(56,189,248,0.25)] hover:text-[var(--color-text-secondary)] hover:bg-[rgba(56,189,248,0.03)] flex items-center justify-center gap-2"
      >
        <PlusCircle size={14} /> セット追加
      </button>
    </div>
  );
}
