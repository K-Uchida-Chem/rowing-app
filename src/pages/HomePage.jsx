import { useState } from 'react';
import WeatherConditionCard from '../components/home/WeatherConditionCard';
import WeeklyScheduleCard from '../components/home/WeeklyScheduleCard';
import WeeklyScheduleSettings from '../components/settings/WeeklyScheduleSettings';
import QuickActions from '../components/home/QuickActions';
import TodayStats from '../components/home/TodayStats';

export default function HomePage({ onTabChange }) {
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  return (
    <div id="home-page">
      {/* Mobile Header */}
      <div className="flex items-center justify-between mb-5 md:hidden">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
            style={{
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
            }}
          >
            🚣
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">
              RowPro
            </h1>
            <p className="text-[9px] text-[var(--color-text-muted)] font-medium tracking-widest uppercase">
              Athlete Manager
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          おかえりなさい 👋
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          今日もトレーニングを記録しましょう
        </p>
      </div>

      {/* Cards */}
      <WeatherConditionCard />
      <WeeklyScheduleCard onEdit={() => setShowScheduleSettings(true)} />
      <TodayStats />
      <QuickActions onTabChange={onTabChange} />

      {/* Settings Modal */}
      <WeeklyScheduleSettings
        isOpen={showScheduleSettings}
        onClose={() => setShowScheduleSettings(false)}
      />
    </div>
  );
}
