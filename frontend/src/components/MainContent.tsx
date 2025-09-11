// File: src/components/MainContent.tsx  
import React, { useState } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';
import UnifiedChartDisplay from './UnifiedChartDisplay';

// Define types locally
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
}

interface MainContentProps {
  analysisResult: AnalysisResult | null;
  onDownloadCSV: (data: any[], filename?: string) => void;
  showWelcome: boolean;
  showUpload?: boolean;
  onUpload?: (files: File[], query?: string) => void;
  hasUploadedFile?: boolean; // New prop to track if file is uploaded
}

export default function MainContent({ 
  analysisResult, 
  onDownloadCSV, 
  showWelcome, 
  showUpload = false, 
  onUpload,
  hasUploadedFile = false
}: MainContentProps) {
  const [message, setMessage] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ 
    type: 'user' | 'file' | 'response', 
    content: string, 
    fileName?: string,
    approach?: string 
  }>>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Submit both file and query together
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasNewFile = !!uploadFile;
    const hasQuery = message.trim();
    const canSubmit = hasNewFile || (hasUploadedFile && hasQuery);

    if (canSubmit && onUpload) {
      // Determine approach for UI feedback
      let approach = '';
      if (hasNewFile && hasQuery) {
        approach = 'upload_with_queries';
      } else if (hasNewFile) {
        approach = 'upload_only';
      } else if (hasUploadedFile && hasQuery) {
        approach = 'existing_file_with_queries';
      }

      // Show file and query as a single bubble
      setChatMessages((prev) => [
        ...prev,
        {
          type: 'user',
          content: hasQuery ? message : '',
          fileName: uploadFile ? uploadFile.name : undefined,
          approach
        }
      ]);

      onUpload(uploadFile ? [uploadFile] : [], hasQuery ? message : undefined);
      
      // Reset form
      setUploadFile(null);
      setMessage("");
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add analysis result as a chat bubble when available
  React.useEffect(() => {
    if (analysisResult) {
      const approachMessages = {
        'upload_only': 'File uploaded and analyzed successfully!',
        'upload_with_queries': 'File uploaded and analyzed with your queries!',
        'existing_file_with_queries': 'Analysis completed for your queries!'
      };

      setChatMessages((prev) => [
        ...prev,
        { 
          type: 'response', 
          content: approachMessages[analysisResult.approach as keyof typeof approachMessages] || 'Analysis completed!',
          approach: analysisResult.approach 
        }
      ]);
    }
  }, [analysisResult]);

  // Scroll to bottom when chatMessages change
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Determine submit button state and placeholder text
  const canSubmitFile = !!uploadFile;
  const canSubmitQuery = hasUploadedFile && message.trim();
  const canSubmit = canSubmitFile || canSubmitQuery;

  const placeholderText = hasUploadedFile && !uploadFile 
    ? "Ask a new question about your uploaded data..."
    : "Upload a file and/or ask a question about your data";

  const getApproachBadge = (approach?: string) => {
    const badges = {
      'upload_only': { text: 'File Analysis', color: 'bg-blue-500' },
      'upload_with_queries': { text: 'File + Queries', color: 'bg-purple-500' },
      'existing_file_with_queries': { text: 'New Query', color: 'bg-green-500' }
    };
    
    const badge = badges[approach as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 ${badge.color} text-white rounded text-xs font-medium`}>
        {badge.text}
      </span>
    );
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 bg-[#121212] w-full min-h-screen">
      <div className="w-full max-w-5xl flex flex-col justify-center items-center min-h-[80vh] bg-[#121212]">
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">Ask Vizoraa</h1>
        <p className="text-xl text-gray-400 mb-10">Data Analysis and Data Viz Agent</p>
        
        {/* Status indicator */}
        {hasUploadedFile && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            File ready for analysis - you can ask new questions
          </div>
        )}

        {/* Chat bubbles */}
        <div className="w-full flex-1 flex flex-col gap-8 mb-10 overflow-y-auto px-2" style={{scrollBehavior: 'smooth', overscrollBehavior: 'contain'}}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}> 
              <div className={`px-6 py-5 rounded-2xl max-w-[80%] shadow-lg transition-all duration-200 flex flex-col gap-2
                ${msg.type === 'user' ? 'bg-gradient-to-br from-[#1ABC9C] to-[#16A085] text-white font-semibold' 
                  : msg.type === 'file' ? 'bg-[#232323] text-[#1ABC9C] font-semibold border border-[#1ABC9C]' 
                  : 'bg-[#191C22] text-gray-100 font-medium'}
                ${msg.type === 'user' ? 'hover:scale-105' : ''}
              `}> 
                {/* Approach badge */}
                {msg.approach && (
                  <div className="mb-2">
                    {getApproachBadge(msg.approach)}
                  </div>
                )}
                {msg.fileName && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-1 bg-[#232323] text-[#1ABC9C] rounded-lg text-sm font-semibold border border-[#1ABC9C]">
                      <Paperclip className="h-4 w-4 mr-1 inline" />
                      {msg.fileName}
                    </span>
                  </div>
                )}
                {msg.content && <span>{msg.content}</span>}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Analysis results as chat bubble (charts/personas/goals) */}
        {analysisResult && (
          <div className="w-full flex flex-col gap-8 mb-10">
            <div className="flex justify-start">
              <div className="px-6 py-5 rounded-2xl max-w-full bg-[#191C22] text-gray-100 shadow-lg w-full">
                {/* Show approach info */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-gray-400">Analysis Type:</span>
                  {getApproachBadge(analysisResult.approach)}
                </div>

                {/* Show summary and personas for full analysis */}
                {(analysisResult.approach === 'upload_only') && (
                  <>
                    <div className="mb-4 font-bold text-[#1ABC9C] text-2xl">Dataset Summary:</div>
                    <div className="mb-6 text-white text-lg bg-[#232323] rounded-xl p-4 shadow border border-[#1ABC9C]">
                      {analysisResult.summary_text}
                    </div>
                    <div className="mb-4 font-bold text-[#1ABC9C] text-2xl">Personas:</div>
                    <ul className="list-decimal ml-6 text-white space-y-3 text-lg mb-6">
                      {analysisResult.personas.map((p, i) => (
                        <li key={i}>
                          <span className="font-semibold text-[#1ABC9C]">{p.persona}</span> 
                          <span className="text-gray-400"> — {p.rationale}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="mb-4 font-bold text-[#1ABC9C] text-2xl">
                  {analysisResult.approach === 'existing_file_with_queries' ? 'Your Analysis Results:' : 'Goals & Charts:'}
                </div>
                
                {analysisResult.goals?.map((g, i) => (
                  <div key={i} className="mt-5 p-6 bg-[#232323] rounded-xl shadow-lg">
                    <div className="font-semibold text-white text-xl mb-2">{g.question}</div>
                    <div className="text-base text-gray-400 mb-3">
                      Suggested Chart: {g.suggested_chart || 'bar'}
                    </div>
                    <div className="flex justify-center items-center w-full">
                      <div className="w-full max-w-3xl mx-auto">
                        <UnifiedChartDisplay
                          result={{
                            success: true,
                            summary: g.rationale,
                            processed_data: analysisResult.charts[i]?.processed_df || [],
                            chart_data: analysisResult.charts[i]?.chart_data_plotly || analysisResult.charts[i]?.chart_data_matplotlib || null,
                            error: analysisResult.charts[i]?.preprocess_error || analysisResult.charts[i]?.chart_error_plotly || analysisResult.charts[i]?.chart_error_matplotlib || undefined,
                            data_points: analysisResult.charts[i]?.processed_df?.length || 0,
                          }}
                          onDownload={() => onDownloadCSV(analysisResult.charts[i]?.processed_df ?? [], `chart_${i + 1}_data.csv`)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat input and file upload at bottom */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mt-auto flex items-center gap-4 bg-[#181A20] rounded-xl shadow-lg px-6 py-4 border border-[#232323] sticky bottom-0 z-10" style={{boxShadow: '0 -2px 16px rgba(74, 197, 228, 0.08)'}}>
          {/* File preview before upload */}
          {uploadFile && (
            <div className="flex items-center gap-2 bg-[#232323] text-[#1ABC9C] px-3 py-2 rounded-lg border border-[#1ABC9C]">
              <Paperclip className="h-4 w-4 mr-1" />
              <span className="font-semibold text-sm">{uploadFile.name}</span>
              <button 
                type="button" 
                className="ml-2 text-white hover:text-red-500" 
                onClick={handleRemoveFile} 
                title="Remove file"
              >
                ✕
              </button>
            </div>
          )}
          
          <button
            type="button"
            className="p-2 bg-[#232323] rounded-full text-[#1ABC9C] hover:bg-[#1ABC9C]/20 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
          >
            <Paperclip className="h-6 w-6" />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".csv,.json,.xlsx,.xls"
          />
          
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholderText}
            className="flex-1 px-5 py-4 text-lg bg-[#232323] border border-gray-700 rounded-lg focus:border-[#1ABC9C] focus:ring-1 focus:ring-[#1ABC9C] focus:outline-none text-white placeholder-gray-400 shadow-sm"
          />
          
          <button
            type="submit"
            className="p-2 bg-gradient-to-br from-[#1ABC9C] to-[#16A085] hover:from-[#16A085] hover:to-[#1ABC9C] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md"
            disabled={!canSubmit}
            title={
              uploadFile && message.trim() 
                ? "Upload file and analyze with query"
                : uploadFile 
                ? "Upload and analyze file" 
                : hasUploadedFile && message.trim()
                ? "Analyze with new query"
                : "Upload a file or enter a query"
            }
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </form>
      </div>
    </main>
  );
}