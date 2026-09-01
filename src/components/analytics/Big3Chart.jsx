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
      label: 'Squat',
      data: [120, 125, 127.5, 130, 135, 140],
      borderColor: '#4FC3F7',
      backgroundColor: 'rgba(79, 195, 247, 0.5)',
      tension: 0.3,
    },
    {
      label: 'Bench',
      data: [80, 82.5, 85, 87.5, 90, 92.5],
      borderColor: '#FFA726',
      backgroundColor: 'rgba(255, 167, 38, 0.5)',
      tension: 0.3,
    },
    {
      label: 'Deadlift',
      data: [140, 145, 150, 155, 160, 165],
      borderColor: '#66BB6A',
      backgroundColor: 'rgba(102, 187, 106, 0.5)',
      tension: 0.3,
    },
    {
      label: 'Total',
      data: [340, 352.5, 362.5, 372.5, 385, 397.5],
      borderColor: '#818cf8',
      backgroundColor: 'rgba(129, 140, 248, 0.5)',
      borderWidth: 3,
      tension: 0.3,
    }
  ],
};

export default function Big3Chart({ timeframe }) {
  const [chartData, setChartData] = useState(demoData);

  useEffect(() => {
    async function fetchData() {
      const records = await db.strengthRecords.toArray();
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

        if (!grouped[key]) grouped[key] = { squat: [], bench: [], deadlift: [] };
        const ex = r.exercise?.toLowerCase();
        if (ex === 'squat' || ex === 'bench' || ex === 'deadlift') {
          grouped[key][ex].push(r.estimated1RM || 0);
        }
      });

      const sortedKeys = Object.keys(grouped).sort();
      const sData = [], bData = [], dData = [], tData = [];

      sortedKeys.forEach(k => {
        const g = grouped[k];
        const sMax = g.squat.length ? Math.max(...g.squat) : null;
        const bMax = g.bench.length ? Math.max(...g.bench) : null;
        const dMax = g.deadlift.length ? Math.max(...g.deadlift) : null;
        sData.push(sMax);
        bData.push(bMax);
        dData.push(dMax);
        tData.push((sMax || 0) + (bMax || 0) + (dMax || 0) || null);
      });

      setChartData({
        labels: sortedKeys,
        datasets: [
          {
            label: 'Squat',
            data: sData,
            borderColor: '#4FC3F7',
            backgroundColor: 'rgba(79, 195, 247, 0.5)',
            tension: 0.3,
          },
          {
            label: 'Bench',
            data: bData,
            borderColor: '#FFA726',
            backgroundColor: 'rgba(255, 167, 38, 0.5)',
            tension: 0.3,
          },
          {
            label: 'Deadlift',
            data: dData,
            borderColor: '#66BB6A',
            backgroundColor: 'rgba(102, 187, 106, 0.5)',
            tension: 0.3,
          },
          {
            label: 'Total',
            data: tData,
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129, 140, 248, 0.5)',
            borderWidth: 3,
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
