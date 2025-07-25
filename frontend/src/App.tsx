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

  // Sample data for demonstration
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

  const handleUpload = (files: File[]) => {
    // Add files to uploading state
    const fileNames = files.map(file => file.name);
    setUploadingFiles(prev => [...prev, ...fileNames]);
    
    // Process each file with realistic delays
    files.forEach((file, index) => {
      const processingTime = 2000 + (index * 500) + Math.random() * 1000; // 2-3.5 seconds per file
      
      setTimeout(() => {
        // Remove from uploading state
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
        
        // Add to datasets
        const newDataset: Dataset = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type || 'Unknown',
          uploadedAt: new Date(),
        };
        
        setDatasets(prev => [...prev, newDataset]);
        
        // Add success message for first file
        if (index === 0) {
          setTimeout(() => {
            const message: ChatMessage = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'agent',
              content: `Great! I've analyzed your dataset "${file.name}". I found ${sampleData.length} records with columns for name, value, category, and date. Would you like me to create some visualizations?`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, message]);
          }, 500);
        }
      }, processingTime);
    });
  };

  const handleRemoveDataset = (id: string) => {
    setDatasets(datasets.filter(d => d.id !== id));
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
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Simulate agent response
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
      
      setMessages(prev => [...prev, agentMessage]);
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
          
          {/* Workspace */}
          <div className="flex-1 overflow-auto bg-[#121212]">
            <Workspace
              activeSection={activeSection}
              datasets={datasets}
              uploadingFiles={uploadingFiles}
              charts={sampleCharts}
              sampleData={sampleData}
              onUpload={handleUpload}
              onRemoveDataset={handleRemoveDataset}
              onPreviewDataset={handlePreviewDataset}
            />
          </div>
        </div>

        {/* Chat Pane */}
        <div className="w-full lg:w-96 h-96 lg:h-full flex-shrink-0">
          <ChatPane
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default App;