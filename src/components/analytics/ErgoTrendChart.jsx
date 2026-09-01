import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import db from '../../db/database';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8'
      }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          const totalSeconds = context.parsed.y;
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = Math.floor(totalSeconds % 60);
          return `${context.dataset.label}: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(148, 163, 184, 0.08)'
      },
      ticks: {
        color: '#94a3b8'
      }
    },
    y: {
      reverse: true, // Faster times are better, so they should be higher up
      grid: {
        color: 'rgba(148, 163, 184, 0.08)'
      },
      ticks: {
        color: '#94a3b8',
        callback: function(value) {
          const minutes = Math.floor(value / 60);
          const seconds = Math.floor(value % 60);
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }
    }
  }
};

const demoData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Estimated 2k Time',
      data: [445, 440, 436, 431, 428, 425], // 7:25 to 7:05
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.5)',
      tension: 0.3,
    },
    {
      label: 'Target (7:00)',
      data: [420, 420, 420, 420, 420, 420], // 7:00
      borderColor: '#f43f5e',
      borderDash: [5, 5],
      pointRadius: 0,
      borderWidth: 2,
    }
  ],
};

export default function ErgoTrendChart({ timeframe }) {
  const [chartData, setChartData] = useState(demoData);

  useEffect(() => {
    async function fetchData() {
      // Fetch 2kTT records
      const records = await db.ergoRecords.where('type').equals('2kTT').toArray();
      
      if (records.length === 0) {
        // Fallback to demoData with adjusted labels
        let labels = [];
        if (timeframe === '日次') {
          labels = ['09/01', '09/02', '09/03', '09/04', '09/05', '09/06'];
        } else if (timeframe === '週次') {
          labels = ['Wk 35', 'Wk 36', 'Wk 37', 'Wk 38', 'Wk 39', 'Wk 40'];
        } else {
          labels = ['2026/01', '2026/02', '2026/03', '2026/04', '2026/05', '2026/06'];
        }
        setChartData({
          ...demoData,
          labels
        });
        return;
      }

      // Group records
      const grouped = {};
      records.forEach(r => {
        const d = new Date(r.date);
        let key = '';
        if (timeframe === '日次') {
          key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        } else if (timeframe === '週次') {
          // get start of week (Sunday)
          const dWeek = new Date(d);
          dWeek.setDate(d.getDate() - d.getDay());
          key = `${String(dWeek.getMonth() + 1).padStart(2, '0')}/${String(dWeek.getDate()).padStart(2, '0')} (Wk)`;
        } else {
          key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      });

      const sortedKeys = Object.keys(grouped).sort();
      const actualData = sortedKeys.map(k => {
        const group = grouped[k];
        // min time for Ergo TT
        const times = group.map(g => {
          if (!g.time) return Infinity;
          const parts = g.time.split(':');
          if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
          }
          return Infinity;
        }).filter(t => t !== Infinity);
        
        return times.length > 0 ? Math.min(...times) : null;
      });

      const targets = sortedKeys.map(() => 420); // 7:00 target

      setChartData({
        labels: sortedKeys,
        datasets: [
          {
            label: 'Estimated 2k Time',
            data: actualData,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.5)',
            tension: 0.3,
          },
          {
            label: 'Target (7:00)',
            data: targets,
            borderColor: '#f43f5e',
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 2,
          }
        ]
      });
    }

    fetchData();
  }, [timeframe]);

  return (
    <div style={{ height: '350px', width: '100%' }}>
      <Line options={chartOptions} data={chartData} />
    </div>
  );
}

