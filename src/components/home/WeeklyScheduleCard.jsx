import React, { useState, useEffect } from 'react';
import db from '../../db/database';

const WeeklyScheduleCard = ({ onEdit }) => {
  const currentDay = new Date().getDay();
  
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await db.weeklySchedule.get(currentDay);
        setSchedule(data);
      } catch (err) {
        console.error("Failed to fetch schedule", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [currentDay]);

  const days = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--color-surface-700)', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-accent-primary)' }}>本日のメニュー ({days[currentDay]})</h3>
        <button 
          onClick={onEdit}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-surface-600)',
            color: 'var(--color-text-secondary)',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ⚙️ 週間メニューを編集
        </button>
      </div>

      {loading ? (
        <p>読み込み中...</p>
      ) : schedule ? (
        <div>
          {schedule.ergoType && schedule.ergoType !== 'none' && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>エルゴ:</strong> {schedule.ergoType}
            </div>
          )}
          {schedule.strengthDay && schedule.strengthDay !== 'none' && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>ウエイト:</strong> {schedule.strengthDay}
            </div>
          )}
          {schedule.description && (
            <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'var(--color-surface-800)', borderRadius: '8px', fontSize: '0.95rem' }}>
              {schedule.description}
            </div>
          )}
          {(!schedule.ergoType || schedule.ergoType === 'none') && 
           (!schedule.strengthDay || schedule.strengthDay === 'none') && 
           !schedule.description && (
            <p style={{ color: 'var(--color-text-secondary)' }}>本日の予定は登録されていません。</p>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>本日のスケジュールは未設定です。</p>
          <button 
            onClick={onEdit}
            style={{
              background: 'var(--color-accent-primary)',
              color: '#000',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            スケジュールを作成
          </button>
        </div>
      )}
    </div>
  );
};

export default WeeklyScheduleCard;
