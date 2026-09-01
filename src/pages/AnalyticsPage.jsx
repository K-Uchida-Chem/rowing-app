import React, { useState } from 'react';
import ErgoTrendChart from '../components/analytics/ErgoTrendChart';
import Big3Chart from '../components/analytics/Big3Chart';
import ZoneDistributionChart from '../components/analytics/ZoneDistributionChart';
import BodyWeightChart from '../components/analytics/BodyWeightChart';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('ergo'); // 'ergo', 'big3', 'zones', 'body'
  const [timeframe, setTimeframe] = useState('月次'); // '日次', '週次', '月次'

  const tabs = [
    { id: 'ergo', label: 'Ergo 2k Trend', emoji: '🚣‍♂️' },
    { id: 'big3', label: 'BIG3 1RM', emoji: '🏋️‍♂️' },
    { id: 'zones', label: 'Zone Distribution', emoji: '❤️' },
    { id: 'body', label: 'Body Weight', emoji: '⚖️' },
  ];

  return (
    <div className="analytics-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 15px',
              backgroundColor: activeTab === tab.id ? 'var(--color-accent-primary)' : 'var(--color-surface-700)',
              color: activeTab === tab.id ? '#111827' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['日次', '週次', '月次'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            style={{
              padding: '6px 12px',
              backgroundColor: timeframe === tf ? 'var(--color-accent-secondary, #38bdf8)' : 'var(--color-surface-600, #334155)',
              color: timeframe === tf ? '#fff' : 'var(--color-text-primary)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: timeframe === tf ? 'bold' : 'normal',
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', minHeight: '400px' }}>
        {activeTab === 'ergo' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: 'var(--color-text-primary)' }}>🚣‍♂️ 2000m TT Prediction Trend</h2>
            <ErgoTrendChart timeframe={timeframe} />
          </div>
        )}
        
        {activeTab === 'big3' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: 'var(--color-text-primary)' }}>🏋️‍♂️ BIG3 Estimated 1RM Trend</h2>
            <Big3Chart timeframe={timeframe} />
          </div>
        )}
        
        {activeTab === 'zones' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: 'var(--color-text-primary)' }}>❤️ Training Zone Distribution</h2>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <ZoneDistributionChart timeframe={timeframe} />
            </div>
          </div>
        )}
        
        {activeTab === 'body' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: 'var(--color-text-primary)' }}>⚖️ Body Weight Trend</h2>
            <BodyWeightChart timeframe={timeframe} />
          </div>
        )}

      </div>
    </div>
  );
}
