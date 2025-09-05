import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import ChatPane from './components/ChatPane';
import StyleGuide from './components/StyleGuide';
import { Dataset, ChatMessage, ChartData } from './types'; // Assuming types.ts is in the same directory
import UnifiedChartDisplay from './components/UnifiedChartDisplay';

// Define the structure for the analysis result for type safety
interface ChartInfo {
  goal: {
    question: string;
    visualization: string;
    rationale: string;
  };
  chart_spec: any;
  preprocess_error?: string;
  chart_error?: string;
  chart_data_matplotlib?: string;
  chart_data_plotly?: any;
  processed_df?: any[];
}

interface AnalysisResult {
  summary_json: any;
  summary_text: string;
  personas: Array<{ persona: string; rationale: string }>;
  selected_persona: { persona: string; rationale: string };
  goals: Array<{ 
    question: string;  
    visualization: string; 
    rationale: string; 
  }>;
  charts: ChartInfo[];
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('upload');
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  // Main function to call the backend API
  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    
    setUploadingFiles((prev) => [...prev, file.name]);
    setIsAnalysisLoading(true);
    setAnalysisResult(null); // Clear previous results

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Try to get a more detailed error from the backend
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Analysis failed with status ' + response.status);
      }

      const result = await response.json();
      console.log("Analysis Result from backend:", result);
      setAnalysisResult(result);

      // Add new uploaded dataset to the list
      const newDataset: Dataset = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type || 'Unknown',
        uploadedAt: new Date(),
      };
      setDatasets((prev) => [...prev, newDataset]);
      
      setNotificationMsg('Dataset analyzed successfully!');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      // Add a message to the chat pane
      const message: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'agent',
        content: `Great! I've analyzed your dataset "${file.name}". Below are the summary, personas, and actionable goals.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);

    } catch (error: any) {
      console.error("Upload Error:", error);
      setNotificationMsg(error.message || 'Analysis failed. Please try again.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
      setIsAnalysisLoading(false);
    }
  };

  const handleRemoveDataset = (id: string) => {
    setDatasets(datasets.filter((d) => d.id !== id));
  };

  const handlePreviewDataset = (dataset: Dataset) => {
    console.log('Preview dataset:', dataset);
  };

  const handleSendMessage = (content: string) => {
    // This logic can be expanded to interact with the analysis results
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    // Placeholder for chatbot response logic
    setTimeout(() => {
      const agentMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'agent',
        content: "I'm ready to help you explore this data further!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsLoading(false);
    }, 1500);
  };

  // CSV download handler
  const handleDownloadCSV = (data: any[], filename: string = 'processed_data.csv') => {
    if (!data || !data.length) return;
    const keys = Object.keys(data[0]);
    const csvRows = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (showStyleGuide) {
    return (
      <div className="min-h-screen bg-[#121212] p-4">
        <button
          onClick={() => setShowStyleGuide(false)}
          className="mb-4 px-4 py-2 bg-[#1ABC9C] text-white rounded-lg hover:bg-[#1ABC9C]/90 transition-colors"
        >
          ← Back to App
        </button>
        <StyleGuide />
      </div>
    );
  }

  // Helper: Map ChartInfo[] to ChartData[] for Workspace
  const mapChartsToChartData = (charts: ChartInfo[]): ChartData[] =>
    charts.map((c, idx) => ({
      id: String(idx),
      title: c.goal?.question || `Chart ${idx + 1}`,
      type: c.chart_spec?.type || 'bar',
      data: Array.isArray(c.processed_df)
        ? c.processed_df.map((row: any) => ({
            name: row.name ?? row.label ?? row.x ?? '',
            value: row.value ?? row.y ?? row.count ?? 0,
          }))
        : [],
    }));

  return (
    <div className="h-screen bg-[#121212] flex overflow-hidden">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-[#1E1E1E] border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">DataViz Agent</span>
              <span className="text-gray-600">→</span>
              <span className="text-white capitalize">{activeSection}</span>
            </div>
            <button
              onClick={() => setShowStyleGuide(true)}
              className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
            >
              Style Guide
            </button>
          </div>
          
          {/* Scrollable Workspace */}
          <div className="flex-1 overflow-auto bg-[#121212] p-6">
            <Workspace
              activeSection={activeSection}
              datasets={datasets}
              uploadingFiles={uploadingFiles}
              onUpload={handleUpload}
              onRemoveDataset={handleRemoveDataset}
              onPreviewDataset={handlePreviewDataset}
              charts={mapChartsToChartData(analysisResult?.charts ?? [])}
              sampleData={[]}
            />

            {/* Analysis Results Display */}
            {analysisResult && (
              <div className="w-full max-w-4xl mx-auto mt-8 grid gap-8">
                {/* Data Summary Section */}
                <section className="bg-[#191C22] rounded-xl shadow-lg p-7">
                  <h2 className="text-2xl font-bold mb-4 text-[#1ABC9C]">Data Summary</h2>
                  {/* FIX: Render summary as a list to respect points/newlines */}
                  <ul className="list-disc ml-5 space-y-2 text-base text-gray-200">
                    {analysisResult.summary_text.split('\n').filter(line => line.trim()).map((line, index) => (
                      <li key={index}>{line.trim().replace(/^- /, '')}</li>
                    ))}
                  </ul>
                </section>
                
                {/* Personas Section */}
                <section className="bg-[#16181D] rounded-xl shadow-md p-7">
                  <h2 className="text-xl font-bold mb-3 text-gray-300">Personas</h2>
                  <ul className="list-decimal ml-6 text-white space-y-3">
                    {analysisResult.personas?.map((p, i) => (
                      <li key={i}>
                        <span className="font-semibold text-[#1ABC9C]">{p.persona}</span>
                        <span className="text-gray-400"> — {p.rationale}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Goals & Charts Section */}
                <section>
                  <h2 className="text-2xl font-bold mb-4 text-gray-200">
                    Goals for {analysisResult.selected_persona?.persona}
                  </h2>
                  <div className="space-y-6">
                    {analysisResult.goals?.map((g, i) => {
                      // Find corresponding chart info for this goal
                      const chartInfo = analysisResult.charts?.find(
                        c => c.goal?.question === g.question
                      );
                      // Compose result object for UnifiedChartDisplay
                      const result = chartInfo
                        ? {
                            success: !chartInfo.preprocess_error && !chartInfo.chart_error,
                            error: chartInfo.preprocess_error || chartInfo.chart_error || undefined,
                            chart_data:
                              chartInfo.chart_data_matplotlib || chartInfo.chart_data_plotly || null,
                            data_points: chartInfo.processed_df?.length || 0,
                            summary: g.rationale,
                            processed_data: chartInfo.processed_df || [],
                          }
                        : { success: false, error: 'No chart data found', chart_data: null };
                      return (
                        <div key={i} className="p-5 bg-[#191C22] rounded-xl">
                          <div className="mb-3">
                            <p className="font-semibold text-lg text-white mb-1">{g.question}</p>
                            <p className="text-sm text-gray-400">
                              <span className="font-medium text-[#F39C12]">Suggested Viz: </span>
                              {g.visualization}
                            </p>
                          </div>
                          {/* CHART RENDERING AREA */}
                          <div className="mt-4 bg-transparent rounded-lg">
                            <UnifiedChartDisplay
                              result={result}
                              onDownload={() => handleDownloadCSV(result.processed_data ?? [])}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Chat Pane */}
        <div className="w-full lg:w-96 h-96 lg:h-full flex-shrink-0">
          <ChatPane messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
      
      {/* Loading Overlay */}
      {isAnalysisLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-[#232323] px-6 py-6 rounded-lg flex flex-col items-center gap-2 shadow-lg text-center">
            <span className="animate-spin text-4xl text-[#1ABC9C]">⏳</span>
            <span className="text-white text-lg font-semibold mt-2">Analyzing Dataset...</span>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed right-5 bottom-5 z-50 bg-[#1ABC9C] text-white px-6 py-4 rounded-lg shadow-lg animate-fadeIn font-semibold">
          {notificationMsg}
        </div>
      )}
    </div>
  );
}

export default App;