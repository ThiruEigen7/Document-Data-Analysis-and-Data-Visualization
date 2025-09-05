import React from "react";
import Plot from "react-plotly.js";
import { Download, FileText, TrendingUp } from "lucide-react";

export interface UnifiedChartDisplayProps {
  result: {
    success: boolean;
    error?: string;
    chart_data: string | any;
    data_points?: number;
    summary?: string;
    processed_data?: any[];
  };
  onDownload: () => void;
}

const UnifiedChartDisplay: React.FC<UnifiedChartDisplayProps> = ({ result, onDownload }) => {
  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Error: {result.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" /> Generated Visualization
          </h3>
          {result.data_points && (
            <span className="text-sm text-gray-500">
              {result.data_points} data points
            </span>
          )}
        </div>
        <div className="w-full">
          {typeof result.chart_data === "string" ? (
            // Matplotlib base64 image
            <img src={result.chart_data} alt="Generated Chart" className="w-full h-auto max-w-4xl mx-auto" />
          ) : (
            // Plotly chart
            <Plot
              data={result.chart_data.data}
              layout={{
                ...result.chart_data.layout,
                autosize: true,
                margin: { l: 50, r: 50, b: 50, t: 50 },
                font: { family: "Inter, system-ui, sans-serif" },
              }}
              style={{ width: "100%", height: "500px" }}
              config={{
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ["pan2d", "lasso2d"],
              }}
            />
          )}
        </div>
      </div>
      {/* Summary and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" /> Chart Summary
          </h4>
          <div className="text-sm text-gray-700 whitespace-pre-line">
            {result.summary}
          </div>
        </div>
        {/* Processed Data */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Processed Data</h4>
            <button
              onClick={onDownload}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b">
                  {Object.keys(result.processed_data?.[0] || {}).map((key) => (
                    <th key={key} className="text-left py-2 px-1 font-medium text-gray-700">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.processed_data?.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="py-1 px-1 text-gray-600">
                        {typeof value === "number" ? value.toFixed(2) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {result.processed_data && result.processed_data.length > 10 && (
              <p className="text-xs text-gray-500 mt-2">
                Showing 10 of {result.processed_data.length} rows
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedChartDisplay;
