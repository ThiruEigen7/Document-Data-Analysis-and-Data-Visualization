import React from 'react';
import FileUploader from './FileUploader';
import ChartCard from './ChartCard';
import DataTable from './DataTable';
import { Dataset, ChartData } from '../types';

interface WorkspaceProps {
  activeSection: string;
  datasets: Dataset[];
  uploadingFiles: string[];
  charts: ChartData[];
  sampleData: Record<string, any>[];
  onUpload: (files: File[]) => void;
  onRemoveDataset: (id: string) => void;
  onPreviewDataset: (dataset: Dataset) => void;
}

export default function Workspace({
  activeSection,
  datasets,
  uploadingFiles,
  charts,
  sampleData,
  onUpload,
  onRemoveDataset,
  onPreviewDataset,
}: WorkspaceProps) {
  const renderContent = () => {
    switch (activeSection) {
      case 'upload':
        return (
          <FileUploader
            datasets={datasets}
            uploadingFiles={uploadingFiles}
            onUpload={onUpload}
            onRemove={onRemoveDataset}
            onPreview={onPreviewDataset}
          />
        );

      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-2">Total Datasets</h3>
                <p className="text-3xl font-bold text-[#1ABC9C]">{datasets.length}</p>
              </div>
              <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-2">Charts Generated</h3>
                <p className="text-3xl font-bold text-[#1ABC9C]">{charts.length}</p>
              </div>
              <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-2">Data Points</h3>
                <p className="text-3xl font-bold text-[#1ABC9C]">{sampleData.length}</p>
              </div>
            </div>
            
            {sampleData.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Sample Data Preview</h3>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Name', sortable: true },
                    { key: 'value', label: 'Value', sortable: true },
                    { key: 'category', label: 'Category', sortable: true },
                    { key: 'date', label: 'Date', sortable: true },
                  ]}
                  data={sampleData}
                  maxRows={5}
                />
              </div>
            )}
          </div>
        );

      case 'charts':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Generated Charts</h2>
              <button className="px-4 py-2 bg-[#1ABC9C] text-white rounded-lg hover:bg-[#1ABC9C]/90 transition-colors">
                Create New Chart
              </button>
            </div>
            
            {charts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {charts.map((chart) => (
                  <ChartCard key={chart.id} chart={chart} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No charts generated yet</p>
                <p className="text-gray-500 text-sm mt-2">Upload data and ask the assistant to create visualizations</p>
              </div>
            )}
          </div>
        );

      case 'forecast':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Forecasting</h2>
            <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-800">
              <p className="text-gray-400">Forecasting features will be available once you upload time-series data.</p>
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Reports</h2>
            <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-800">
              <p className="text-gray-400">Generate comprehensive reports from your analysis.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {renderContent()}
    </div>
  );
}