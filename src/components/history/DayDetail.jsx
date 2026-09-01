import React, { useState } from 'react';
import { STRENGTH_EXERCISES } from '../../db/masterData';
import { calculateEstimated1RM, deleteRecord, updateRecord } from '../../db/database';
import RecordEditModal from './RecordEditModal';

const DayDetail = ({ date, records, onRecordChange }) => {
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingTable, setEditingTable] = useState('');
  if (!date) return null;

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}年${m}月${d}日の記録`;
  };

  const hasRecords = records && (
    (records.ergo && records.ergo.length > 0) ||
    (records.strength && records.strength.length > 0) ||
    (records.nutrition && records.nutrition.length > 0) ||
    (records.bodyWeight && records.bodyWeight.length > 0)
  );

  const handleDelete = async (tableName, id) => {
    if (window.confirm('この記録を削除してもよろしいですか？')) {
      try {
        await deleteRecord(tableName, id);
        if (onRecordChange) onRecordChange();
      } catch (err) {
        alert('削除に失敗しました');
      }
    }
  };

  return (
    <div className="day-detail" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
        {formatDate(date)}
      </h3>

      {editingRecord && (
        <RecordEditModal
          record={editingRecord}
          tableName={editingTable}
          onClose={() => setEditingRecord(null)}
          onSave={async (newData) => {
            try {
              await updateRecord(editingTable, editingRecord.id, newData);
              setEditingRecord(null);
              if (onRecordChange) onRecordChange();
            } catch (err) {
              alert('保存に失敗しました');
            }
          }}
        />
      )}

      {!hasRecords ? (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          この日の記録はありません
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Body Weight Records */}
          {records.bodyWeight && records.bodyWeight.map(record => (
            <div key={`bw-${record.id}`} className="glass-card relative group" style={cardStyle}>
              <div style={headerStyle} className="flex justify-between items-center">
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>体重</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingRecord(record); setEditingTable('bodyWeightRecords'); }} className={actionBtnStyle}>✏️</button>
                  <button onClick={() => handleDelete('bodyWeightRecords', record.id)} className={actionBtnStyle}>🗑️</button>
                </div>
              </div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: '1.2rem' }}>
                {record.weight} kg
              </div>
            </div>
          ))}

          {/* Ergo Records */}
          {records.ergo && records.ergo.map(record => (
            <div key={`ergo-${record.id}`} className="glass-card relative group" style={{...cardStyle, borderLeft: '4px solid var(--color-accent-primary)'}}>
              <div style={headerStyle} className="flex justify-between items-center">
                <span style={{ color: 'var(--color-accent-primary)', fontWeight: 'bold' }}>エルゴ ({record.type || 'UT2'})</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingRecord(record); setEditingTable('ergoRecords'); }} className={actionBtnStyle}>✏️</button>
                  <button onClick={() => handleDelete('ergoRecords', record.id)} className={actionBtnStyle}>🗑️</button>
                </div>
              </div>
              <div style={gridStyle}>
                <div style={itemStyle}><span style={labelStyle}>Time</span>{record.time}</div>
                <div style={itemStyle}><span style={labelStyle}>Distance</span>{record.distance}m</div>
                <div style={itemStyle}><span style={labelStyle}>Split</span>{record.split}</div>
                <div style={itemStyle}><span style={labelStyle}>Rate</span>{record.rate}</div>
                <div style={itemStyle}><span style={labelStyle}>Watts</span>{record.watts}</div>
                {record.hr && <div style={itemStyle}><span style={labelStyle}>HR</span>{record.hr}</div>}
                {record.rpe && <div style={itemStyle}><span style={labelStyle}>RPE</span>{record.rpe}</div>}
              </div>
              {record.memo && (
                <div style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {record.memo}
                </div>
              )}
            </div>
          ))}

          {/* Strength Records */}
          {records.strength && records.strength.map(record => {
            const exerciseData = STRENGTH_EXERCISES[record.exercise];
            const exerciseName = exerciseData ? exerciseData.name : (record.exerciseName || record.exercise || '筋トレ');
            return (
              <div key={`str-${record.id}`} className="glass-card relative group" style={{...cardStyle, borderLeft: '4px solid var(--color-accent-warning)'}}>
                <div style={headerStyle} className="flex justify-between items-center">
                  <span style={{ color: 'var(--color-accent-warning)', fontWeight: 'bold' }}>{exerciseName}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingRecord(record); setEditingTable('strengthRecords'); }} className={actionBtnStyle}>✏️</button>
                    <button onClick={() => handleDelete('strengthRecords', record.id)} className={actionBtnStyle}>🗑️</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {Array.isArray(record.sets) ? record.sets.map((set, idx) => {
                    const oneRM = calculateEstimated1RM(set.weight, set.reps);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-primary)' }}>
                        <span>Set {idx + 1}: {set.weight}kg × {set.reps}回</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>推定1RM: {oneRM}kg</span>
                      </div>
                    );
                  }) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-primary)' }}>
                      <span>Set {record.sets || 1}: {record.weight}kg × {record.reps}回</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>推定1RM: {calculateEstimated1RM(record.weight, record.reps)}kg</span>
                    </div>
                  )}
                </div>
                {record.memo && (
                  <div style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    {record.memo}
                  </div>
                )}
              </div>
            );
          })}

          {/* Nutrition Records */}
          {records.nutrition && records.nutrition.map(record => (
            <div key={`nut-${record.id}`} className="glass-card relative group" style={{...cardStyle, borderLeft: '4px solid var(--color-accent-success)'}}>
              <div style={headerStyle} className="flex justify-between items-center">
                <span style={{ color: 'var(--color-accent-success)', fontWeight: 'bold' }}>食事 ({record.mealType})</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingRecord(record); setEditingTable('nutritionRecords'); }} className={actionBtnStyle}>✏️</button>
                  <button onClick={() => handleDelete('nutritionRecords', record.id)} className={actionBtnStyle}>🗑️</button>
                </div>
              </div>
              <div style={gridStyle}>
                <div style={itemStyle}><span style={labelStyle}>Cal</span>{record.calories}</div>
                <div style={itemStyle}><span style={labelStyle}>Protein</span>{record.protein}g</div>
                <div style={itemStyle}><span style={labelStyle}>Fat</span>{record.fat}g</div>
                <div style={itemStyle}><span style={labelStyle}>Carbs</span>{record.carbs}g</div>
              </div>
              {record.memo && (
                <div style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  {record.memo}
                </div>
              )}
            </div>
          ))}

        </div>
      )}
    </div>
  );
};

const cardStyle = {
  padding: '1rem',
  backgroundColor: 'var(--color-surface-700)',
  borderRadius: '8px'
};

const headerStyle = {
  marginBottom: '0.5rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid var(--color-surface-600)'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: '0.5rem',
  marginTop: '0.5rem'
};

const itemStyle = {
  display: 'flex',
  flexDirection: 'column',
  color: 'var(--color-text-primary)'
};

const labelStyle = {
  fontSize: '0.8rem',
  color: 'var(--color-text-muted)'
};

const actionBtnStyle = "w-6 h-6 rounded-md bg-[var(--color-surface-600)] text-xs flex items-center justify-center border-none cursor-pointer hover:bg-[var(--color-surface-500)] opacity-80 hover:opacity-100 transition-all";

export default DayDetail;
