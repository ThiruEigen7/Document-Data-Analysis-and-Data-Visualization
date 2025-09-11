import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import Workspace from './components/Workspace';
import StyleGuide from './components/StyleGuide';
import { ChartData } from './types';

// Document interface
interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: Date;
  content?: string;
  summary?: string;
  keyPoints?: string[];
}

// Dataset interface for backward compatibility
interface Dataset {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: Date;
}

// Analysis result interfaces
interface ChartInfo {
  goal: {
    index: number;
    question: string;
    rationale: string;
    suggested_chart?: string;
  };
  chart_spec: any;
  preprocess_error?: string;
  chart_error_plotly?: string;
  chart_error_matplotlib?: string;
  chart_data_matplotlib?: string;
  chart_data_plotly?: any;
  processed_df?: any[];
}

interface AnalysisResult {
  file_id?: string; // New field from backend
  summary_json: any;
  summary_text: string;
  personas: Array<{ persona: string; rationale: string }>;
  selected_persona: { persona: string; rationale: string };
  goals: Array<{
    index: number;
    question: string;
    rationale: string;
    suggested_chart?: string;
  }>;
  charts: ChartInfo[];
  approach: string; // New field from backend
}

function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null); // Track current file ID

  // Updated document processing function
  const handleUpload = async (files: File[] = [], query?: string) => {
    // Determine which approach to use
    const hasNewFile = files.length > 0;
    const hasExistingFile = currentFileId && !hasNewFile;
    const hasQuery = query && query.trim();

    // Validation
    if (!hasNewFile && !hasExistingFile) {
      setNotificationMsg('Please upload a file first.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    if (hasExistingFile && !hasQuery) {
      setNotificationMsg('Please enter a query for analysis.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    const file = hasNewFile ? files[0] : uploadedFile;
    if (!file && hasNewFile) return;

    setIsAnalysisLoading(true);

    try {
      let result: AnalysisResult;
      let endpoint: string;
      const formData = new FormData();

      if (hasNewFile) {
        // Approach 1: Upload new file (with or without queries)
        endpoint = 'http://127.0.0.1:8000/analyze/';
        formData.append('file', file!);
        if (hasQuery) {
          formData.append('queries', query!);
        }
        setUploadedFile(file!);
        setUploadingFiles((prev) => [...prev, file!.name]);
      } else if (hasExistingFile && hasQuery) {
        // Approach 2: Analyze existing file with new queries
        endpoint = 'http://127.0.0.1:8000/analyze_existing/';
        formData.append('file_id', currentFileId!);
        formData.append('queries', query!);
      } else {
        throw new Error('Invalid request configuration');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Analysis failed with status ' + response.status);
      }

      result = await response.json();
      setAnalysisResult(result);

      // Store file ID for future queries
      if (result.file_id) {
        setCurrentFileId(result.file_id);
      }

      // Only create new document entry for new file uploads
      if (hasNewFile) {
        const documentInfo: Document = {
          id: result.file_id || Math.random().toString(36).substr(2, 9),
          name: file!.name,
          type: file!.type || 'application/csv',
          size: (file!.size / 1024).toFixed(1) + ' KB',
          uploadedAt: new Date(),
          summary: result.summary_text?.substring(0, 150) + '...',
          keyPoints: result.goals?.map((g: any) => g.question).slice(0, 3) || []
        };

        setDocuments((prev) => [...prev, documentInfo]);
      }

      // Success message based on approach
      const successMsg = hasNewFile 
        ? (hasQuery ? 'File uploaded and analyzed with your queries!' : 'Dataset analyzed successfully!')
        : 'Analysis completed for your queries!';
      
      setNotificationMsg(successMsg);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      setActiveSection('analyze');

    } catch (error: any) {
      setNotificationMsg(error.message || 'Processing failed. Please try again.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      if (hasNewFile && file) {
        setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
      }
      setIsAnalysisLoading(false);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
    // If removing current file, reset file tracking
    if (currentFileId === id) {
      setCurrentFileId(null);
      setUploadedFile(null);
      setAnalysisResult(null);
    }
  };

  const handlePreviewDocument = (document: Document) => {
    setSelectedDocument(document);
    setCurrentFileId(document.id);
    console.log('Preview document:', document);
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

  const handleUploadClick = () => {
    setActiveSection('overview');
  };

  const handleThemeToggle = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  // Helper: Map ChartInfo[] to ChartData[] for Workspace
  const mapChartsToChartData = (charts: ChartInfo[]): ChartData[] =>
    charts.map((c, idx) => ({
      id: String(idx),
      title: c.goal?.question || `Chart ${idx + 1}`,
      type: c.goal?.suggested_chart || c.chart_spec?.type || 'bar',
      data: Array.isArray(c.processed_df)
        ? c.processed_df.map((row: any) => ({
            name: row.name ?? row.label ?? row.x ?? '',
            value: row.value ?? row.y ?? row.count ?? 0,
          }))
        : [],
    }));

  // Convert documents to datasets format for backward compatibility
  const documentsAsDatasets: Dataset[] = documents.map(doc => ({
    id: doc.id,
    name: doc.name,
    size: doc.size,
    type: doc.type,
    uploadedAt: doc.uploadedAt
  }));

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

  const showWelcome = !analysisResult && activeSection !== 'overview' && activeSection !== 'upload';
  const showMainContent = activeSection === 'analyze' || activeSection === 'visualize' || showWelcome;

  return (
    <div className="min-h-screen bg-[#121212]">
      <Header 
        onUploadClick={handleUploadClick}
        onThemeToggle={handleThemeToggle}
        isDark={isDarkTheme}
      />
      <div className="flex">
        <Sidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          documents={documents}
        />
        {/* Main Content Area */}
        {(showMainContent || activeSection === 'upload') ? (
          <MainContent 
            analysisResult={analysisResult}
            onDownloadCSV={handleDownloadCSV}
            showWelcome={showWelcome}
            showUpload={activeSection === 'upload'}
            onUpload={handleUpload}
            hasUploadedFile={!!currentFileId}
          />
        ) : (
          <div className="flex-1 flex">
            <div className="flex-1 overflow-auto bg-[#121212] p-6">
              <Workspace
                activeSection={activeSection}
                datasets={documentsAsDatasets}
                uploadingFiles={uploadingFiles}
                onUpload={handleUpload}
                onRemoveDataset={handleRemoveDocument}
                onPreviewDataset={(dataset) => {
                  const doc = documents.find(d => d.id === dataset.id);
                  if (doc) handlePreviewDocument(doc);
                }}
                charts={mapChartsToChartData(analysisResult?.charts ?? [])}
                sampleData={[]}
              />
            </div>
            <div className="w-full lg:w-96 h-96 lg:h-full flex-shrink-0"></div>
          </div>
        )}
      </div>
      {/* Loading Overlay */}
      {isAnalysisLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-[#232323] px-6 py-6 rounded-lg flex flex-col items-center gap-2 shadow-lg text-center">
            <span className="animate-spin text-4xl text-[#1ABC9C]">⏳</span>
            <span className="text-white text-lg font-semibold mt-2">Processing Document...</span>
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