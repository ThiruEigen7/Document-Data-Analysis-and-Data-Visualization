// App.tsx
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import StyleGuide from './components/StyleGuide';
import { ChartData } from './types';

// Document interface (ensure consistency)
interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: Date;
  content?: string;
  summary?: string;
  keyPoints?: string[];
  columns?: string[];
}

// Analysis result interfaces (ensure consistency)
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
  file_id?: string;
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
  approach: string;
  columns?: string[];
}

function App() {
  const [activeSection, setActiveSection] = useState('chat'); 
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // This is the file currently selected in the INPUT FIELD
  const [currentActiveFileId, setCurrentActiveFileId] = useState<string | null>(null); // This is the ID of the file the CHAT is currently operating on (either new upload or sidebar selection)
  const [currentFileColumns, setCurrentFileColumns] = useState<string[]>([]); 
  const [currentFileName, setCurrentFileName] = useState<string | null>(null); // New state to hold the name of the currently active file

  // Effect to update currentFileName and columns based on selectedDocument or latest upload
  useEffect(() => {
    if (selectedDocument) {
      setCurrentFileName(selectedDocument.name);
      setCurrentFileColumns(selectedDocument.columns || []);
      setCurrentActiveFileId(selectedDocument.id);
      setUploadedFile(null); // Clear the temporary uploadedFile from the input field
    } else if (uploadedFile) { // If a file is in the input field but not yet fully processed/selected
      setCurrentFileName(uploadedFile.name);
      setCurrentFileColumns([]); // No columns until processed
      setCurrentActiveFileId(null);
    } else {
      setCurrentFileName(null);
      setCurrentFileColumns([]);
      setCurrentActiveFileId(null);
    }
  }, [selectedDocument, uploadedFile]);


  const handleUpload = async (files: File[] = [], query?: string) => {
    console.log('handleUpload called:', { files, query, currentActiveFileId, uploadedFile });
    
    // Determine the actual file and its ID for the backend call
    const fileToProcess = files.length > 0 ? files[0] : uploadedFile;
    const fileIdForBackend = files.length > 0 ? null : currentActiveFileId;
    const isNewFileUpload = files.length > 0;
    const isQueryOnExistingFile = currentActiveFileId && !isNewFileUpload;
    const hasQuery = query && query.trim();

    // Validation
    if (!fileToProcess && !isQueryOnExistingFile) {
      setNotificationMsg('Please upload a file first.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }
    if (isQueryOnExistingFile && !hasQuery) {
      setNotificationMsg('Please enter a query for analysis.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    setIsAnalysisLoading(true);

    // --- NEW: If user is uploading a new file, extract columns client-side and show immediately ---
    if (isNewFileUpload && fileToProcess) {
      // Only parse CSV/Excel/JSON for columns
      const fileName = fileToProcess.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const firstLine = text.split('\n')[0];
          const columns = firstLine.split(',').map(col => col.trim());
          setCurrentFileColumns(columns);
          setCurrentFileName(fileToProcess.name);
        };
        reader.readAsText(fileToProcess);
      } else if (fileName.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            const columns = Array.isArray(json) && json.length > 0
              ? Object.keys(json[0])
              : Object.keys(json);
            setCurrentFileColumns(columns);
            setCurrentFileName(fileToProcess.name);
          } catch {
            setCurrentFileColumns([]);
          }
        };
        reader.readAsText(fileToProcess);
      } // Excel support can be added with a library like SheetJS
    }

    try {
      let result: AnalysisResult;
      let endpoint: string;
      const formData = new FormData();

      if (isNewFileUpload) {
        endpoint = 'http://127.0.0.1:8000/two_agent/';
        formData.append('file', fileToProcess!);
        if (hasQuery) {
          formData.append('instruction', query!);
        }
        setUploadingFiles((prev) => [...prev, fileToProcess!.name]);
      } else if (isQueryOnExistingFile) {
        endpoint = 'http://127.0.0.1:8000/two_agent_query/';
        formData.append('file_id', fileIdForBackend!);
        formData.append('instruction', query!);
      } else {
        throw new Error('Invalid request configuration'); // Should not happen with above checks
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

      // Update the active file ID and columns
      if (result.file_id) {
        setCurrentActiveFileId(result.file_id);
      }
      if (result.columns) {
        setCurrentFileColumns(result.columns);
      }
      
      // Update or add the document to the documents list
      const processedDocInfo: Document = {
        id: result.file_id || Math.random().toString(36).substr(2, 9),
        name: fileToProcess?.name || "Unknown File", // Use processed file name
        type: fileToProcess?.type || 'application/csv',
        size: (fileToProcess?.size / 1024).toFixed(1) + ' KB',
        uploadedAt: new Date(),
        summary: result.summary_text?.substring(0, 150) + '...',
        keyPoints: result.goals?.map((g: any) => g.question).slice(0, 3) || [],
        columns: result.columns || []
      };

      setDocuments((prev) => {
        const existingDocIndex = prev.findIndex(doc => doc.id === processedDocInfo.id);
        if (existingDocIndex > -1) {
          const updatedDocs = [...prev];
          updatedDocs[existingDocIndex] = processedDocInfo;
          return updatedDocs;
        }
        return [...prev, processedDocInfo];
      });
      setSelectedDocument(processedDocInfo); // Set this document as selected

      // Clear the temporary file in the input field after successful processing
      setUploadedFile(null); 

      const successMsg = isNewFileUpload 
        ? (hasQuery ? 'File uploaded and analyzed with your queries!' : 'Dataset analyzed successfully!')
        : 'Analysis completed for your queries!';
      
      setNotificationMsg(successMsg);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      setActiveSection('chat'); 

    } catch (error: any) {
      setNotificationMsg(error.message || 'Processing failed. Please try again.');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      if (fileToProcess) {
        setUploadingFiles((prev) => prev.filter((name) => name !== fileToProcess.name));
      }
      setIsAnalysisLoading(false);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
    if (currentActiveFileId === id) {
      setCurrentActiveFileId(null);
      setAnalysisResult(null);
      setCurrentFileColumns([]); 
      setCurrentFileName(null);
    }
  };

  const handlePreviewDocument = (document: Document) => {
    setSelectedDocument(document);
    setCurrentActiveFileId(document.id); // Set the active file ID
    setCurrentFileName(document.name); // Set the active file name
    setCurrentFileColumns(document.columns || []); 
    setUploadedFile(null); // Clear any pending file in the input field
    setActiveSection('chat'); 
  };

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
    setActiveSection('chat'); 
  };

  const handleThemeToggle = () => {
    setIsDarkTheme(!isDarkTheme);
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

  const showWelcomeInMainContent = !analysisResult && !currentActiveFileId && !uploadedFile;

  return (
    <div className="min-h-screen flex flex-col bg-[#121212]">
      <Header 
        onUploadClick={handleUploadClick}
        onThemeToggle={handleThemeToggle}
        isDark={isDarkTheme}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          documents={documents}
          onRemoveDocument={handleRemoveDocument}
          onPreviewDocument={handlePreviewDocument}
          selectedDocumentId={selectedDocument?.id}
        />
        <MainContent 
          analysisResult={analysisResult}
          onDownloadCSV={handleDownloadCSV}
          showWelcome={showWelcomeInMainContent}
          onUpload={handleUpload}
          hasUploadedFile={!!currentActiveFileId || !!uploadedFile}  // Use currentActiveFileId to indicate if a file is active
          currentFileColumns={currentFileColumns}
          currentFileName={currentFileName} // Pass the determined current file name
          uploadedFileFromInput={uploadedFile} // Pass the temporary uploaded file from input
          setUploadedFileFromInput={setUploadedFile}
          setCurrentFileColumns={setCurrentFileColumns}   // ✅ ADD THIS
          setCurrentFileName={setCurrentFileName}
          onPreviewDocument={handlePreviewDocument}  // Pass setter for MainContent to manage its internal file state
        />
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