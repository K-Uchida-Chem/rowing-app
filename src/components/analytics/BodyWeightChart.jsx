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
      grid: {
        color: 'rgba(148, 163, 184, 0.08)'
      },
      ticks: {
        color: '#94a3b8'
      }
    }
  }
};

const demoData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Body Weight (kg)',
      data: [82.5, 82.1, 81.8, 81.5, 81.0, 80.5],
      borderColor: '#a78bfa',
      backgroundColor: 'rgba(167, 139, 250, 0.5)',
      tension: 0.3,
    }
  ],
};

export default function BodyWeightChart({ timeframe }) {
  const [chartData, setChartData] = useState(demoData);

  useEffect(() => {
    async function fetchData() {
      const records = await db.bodyWeightRecords.toArray();
      if (records.length === 0) {
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

      const grouped = {};
      records.forEach(r => {
        const d = new Date(r.date);
        let key = '';
        if (timeframe === '日次') {
          key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        } else if (timeframe === '週次') {
          const dWeek = new Date(d);
          dWeek.setDate(d.getDate() - d.getDay());
          key = `${String(dWeek.getMonth() + 1).padStart(2, '0')}/${String(dWeek.getDate()).padStart(2, '0')} (Wk)`;
        } else {
          key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!grouped[key]) grouped[key] = [];
        if (r.weight) {
          grouped[key].push(r.weight);
        }
      });

      const sortedKeys = Object.keys(grouped).sort();
      const actualData = sortedKeys.map(k => {
        const group = grouped[k];
        if (group.length === 0) return null;
        const sum = group.reduce((a, b) => a + b, 0);
        return sum / group.length;
      });

      setChartData({
        labels: sortedKeys,
        datasets: [
          {
            label: 'Body Weight (kg)',
            data: actualData,
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167, 139, 250, 0.5)',
            tension: 0.3,
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
