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
  hasUploadedFile?: boolean;
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
    approach?: string,
    tempId?: string
  }>>([]);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Debug: Log when hasUploadedFile changes
  React.useEffect(() => {
    console.log('MainContent hasUploadedFile changed to:', hasUploadedFile);
  }, [hasUploadedFile]);

  // Submit both file and query together
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasNewFile = !!uploadFile;
    const hasQuery = message.trim().length > 0;
    
    // FIXED: Allow submission if either:
    // 1. New file is attached (with or without query)
    // 2. Already uploaded file exists AND user typed a query
    const canSubmit = hasNewFile || (hasUploadedFile && hasQuery);

    console.log('Submit Debug:', { hasNewFile, hasQuery, hasUploadedFile, canSubmit });

    if (!canSubmit) {
      console.log('Cannot submit - conditions not met');
      return;
    }

    if (onUpload) {
      const tempId = Date.now().toString();
      
      let preliminaryApproach = '';
      if (hasNewFile && hasQuery) {
        preliminaryApproach = 'upload_with_queries';
      } else if (hasNewFile) {
        preliminaryApproach = 'upload_only';
      } else if (hasUploadedFile && hasQuery) {
        preliminaryApproach = 'existing_file_with_queries';
      }

      console.log('Submitting with approach:', preliminaryApproach);

      setChatMessages((prev) => [
        ...prev,
        {
          type: 'user',
          content: hasQuery ? message : '',
          fileName: uploadFile ? uploadFile.name : undefined,
          approach: preliminaryApproach,
          tempId
        }
      ]);

      onUpload(uploadFile ? [uploadFile] : [], hasQuery ? message : undefined);
      
      setUploadFile(null);
      setMessage("");
      
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

  const lastProcessedResultRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (analysisResult && analysisResult.file_id !== lastProcessedResultRef.current) {
      lastProcessedResultRef.current = analysisResult.file_id || null;

      const approachMessages = {
        'agent_upload_no_instruction': 'File uploaded and analyzed successfully!',
        'agent_upload_with_instruction': 'File uploaded and analyzed with your queries!',
        'agent_query_with_instruction': 'Analysis completed for your queries!'
      };

      setChatMessages((prev) => {
        const updated = [...prev];
        const lastUserMsgIndex = updated.findLastIndex(msg => msg.type === 'user');
        
        if (lastUserMsgIndex !== -1 && analysisResult.approach) {
          updated[lastUserMsgIndex] = {
            ...updated[lastUserMsgIndex],
            approach: analysisResult.approach
          };
        }
        
        return updated;
      });

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

  const chatEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // FIXED: Proper submit button state
  const hasNewFile = !!uploadFile;
  const hasQuery = message.trim().length > 0;
  const canSubmit = hasNewFile || (hasUploadedFile && hasQuery);

  const placeholderText = hasUploadedFile && !uploadFile 
    ? "Ask a new question about your uploaded data..."
    : "Upload a file and/or ask a question about your data";

  const getApproachBadge = (approach?: string) => {
    const badges = {
      'upload_only': { text: 'File Analysis', color: 'bg-blue-500' },
      'agent_upload_no_instruction': { text: 'File Analysis', color: 'bg-blue-500' },
      'upload_with_queries': { text: 'File + Queries', color: 'bg-purple-500' },
      'agent_upload_with_instruction': { text: 'File + Queries', color: 'bg-purple-500' },
      'existing_file_with_queries': { text: 'New Query', color: 'bg-green-500' },
      'agent_query_with_instruction': { text: 'New Query', color: 'bg-green-500' }
    };
    
    const badge = badges[approach as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 ${badge.color} text-white rounded text-xs font-medium`}>
        {badge.text}
      </span>
    );
  };

  // FIXED: Better button title based on actual state
  const getButtonTitle = () => {
    if (hasNewFile && hasQuery) {
      return "Upload file and analyze with query";
    } else if (hasNewFile) {
      return "Upload and analyze file";
    } else if (hasUploadedFile && hasQuery) {
      return "Analyze with new query";
    } else if (hasUploadedFile) {
      return "Enter a query to analyze";
    } else {
      return "Upload a file first";
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 bg-[#121212] w-full min-h-screen">
      <div className="w-full max-w-5xl flex flex-col justify-center items-center min-h-[80vh] bg-[#121212]">
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">Ask Vizoraa</h1>
        <p className="text-xl text-gray-400 mb-10">Data Analysis and Data Viz Agent</p>
        
        {/* Status indicator - ENHANCED */}
        {hasUploadedFile && (
          <div className="mb-4 flex items-center gap-3 px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-300 font-medium">
              File ready for analysis - you can ask new questions without uploading again!
            </span>
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

        {/* Analysis results as chat bubble */}
        {analysisResult && (
          <div className="w-full flex flex-col gap-8 mb-10">
            <div className="flex justify-start">
              <div className="px-6 py-5 rounded-2xl max-w-full bg-[#191C22] text-gray-100 shadow-lg w-full">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-gray-400">Analysis Type:</span>
                  {getApproachBadge(analysisResult.approach)}
                </div>

                {(analysisResult.approach === 'agent_upload_no_instruction' || analysisResult.approach === 'upload_only') && (
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
                  {analysisResult.approach === 'agent_query_with_instruction' || analysisResult.approach === 'existing_file_with_queries' 
                    ? 'Your Analysis Results:' 
                    : 'Goals & Charts:'}
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

        {/* Chat input - FIXED */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mt-auto flex items-center gap-4 bg-[#181A20] rounded-xl shadow-lg px-6 py-4 border border-[#232323] sticky bottom-0 z-10" style={{boxShadow: '0 -2px 16px rgba(74, 197, 228, 0.08)'}}>
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
            className={`p-2 bg-gradient-to-br from-[#1ABC9C] to-[#16A085] hover:from-[#16A085] hover:to-[#1ABC9C] text-white rounded-lg transition-all duration-200 flex items-center justify-center shadow-md
              ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            disabled={!canSubmit}
            title={getButtonTitle()}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </form>
        
        {/* Debug info - REMOVE IN PRODUCTION */}
        <div className="mt-2 text-xs text-gray-500">
          Debug: hasFile={hasUploadedFile.toString()} | newFile={hasNewFile.toString()} | query={hasQuery.toString()} | canSubmit={canSubmit.toString()}
        </div>
      </div>
    </main>
  );
}