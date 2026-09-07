import React, { useState, useMemo } from 'react';

const CalendarView = ({ 
  selectedDate, 
  onSelectDate, 
  currentMonth, 
  onMonthChange, 
  monthData 
}) => {
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    // Convert to Monday start: Sun=0->6, Mon=1->0, Tue=2->1, etc.
    return day === 0 ? 6 : day - 1;
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  // padding to complete the grid
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };
  
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.getDate() === selectedDate.getDate() && 
           date.getMonth() === selectedDate.getMonth() && 
           date.getFullYear() === selectedDate.getFullYear();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const weekDays = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <div className="calendar-view" style={{ backgroundColor: 'var(--color-surface-700)', padding: '1rem', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={handlePrevMonth} style={btnStyle}>&lt;</button>
        <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          {year}年 {month + 1}月
        </h3>
        <button onClick={handleNextMonth} style={btnStyle}>&gt;</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '0.5rem' }}>
        {weekDays.map(day => (
          <div key={day} style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{day}</div>
        ))}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} style={{ aspectRatio: '1', padding: '4px' }}></div>;
          }
          
          const dateStr = formatDate(date);
          const data = monthData[dateStr] || {};
          
          const level = data.level || 0;
          let bgColor = 'rgba(226, 232, 240, 0.03)'; // Empty state
          if (level === 1) bgColor = 'rgba(56, 189, 248, 0.2)';
          if (level === 2) bgColor = 'rgba(56, 189, 248, 0.5)';
          if (level === 3) bgColor = 'rgba(56, 189, 248, 0.8)';
          if (level >= 4) bgColor = 'var(--color-accent-primary)';

          // If no training but nutrition/bodyWeight etc is tracked, give it a tiny tint
          if (level === 0 && data.types && Object.keys(data.types).length > 0) {
            bgColor = 'rgba(56, 189, 248, 0.08)';
          }
          
          const todayStyle = isToday(date) ? { border: '1px solid var(--color-accent-primary)' } : { border: '1px solid rgba(255,255,255,0.03)' };
          const selectedStyle = isSelected(date) ? { transform: 'scale(1.1)', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' } : {};
          
          return (
            <div 
              key={dateStr}
              onClick={() => onSelectDate(date)}
              style={{
                aspectRatio: '1',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bgColor,
                transition: 'all 0.2s',
                ...todayStyle,
                ...selectedStyle
              }}
              title={`${dateStr} (Intensity: ${level})`}
            >
              <span style={{ 
                color: level >= 2 ? '#000' : 'var(--color-text-secondary)', 
                fontSize: '0.8rem',
                fontWeight: level >= 2 ? 'bold' : 'normal'
              }}>
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const btnStyle = {
  background: 'var(--color-surface-600)',
  border: 'none',
  color: 'var(--color-text-primary)',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  cursor: 'pointer'
};

export default CalendarView;
