import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import db from '../../db/database';

ChartJS.register(ArcElement, Tooltip, Legend);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#94a3b8'
      }
    }
  },
  cutout: '70%',
};

const demoData = {
  labels: ['UT2', 'UT1', 'AT', 'TR', 'AN'],
  datasets: [
    {
      data: [60, 20, 10, 7, 3],
      backgroundColor: [
        '#60a5fa', // UT2 Blue
        '#34d399', // UT1 Green
        '#fbbf24', // AT Yellow
        '#f87171', // TR Red
        '#c084fc', // AN Purple
      ],
      borderWidth: 0,
      hoverOffset: 4
    }
  ]
};

export default function ZoneDistributionChart() {
  const [chartData, setChartData] = useState(demoData);

  useEffect(() => {
    // Implement db fetching later
  }, []);

  return (
    <div style={{ height: '350px', width: '100%' }}>
      <Doughnut options={chartOptions} data={chartData} />
    </div>
  );
}
