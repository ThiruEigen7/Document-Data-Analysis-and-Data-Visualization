// src/components/chartcom.tsx

import React from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement,
} from 'chart.js';
import { ChartData } from '../types'; // Make sure this path is correct

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement
);

interface ChartComponentProps {
  chart: ChartData;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ chart }) => {
  const chartData = {
    labels: chart.data.map((d: any) => d.name),
    datasets: [{
      label: chart.title,
      data: chart.data.map((d: any) => d.value),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
      borderColor: '#232831',
      borderWidth: 2,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: chart.type === 'pie', labels: { color: '#A0A0A0' } },
      title: { display: true, text: chart.title, color: '#FFFFFF', font: { size: 16 } },
    },
    scales: {
      x: { ticks: { color: '#A0A0A0' }, grid: { color: '#333' }, display: chart.type !== 'pie' },
      y: { ticks: { color: '#A0A0A0' }, grid: { color: '#333' }, display: chart.type !== 'pie' },
    },
  };

  const renderChart = () => {
    switch (chart.type) {
      case 'bar': return <Bar data={chartData} options={options} />;
      case 'line': return <Line data={chartData} options={options} />;
      case 'pie': return <Pie data={chartData} options={options} />;
      default: return <div className="text-red-500">Unsupported chart type: {chart.type}</div>;
    }
  };

  return (
    <div className="bg-[#191C22] p-4 rounded-lg shadow-md h-full">
      <div style={{ height: '300px' }}>{renderChart()}</div>
    </div>
  );
};

export default ChartComponent;