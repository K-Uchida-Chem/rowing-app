import React, { useState, useEffect } from 'react';
import db from '../../db/database';
import { Calendar, ChevronLeft, ChevronRight, Activity, Brain, Dumbbell, Footprints } from 'lucide-react';

export default function WeeklyReport() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Calculate Monday to Sunday of the currentDate's week
  const getWeekDates = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      monday,
      sunday,
      startStr: monday.toISOString().split('T')[0],
      endStr: sunday.toISOString().split('T')[0],
      label: `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}`
    };
  };

  const { startStr, endStr, label, monday } = getWeekDates(currentDate);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      setLoading(true);
      try {
        const ergo = await db.ergoRecords.where('date').between(startStr, endStr, true, true).toArray();
        const cross = await db.crossTrainingRecords.where('date').between(startStr, endStr, true, true).toArray();
        const strength = await db.strengthRecords.where('date').between(startStr, endStr, true, true).toArray();
        const condition = await db.conditionRecords.where('date').between(startStr, endStr, true, true).toArray();

        // Calculate aggregates
        let ergoDist = 0;
        ergo.forEach(r => { if(r.distance) ergoDist += Number(r.distance); });

        let runDist = 0;
        let bikeDist = 0;
        cross.forEach(r => {
          if (r.type === 'running' && r.distance) runDist += Number(r.distance);
          if (r.type === 'cycling' && r.distance) bikeDist += Number(r.distance);
        });

        // Readiness Score Avg
        let readinessSum = 0;
        let readinessCount = 0;
        let sleepSum = 0;
        let sleepCount = 0;

        condition.forEach(c => {
          if (c.sleepHours) {
            sleepSum += Number(c.sleepHours);
            sleepCount++;
          }
          
          const sleep = c.sleepHours || 7; 
          const rhr = c.restingHR || 55; 
          const fatigue = c.fatigueScore || 3;
          const sleepScore = Math.min(100, (sleep / 8) * 100);
          const rhrScore = Math.max(0, 100 - (rhr - 45) * 2);
          const fatigueScoreVal = 100 - (fatigue - 1) * 20;
          const rScore = Math.round((sleepScore * 0.4) + (rhrScore * 0.3) + (fatigueScoreVal * 0.3));
          
          readinessSum += rScore;
          readinessCount++;
        });

        const strengthSessions = new Set(strength.map(r => r.date)).size;

        setWeeklyData({
          ergoDist,
          runDist,
          bikeDist,
          strengthSessions,
          avgReadiness: readinessCount > 0 ? Math.round(readinessSum / readinessCount) : null,
          avgSleep: sleepCount > 0 ? (sleepSum / sleepCount).toFixed(1) : null
        });
      } catch (err) {
        console.error("Failed to fetch weekly report", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeeklyData();
  }, [startStr, endStr]);

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleThisWeek = () => {
    setCurrentDate(new Date());
  };

  if (loading || !weeklyData) {
    return <div className="p-8 text-center text-[var(--color-text-muted)]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header / Nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevWeek} className="p-2 rounded-xl bg-[var(--color-surface-600)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-500)] transition">
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-bold text-[var(--color-accent-primary)] flex items-center gap-2">
            <Calendar size={18} /> {label}
          </h2>
          <button onClick={handleThisWeek} className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest hover:text-[var(--color-text-primary)] mt-1">
            今週に戻る
          </button>
        </div>

        <button onClick={handleNextWeek} className="p-2 rounded-xl bg-[var(--color-surface-600)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-500)] transition">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recovery & Readiness */}
        <div className="bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.05)] pb-2">
            <Brain size={18} className="text-[var(--color-accent-purple)]" />
            <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">Recovery & Readiness</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Avg Readiness</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-mono font-bold text-[var(--color-text-primary)]">{weeklyData.avgReadiness || '--'}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Avg Sleep</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-mono font-bold text-[var(--color-text-primary)]">{weeklyData.avgSleep || '--'}</span>
                <span className="text-xs text-[var(--color-text-muted)]">h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Training Volume */}
        <div className="bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.05)] pb-2">
            <Activity size={18} className="text-[var(--color-accent-primary)]" />
            <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">Training Volume</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">Ergo Distance</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">{weeklyData.ergoDist.toLocaleString()} <span className="text-[10px] text-[var(--color-text-muted)]">m</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">Run Distance</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">{weeklyData.runDist.toLocaleString()} <span className="text-[10px] text-[var(--color-text-muted)]">km</span></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">Bike Distance</span>
              <span className="font-mono font-bold text-[var(--color-text-primary)]">{weeklyData.bikeDist.toLocaleString()} <span className="text-[10px] text-[var(--color-text-muted)]">km</span></span>
            </div>
          </div>
        </div>

        {/* Strength */}
        <div className="bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] p-5 rounded-2xl md:col-span-2">
          <div className="flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.05)] pb-2">
            <Dumbbell size={18} className="text-[var(--color-accent-warning)]" />
            <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">Strength Sessions</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-[var(--color-accent-warning)]">{weeklyData.strengthSessions}</span>
            <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">days this week</span>
          </div>
        </div>
      </div>
    </div>
  );
}
