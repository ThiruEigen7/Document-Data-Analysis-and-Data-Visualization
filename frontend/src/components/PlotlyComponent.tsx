// src/components/chartjscom.tsx

import React from 'react';
import { Bar, Pie, Scatter, Line, Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement
);

interface ChartJSComponentProps {
  chartJson: any;
}

const ChartJSComponent: React.FC<ChartJSComponentProps> = ({ chartJson }) => {
  if (chartJson && chartJson.error) {
    return (
      <div className="bg-[#2a2f38] rounded-lg p-4 text-center border border-red-500/50 h-full flex flex-col justify-center">
        <div className="text-red-400 font-semibold mb-2">⚠️ Chart Generation Failed</div>
        <div className="text-gray-300 text-sm">{chartJson.error}</div>
      </div>
    );
  }

  if (!chartJson || !chartJson.data || !chartJson.data.length) {
    return null; // Don't render anything if there's no data
  }

  try {
    const trace = chartJson.data[0];
    const chartType = trace.type;
    const layout = chartJson.layout || {};

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: chartType === 'pie', labels: { color: '#A0A0A0' } },
        title: { display: !!layout.title?.text, text: layout.title?.text || '', color: '#FFFFFF', font: { size: 16 } },
      },
      scales: {
        x: { ticks: { color: '#A0A0A0' }, grid: { color: '#333' }, display: chartType !== 'pie' },
        y: { ticks: { color: '#A0A0A0' }, grid: { color: '#333' }, display: chartType !== 'pie' },
      },
    };

    let data;

    switch (chartType) {
      case 'bar':
        data = {
          labels: trace.x,
          datasets: [{
            label: trace.name || 'Dataset',
            data: trace.y,
            backgroundColor: '#1ABC9C',
          }],
        };
        return <div className="h-full w-full"><Bar data={data} options={options} /></div>;

      case 'pie':
        data = {
          labels: trace.labels, // Plotly uses 'labels' for pie charts
          datasets: [{
            data: trace.values, // Plotly uses 'values' for pie charts
            backgroundColor: ['#1ABC9C', '#3498DB', '#F1C40F', '#E74C3C', '#9B59B6', '#34495E'],
          }],
        };
        return <div className="h-full w-full"><Pie data={data} options={options} /></div>;

      case 'scatter':
        data = {
          datasets: [{
            label: trace.name || 'Scatter Dataset',
            data: trace.x.map((xVal: number, index: number) => ({ x: xVal, y: trace.y[index] })),
            backgroundColor: '#3498DB',
          }],
        };
        return <div className="h-full w-full"><Scatter data={data} options={options} /></div>;
      
      case 'line':
         data = {
          labels: trace.x,
          datasets: [{
            label: trace.name || 'Dataset',
            data: trace.y,
            borderColor: '#F1C40F',
            backgroundColor: 'rgba(241, 196, 15, 0.2)',
            fill: true,
          }],
        };
        return <div className="h-full w-full"><Line data={data} options={options} /></div>;


      case 'box':
        return (
            <div className="bg-[#2a2f38] rounded-lg p-4 text-center h-full flex items-center justify-center">
                <div className="text-yellow-400">Box plots are not natively supported by Chart.js.</div>
            </div>
        );

      default:
        return (
            <div className="bg-[#2a2f38] rounded-lg p-4 text-center h-full flex items-center justify-center">
                <div className="text-yellow-400">Unsupported chart type: {chartType}</div>
            </div>
        );
    }
  } catch (error) {
    console.error("Chart rendering error:", error);
    return (
        <div className="bg-[#2a2f38] rounded-lg p-4 text-center h-full flex items-center justify-center">
            <div className="text-red-400">Failed to render chart. Data might be in an unexpected format.</div>
        </div>
    );
  }
};

export default ChartJSComponent;