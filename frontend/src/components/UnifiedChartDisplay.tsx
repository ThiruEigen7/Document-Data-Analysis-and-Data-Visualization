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

const UnifiedChartDisplay: React.FC<UnifiedChartDisplayProps> = ({ result }) => {
  if (!result.success) {
    return (
      <div className="bg-[#2a2f38] border border-red-500/30 rounded-lg p-6">
        <p className="text-red-400">Error: {result.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-[#191C22] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-[#1ABC9C]" /> Generated Visualization
          </h3>
          {result.data_points && (
            <span className="text-sm text-gray-400">
              {result.data_points} data points
            </span>
          )}
        </div>
        <div className="w-full">
          {typeof result.chart_data === "string" ? (
            // Matplotlib base64 image
            <img src={result.chart_data} alt="Generated Chart" className="w-full h-auto max-w-4xl mx-auto rounded-lg border border-gray-800 bg-[#23272F]" />
          ) : (
            // Plotly chart
            <Plot
              data={result.chart_data.data}
              layout={{
                ...result.chart_data.layout,
                autosize: true,
                margin: { l: 50, r: 50, b: 50, t: 50 },
                font: { family: "Inter, system-ui, sans-serif", color: "#fff" },
                paper_bgcolor: "#191C22",
                plot_bgcolor: "#191C22",
                colorway: ["#1ABC9C", "#3498DB", "#F39C12", "#E74C3C", "#9B59B6", "#34495E"],
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
      {/* Summary Only */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#23272F] rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-[#1ABC9C]" /> Chart Summary
          </h4>
          <div className="text-sm text-gray-300 whitespace-pre-line">
            {result.summary}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedChartDisplay;
