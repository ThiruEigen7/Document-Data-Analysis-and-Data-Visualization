// Helper: decode base64-encoded float64 array (for Plotly's bdata)
function decodeBase64Float64(bdata: string): number[] {
  const binary = atob(bdata);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  const floats = new Float64Array(bytes.buffer);
  return Array.from(floats);
}

import React from 'react';
import { Bar, Pie, Scatter, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
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
    return null;
  }

  try {
    const trace = chartJson.data[0];
    const chartType = trace.type;
    const layout = chartJson.layout || {};

    // Decode x and y if needed
    let x: any = trace.x;
    let y: any = trace.y;
    if (x && typeof x === 'object' && x.bdata) {
      x = decodeBase64Float64(x.bdata);
    }
    if (y && typeof y === 'object' && y.bdata) {
      y = decodeBase64Float64(y.bdata);
    }

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
      case 'bar': {
        const labels = Array.isArray(x) ? x : [];
        const values = Array.isArray(y) ? y : [];
        if (!labels.length || !values.length) {
          return <div className="text-red-400">Chart data missing or invalid for bar chart.</div>;
        }
        data = {
          labels,
          datasets: [{
            label: trace.name || 'Dataset',
            data: values,
            backgroundColor: '#1ABC9C',
          }],
        };
        return <div className="h-full w-full"><Bar data={data} options={options} /></div>;
      }

      case 'pie': {
        const pieLabels = Array.isArray(trace.labels) ? trace.labels : Array.isArray(x) ? x : [];
        const pieValues = Array.isArray(trace.values) ? trace.values : Array.isArray(y) ? y : [];
        if (!pieLabels.length || !pieValues.length) {
          return <div className="text-red-400">Chart data missing or invalid for pie chart.</div>;
        }
        data = {
          labels: pieLabels,
          datasets: [{
            data: pieValues,
            backgroundColor: ['#1ABC9C', '#3498DB', '#F1C40F', '#E74C3C', '#9B59B6', '#34495E'],
          }],
        };
        return <div className="h-full w-full"><Pie data={data} options={options} /></div>;
      }

      case 'scatter':
      case 'scattergl': {
        const scatterX = Array.isArray(x) ? x : [];
        const scatterY = Array.isArray(y) ? y : [];
        if (!scatterX.length || !scatterY.length) {
          return <div className="text-red-400">Chart data missing or invalid for scatter chart.</div>;
        }
        data = {
          datasets: [{
            label: trace.name || 'Scatter Dataset',
            data: scatterX.map((xVal: number, index: number) => ({ x: xVal, y: scatterY[index] })),
            backgroundColor: '#3498DB',
          }],
        };
        return <div className="h-full w-full"><Scatter data={data} options={options} /></div>;
      }

      case 'line': {
        const lineLabels = Array.isArray(x) ? x : [];
        const lineValues = Array.isArray(y) ? y : [];
        if (!lineLabels.length || !lineValues.length) {
          return <div className="text-red-400">Chart data missing or invalid for line chart.</div>;
        }
        data = {
          labels: lineLabels,
          datasets: [{
            label: trace.name || 'Dataset',
            data: lineValues,
            borderColor: '#F1C40F',
            backgroundColor: 'rgba(241, 196, 15, 0.2)',
            fill: true,
          }],
        };
        return <div className="h-full w-full"><Line data={data} options={options} /></div>;
      }

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
