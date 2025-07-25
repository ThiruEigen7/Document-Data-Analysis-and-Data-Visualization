import React, { useState } from 'react';
import { MoreHorizontal, Download, Maximize2 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartData } from '../types';

interface ChartCardProps {
  chart: ChartData;
  onExpand?: () => void;
  onDownload?: () => void;
}

const colors = ['#1ABC9C', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12', '#2ECC71'];

export default function ChartCard({ chart, onExpand, onDownload }: ChartCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const renderChart = () => {
    switch (chart.type) {
      case 'line':
        return (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#FFFFFF'
              }} 
            />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#1ABC9C" strokeWidth={2} />
          </LineChart>
        );
      
      case 'bar':
        return (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#FFFFFF'
              }} 
            />
            <Bar dataKey="value" fill="#1ABC9C" />
          </BarChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label
            >
              {chart.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#FFFFFF'
              }} 
            />
            <Legend />
          </PieChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#1E1E1E] rounded-lg border border-gray-800 p-6 hover:border-[#1ABC9C]/50 
                   transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1ABC9C]/10
                   group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{chart.title}</h3>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-10 bg-[#2A2A2A] border border-gray-700 rounded-lg 
                          shadow-lg z-10 min-w-[150px]">
              <button
                onClick={() => {
                  onExpand?.();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white 
                         hover:bg-gray-700 transition-colors"
              >
                <Maximize2 size={14} />
                Expand
              </button>
              <button
                onClick={() => {
                  onDownload?.();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white 
                         hover:bg-gray-700 transition-colors"
              >
                <Download size={14} />
                Download
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}