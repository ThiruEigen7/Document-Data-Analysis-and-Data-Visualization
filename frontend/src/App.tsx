import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import ChatPane from './components/ChatPane';
import StyleGuide from './components/StyleGuide';
import { Dataset, ChatMessage, ChartData } from './types';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('upload');
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sample data/chart as before (for Workspace)
  const sampleData = [
    { name: 'Product A', value: 120, category: 'Electronics', date: '2024-01-15' },
    { name: 'Product B', value: 85, category: 'Clothing', date: '2024-01-16' },
    { name: 'Product C', value: 200, category: 'Electronics', date: '2024-01-17' },
    { name: 'Product D', value: 150, category: 'Home', date: '2024-01-18' },
    { name: 'Product E', value: 95, category: 'Clothing', date: '2024-01-19' },
  ];
  const sampleCharts: ChartData[] = [
    {
      id: '1',
      title: 'Sales Trend',
      type: 'line',
      data: [
        { name: 'Jan', value: 400 },
        { name: 'Feb', value: 300 },
        { name: 'Mar', value: 600 },
        { name: 'Apr', value: 800 },
        { name: 'May', value: 500 },
      ],
    },
    {
      id: '2',
      title: 'Category Distribution',
      type: 'pie',
      data: [
        { name: 'Electronics', value: 320 },
        { name: 'Clothing', value: 180 },
        { name: 'Home', value: 150 },
        { name: 'Books', value: 100 },
      ],
    },
    {
      id: '3',
      title: 'Monthly Revenue',
      type: 'bar',
      data: [
        { name: 'Q1', value: 2400 },
        { name: 'Q2', value: 1398 },
        { name: 'Q3', value: 9800 },
        { name: 'Q4', value: 3908 },
      ],
    },
  ];

  // === Analysis state and notification ===
  const [analysisResult, setAnalysisResult] = useState<null | {
    summary_text: string;
    personas: Array<{ persona: string; rationale: string }>;
    selected_persona: { persona: string; rationale: string };
    goals: Array<{ question: string; visualization: string; rationale: string }>;
  }>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  // Upload logic: hit FastAPI backend and show results below uploader
  const handleUpload = async (files: File[]) => {
    const file = files[0];
    setUploadingFiles((prev) => [...prev, file.name]);
    setIsAnalysisLoading(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('n_personas', '5');
    formData.append('n_goals', '5');

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze/', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Analysis failed');
      const result = await response.json();
      setAnalysisResult(result);

      // Add new uploaded dataset to list
      const newDataset: Dataset = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type || 'Unknown',
        uploadedAt: new Date(),
      };
      setDatasets((prev) => [...prev, newDataset]);

      setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
      setNotificationMsg('Dataset analyzed successfully!');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      const message: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'agent',
        content: `Great! I've analyzed your dataset "${file.name}". Would you like me to help create visualizations?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
    } catch (error) {
      setNotificationMsg('Analysis failed. Please try again.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Remaining handlers unchanged...
  const handleRemoveDataset = (id: string) => {
    setDatasets(datasets.filter((d) => d.id !== id));
  };
  const handlePreviewDataset = (dataset: Dataset) => {
    console.log('Preview dataset:', dataset);
  };
  const handleSendMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setTimeout(() => {
      const responses = [
        "I can help you create that visualization! Let me generate a chart based on your data.",
        "That's an interesting question about your data. Based on the patterns I see, here's what I found...",
        "I'll analyze the trends in your dataset and create a comprehensive report for you.",
        "Let me break down the correlation between those variables for you.",
      ];
      const agentMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'agent',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsLoading(false);
    }, 2000);
  };

  if (showStyleGuide) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <div className="p-4">
          <button
            onClick={() => setShowStyleGuide(false)}
            className="mb-4 px-4 py-2 bg-[#1ABC9C] text-white rounded-lg hover:bg-[#1ABC9C]/90 transition-colors"
          >
            ← Back to App
          </button>
        </div>
        <StyleGuide />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#121212] flex overflow-hidden">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Breadcrumb */}
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
          {/* Workspace - passes charts and sampleData */}
          <div className="flex-1 overflow-auto bg-[#121212]">
            <Workspace
              activeSection={activeSection}
              datasets={datasets}
              uploadingFiles={uploadingFiles}
              charts={sampleCharts}           // props fix for types
              sampleData={sampleData}
              onUpload={handleUpload}
              onRemoveDataset={handleRemoveDataset}
              onPreviewDataset={handlePreviewDataset}
            />

            {/* Analysis Results: appear below the uploader/workspace only after upload */}
            {analysisResult && (
              <div className="w-full max-w-3xl mx-auto mt-8 grid gap-7">
                {/* Data Summary */}
                <section className="bg-[#191C22] rounded-xl shadow-lg p-7">
                  <h2 className="text-2xl font-bold mb-4 text-[#1ABC9C]">Data Summary</h2>
                  <p className="text-base text-gray-100 whitespace-pre-line" style={{ lineHeight: 1.65 }}>
                    {analysisResult.summary_text}
                  </p>
                </section>
                {/* Personas */}
                <section className="bg-[#16181D] rounded-xl shadow-md p-7">
                  <h2 className="text-xl font-bold mb-3 text-[#A0A0A0]">Personas</h2>
                  <ul className="list-decimal ml-6 text-white space-y-3">
                    {analysisResult.personas?.map((p, i) => (
                      <li key={i}>
                        <span className="font-semibold text-[#1ABC9C]">{p.persona}</span>
                        <span className="text-[#A0A0A0]"> — {p.rationale}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                {/* Goals */}
                <section className="bg-[#141619] rounded-xl shadow-md p-7">
                  <h2 className="text-xl font-bold mb-3 text-[#A0A0A0]">
                    Goals for {analysisResult.selected_persona?.persona}
                  </h2>
                  <ol className="space-y-5">
                    {analysisResult.goals?.map((g, i) => (
                      <li key={i} className="p-4 bg-[#232831] rounded-md">
                        <div className="mb-1">
                          <span className="font-medium text-[#1ABC9C]">Q{i + 1}: </span>
                          <span className="text-white">{g.question}</span>
                        </div>
                        <div className="mb-1">
                          <span className="font-medium text-[#F39C12]">Visualization: </span>
                          <span className="text-white">{g.visualization}</span>
                        </div>
                        <div>
                          <span className="font-medium text-[#3498DB]">Rationale: </span>
                          <span className="text-white">{g.rationale}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Chat Pane unchanged */}
        <div className="w-full lg:w-96 h-96 lg:h-full flex-shrink-0">
          <ChatPane
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
      {/* Loading Overlay */}
      {isAnalysisLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-[#232323] px-6 py-6 rounded-lg flex flex-col items-center gap-2 shadow-lg text-center">
            <span className="animate-spin text-[#1ABC9C] w-8 h-8 mb-2">⏳</span>
            <span className="text-white text-lg font-semibold">Analyzing dataset...</span>
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
