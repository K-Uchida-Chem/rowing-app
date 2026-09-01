import React from 'react';
import { STRENGTH_EXERCISES } from '../../db/masterData';
import { calculateEstimated1RM } from '../../db/database';

const DayDetail = ({ date, records }) => {
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

  return (
    <div className="day-detail" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
        {formatDate(date)}
      </h3>

      {!hasRecords ? (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          この日の記録はありません
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Body Weight Records */}
          {records.bodyWeight && records.bodyWeight.map(record => (
            <div key={`bw-${record.id}`} className="glass-card" style={cardStyle}>
              <div style={headerStyle}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>体重</span>
              </div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: '1.2rem' }}>
                {record.weight} kg
              </div>
            </div>
          ))}

          {/* Ergo Records */}
          {records.ergo && records.ergo.map(record => (
            <div key={`ergo-${record.id}`} className="glass-card" style={{...cardStyle, borderLeft: '4px solid var(--color-accent-primary)'}}>
              <div style={headerStyle}>
                <span style={{ color: 'var(--color-accent-primary)', fontWeight: 'bold' }}>エルゴ ({record.type || 'UT2'})</span>
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
            // record.exercise contains the ID (or custom string)
            const exerciseData = STRENGTH_EXERCISES[record.exercise];
            const exerciseName = exerciseData ? exerciseData.name : (record.exerciseName || record.exercise || '筋トレ');
            return (
              <div key={`str-${record.id}`} className="glass-card" style={{...cardStyle, borderLeft: '4px solid var(--color-accent-warning)'}}>
                <div style={headerStyle}>
                  <span style={{ color: 'var(--color-accent-warning)', fontWeight: 'bold' }}>{exerciseName}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {record.sets && record.sets.map((set, idx) => {
                    const oneRM = calculateEstimated1RM(set.weight, set.reps);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-primary)' }}>
                        <span>Set {idx + 1}: {set.weight}kg × {set.reps}回</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>推定1RM: {oneRM}kg</span>
                      </div>
                    );
                  })}
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
            <div key={`nut-${record.id}`} className="glass-card" style={{...cardStyle, borderLeft: '4px solid var(--color-accent-success)'}}>
              <div style={headerStyle}>
                <span style={{ color: 'var(--color-accent-success)', fontWeight: 'bold' }}>食事 ({record.mealType})</span>
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

export default DayDetail;
