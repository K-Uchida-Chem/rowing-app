import React, { useState, useEffect } from 'react';
import db from '../../db/database';

const WeeklyScheduleSettings = ({ isOpen, onClose }) => {
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);

  const daysOfWeek = [
    { id: 1, name: '月曜日' },
    { id: 2, name: '火曜日' },
    { id: 3, name: '水曜日' },
    { id: 4, name: '木曜日' },
    { id: 5, name: '金曜日' },
    { id: 6, name: '土曜日' },
    { id: 0, name: '日曜日' },
  ];

  const ergoOptions = ['none', 'UT2', 'UT1', 'AT', 'TR', 'AN', 'Sprint', 'Test'];
  const strengthOptions = ['none', 'Day 1', 'Day 2', 'Day 3'];

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!isOpen) return;
      try {
        const data = await db.weeklySchedule.toArray();
        const scheduleMap = {};
        
        daysOfWeek.forEach(day => {
          scheduleMap[day.id] = { dayOfWeek: day.id, ergoType: 'none', strengthDay: 'none', description: '' };
        });
        
        data.forEach(item => {
          scheduleMap[item.dayOfWeek] = { ...scheduleMap[item.dayOfWeek], ...item };
        });
        
        setSchedules(scheduleMap);
      } catch (err) {
        console.error("Failed to fetch weekly schedule", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [isOpen]);

  const handleChange = (dayId, field, value) => {
    setSchedules(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      const itemsToSave = Object.values(schedules);
      for (const item of itemsToSave) {
        await db.weeklySchedule.put(item);
      }
      onClose();
    } catch (err) {
      console.error("Failed to save schedule", err);
      alert("保存に失敗しました。");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-card" style={{
        background: 'var(--color-surface-800)',
        width: '100%', maxWidth: '600px',
        maxHeight: '90vh', overflowY: 'auto',
        borderRadius: '16px', padding: '2rem',
        border: '1px solid var(--color-surface-600)',
        color: 'var(--color-text-primary)'
      }}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--color-accent-primary)' }}>週間スケジュール設定</h2>
        
        {loading ? (
          <p>読み込み中...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {daysOfWeek.map(day => (
              <div key={day.id} style={{ 
                background: 'var(--color-surface-700)', 
                padding: '1rem', 
                borderRadius: '8px',
                border: '1px solid var(--color-surface-600)'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>{day.name}</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>エルゴ</label>
                    <select 
                      value={schedules[day.id]?.ergoType || 'none'}
                      onChange={(e) => handleChange(day.id, 'ergoType', e.target.value)}
                      style={{ 
                        width: '100%', padding: '0.5rem', borderRadius: '4px',
                        background: 'var(--color-surface-900)', color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-surface-600)'
                      }}
                    >
                      {ergoOptions.map(opt => (
                        <option key={opt} value={opt}>{opt === 'none' ? 'なし' : opt}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>ウエイト</label>
                    <select 
                      value={schedules[day.id]?.strengthDay || 'none'}
                      onChange={(e) => handleChange(day.id, 'strengthDay', e.target.value)}
                      style={{ 
                        width: '100%', padding: '0.5rem', borderRadius: '4px',
                        background: 'var(--color-surface-900)', color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-surface-600)'
                      }}
                    >
                      {strengthOptions.map(opt => (
                        <option key={opt} value={opt}>{opt === 'none' ? 'なし' : opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>メモ (任意)</label>
                  <input 
                    type="text"
                    value={schedules[day.id]?.description || ''}
                    onChange={(e) => handleChange(day.id, 'description', e.target.value)}
                    placeholder="例: UT2 60min, スクワットメイン"
                    style={{ 
                      width: '100%', padding: '0.5rem', borderRadius: '4px',
                      background: 'var(--color-surface-900)', color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-surface-600)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: '8px',
              background: 'transparent', color: 'var(--color-text-primary)',
              border: '1px solid var(--color-surface-500)', cursor: 'pointer'
            }}
          >
            キャンセル
          </button>
          <button 
            onClick={handleSave}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px',
              background: 'var(--color-accent-primary)', color: '#000',
              border: 'none', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyScheduleSettings;
