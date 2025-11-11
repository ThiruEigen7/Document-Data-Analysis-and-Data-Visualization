// File: src/components/MainContent.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, X } from 'lucide-react'; 
import UnifiedChartDisplay from './UnifiedChartDisplay';

// Define types locally (ensure these match your App.tsx types)
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
  columns?: string[]; // Expect columns from analysis result
}

interface MainContentProps {
  analysisResult: AnalysisResult | null;
  onDownloadCSV: (data: any[], filename?: string) => void;
  showWelcome: boolean;
  onUpload?: (files: File[], query?: string) => void;
  hasUploadedFile?: boolean; // Indicates if there's an *active* file
  currentFileColumns: string[]; 
  currentFileName: string | null; // Name of the *active* file
  uploadedFileFromInput: File | null; // The temporary file selected in the input field
  setUploadedFileFromInput: React.Dispatch<React.SetStateAction<File | null>>; // Setter for that temporary file
  setCurrentFileColumns: (columns: string[]) => void; // <-- Add this
  setCurrentFileName: (name: string) => void; // <-- Add this
}

export default function MainContent({ 
  analysisResult, 
  onDownloadCSV, 
  showWelcome, 
  onUpload,
  hasUploadedFile = false, // True if a file has been processed and is active
  currentFileColumns, 
  currentFileName, // The name of the currently active file (from App.tsx)
  uploadedFileFromInput, // The *temporary* file selected in this input
  setUploadedFileFromInput, // Setter for the temporary file
  setCurrentFileColumns, // <-- Add this
  setCurrentFileName // <-- Add this
}: MainContentProps) {
  const [message, setMessage] = useState("");
  // Removed internal `uploadFile` state; now using `uploadedFileFromInput` prop
  const [chatMessages, setChatMessages] = useState<Array<{ 
    type: 'user' | 'file' | 'response', 
    content: string, 
    fileName?: string,
    approach?: string,
    tempId?: string,
    analysisResult?: AnalysisResult 
  }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null); 

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  }, [chatMessages, message, currentFileColumns, uploadedFileFromInput]); // Added uploadedFileFromInput

  const lastProcessedResultIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (analysisResult && analysisResult.file_id !== lastProcessedResultIdRef.current) {
      lastProcessedResultIdRef.current = analysisResult.file_id || null;

      const approachMessages = {
        'agent_upload_no_instruction': 'File uploaded and analyzed successfully!',
        'agent_upload_with_instruction': 'File uploaded and analyzed with your queries!',
        'agent_query_with_instruction': 'Analysis completed for your queries!'
      };

      setChatMessages((prev) => {
        const updated = [...prev];
        const lastUserMsgIndex = updated.findLastIndex(msg => msg.type === 'user');
        if (lastUserMsgIndex !== -1 && updated[lastUserMsgIndex].tempId) { 
          updated[lastUserMsgIndex] = {
            ...updated[lastUserMsgIndex],
            approach: analysisResult.approach 
          };
        }
        
        return [
          ...updated,
          { 
            type: 'response', 
            content: approachMessages[analysisResult.approach as keyof typeof approachMessages] || 'Analysis completed!',
            approach: analysisResult.approach,
            analysisResult: analysisResult 
          }
        ];
      });
    }
  }, [analysisResult]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine if a new file is being submitted (from the input field)
    const isNewFileInInput = !!uploadedFileFromInput; 
    const hasQuery = message.trim().length > 0;
    
    // Condition to enable submit button:
    // 1. A new file is in the input (with or without a query)
    // 2. No new file in input, but an active file exists AND there's a query
    const canSubmit = isNewFileInInput || (hasUploadedFile && hasQuery);

    if (!canSubmit) {
      console.log('Cannot submit - conditions not met');
      return;
    }

    if (onUpload) {
      const tempId = Date.now().toString();
      
      let preliminaryApproach = '';
      if (isNewFileInInput && hasQuery) {
        preliminaryApproach = 'upload_with_queries';
      } else if (isNewFileInInput) {
        preliminaryApproach = 'upload_only';
      } else if (hasUploadedFile && hasQuery) {
        preliminaryApproach = 'existing_file_with_queries';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          type: 'user',
          content: hasQuery ? message : '',
          fileName: isNewFileInInput ? uploadedFileFromInput!.name : (currentFileName || undefined), 
          approach: preliminaryApproach,
          tempId 
        }
      ]);

      // Call onUpload with either the new file from input or an empty array if only querying existing
      onUpload(isNewFileInInput ? [uploadedFileFromInput!] : [], hasQuery ? message : undefined);
      
      setUploadedFileFromInput(null); // Clear the temporary file in the input field via prop setter
      setMessage("");
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFile = e.target.files[0];
      setUploadedFileFromInput(newFile);
      // Immediately request columns from backend
      const formData = new FormData();
      formData.append('file', newFile);
      fetch("http://127.0.0.1:8000/extract_columns/", {
        method: "POST",
        body: formData,
      })
      .then(res => res.json())
      .then(data => {
        if (data.columns) {
          setCurrentFileColumns(data.columns); // Use prop directly
          setCurrentFileName(newFile.name);    // Use prop directly
        }
      });
    }
  };

  const handleRemoveFile = () => {
    setUploadedFileFromInput(null); // Clear via prop setter
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isNewFileInInput = !!uploadedFileFromInput;
  const hasQuery = message.trim().length > 0;
  const canSubmit = isNewFileInInput || (hasUploadedFile && hasQuery);

  const placeholderText = hasUploadedFile && !isNewFileInInput 
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

  const getButtonTitle = () => {
    if (isNewFileInInput && hasQuery) {
      return "Upload file and analyze with query";
    } else if (isNewFileInInput) {
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
    <main className="flex-1 flex flex-col relative w-full overflow-hidden bg-[#121212]">
      {showWelcome && (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-16">
          <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">Ask Vizoraa</h1>
          <p className="text-xl text-gray-400 mb-10">Data Analysis and Data Viz Agent</p>
          <div className="text-gray-500 text-lg">
            Start by uploading a dataset or asking a question about your data.
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 ${showWelcome ? 'hidden' : ''}`} style={{scrollBehavior: 'smooth', overscrollBehavior: 'contain'}}>
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}> 
              <div className={`px-4 py-3 rounded-xl max-w-[90%] md:max-w-[75%] shadow-md transition-all duration-200 
                ${msg.type === 'user' ? 'bg-[#1ABC9C] text-white' 
                  : 'bg-[#191C22] text-gray-100'}
              `}> 
                {/* Display file name for user messages, but only if it's the *initial* upload context or a new file */}
                {msg.type === 'user' && msg.fileName && (
                  <div className="flex items-center gap-2 mb-1 text-sm bg-gray-700/50 rounded px-2 py-1 max-w-fit">
                    <Paperclip className="h-4 w-4" />
                    <span className="font-medium truncate">{msg.fileName}</span>
                  </div>
                )}
                {msg.content && <div className="text-base">{msg.content}</div>}

                {msg.type === 'response' && msg.analysisResult && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm text-gray-400">Analysis Type:</span>
                      {getApproachBadge(msg.analysisResult.approach)}
                    </div>

                    {(msg.analysisResult.approach === 'agent_upload_no_instruction' || msg.analysisResult.approach === 'upload_only') && (
                      <>
                        <div className="mb-2 font-bold text-[#1ABC9C] text-lg">Dataset Summary:</div>
                        <div className="mb-4 text-white text-base bg-[#232323] rounded-lg p-3 shadow border border-[#1ABC9C]/50">
                          {msg.analysisResult.summary_text}
                        </div>
                        <div className="mb-2 font-bold text-[#1ABC9C] text-lg">Personas:</div>
                        <ul className="list-decimal ml-5 text-white space-y-2 text-base mb-4">
                          {msg.analysisResult.personas.map((p, i) => (
                            <li key={i}>
                              <span className="font-semibold text-[#1ABC9C]">{p.persona}</span> 
                              <span className="text-gray-400"> — {p.rationale}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <div className="mb-2 font-bold text-[#1ABC9C] text-lg">
                      {msg.analysisResult.approach === 'agent_query_with_instruction' || msg.analysisResult.approach === 'existing_file_with_queries' 
                        ? 'Your Analysis Results:' 
                        : 'Goals & Charts:'}
                    </div>
                    
                    {msg.analysisResult.goals?.map((g, i) => (
                      <div key={i} className="mt-4 p-4 bg-[#232323] rounded-lg shadow-lg">
                        <div className="font-semibold text-white text-md mb-1">{g.question}</div>
                        <div className="text-sm text-gray-400 mb-2">
                          Suggested Chart: {g.suggested_chart || 'bar'}
                        </div>
                        <div className="flex justify-center items-center w-full">
                          <div className="w-full">
                            <UnifiedChartDisplay
                              result={{
                                success: true,
                                summary: g.rationale,
                                processed_data: msg.analysisResult?.charts[i]?.processed_df || [],
                                chart_data: msg.analysisResult?.charts[i]?.chart_data_plotly || msg.analysisResult?.charts[i]?.chart_data_matplotlib || null,
                                error: msg.analysisResult?.charts[i]?.preprocess_error || msg.analysisResult?.charts[i]?.chart_error_plotly || msg.analysisResult?.charts[i]?.chart_error_matplotlib || undefined,
                                data_points: msg.analysisResult?.charts[i]?.processed_df?.length || 0,
                              }}
                              onDownload={() => onDownloadCSV(msg.analysisResult?.charts[i]?.processed_df ?? [], `chart_${i + 1}_data.csv`)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input box section */}
      <div className="sticky bottom-0 left-0 w-full flex justify-center pb-8 pt-4 bg-gradient-to-t from-[#121212] via-[#121212]/90 to-transparent z-10">
        <div className="w-full max-w-3xl px-4"> 
          {/* Status/Column indicator - Only show if an active file and columns are present */}
          {(hasUploadedFile && currentFileName && currentFileColumns.length > 0) && (
            <div className="mb-4 bg-[#191C22] p-3 rounded-lg border border-gray-700 shadow-md">
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <span className="mr-2 inline-block w-2 h-2 rounded-full bg-[#1ABC9C]"></span>
                <span className="text-[#1ABC9C]">{currentFileName}</span> columns ({currentFileColumns.length}):
              </h3>
              <div className="flex flex-wrap gap-2 text-sm text-gray-400 max-h-24 overflow-y-auto">
                {currentFileColumns.map((col, index) => (
                  <span key={index} className="bg-gray-700/50 px-2 py-1 rounded-md whitespace-nowrap">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Status indicator - show if an active file but no columns (e.g., initial upload, processing) */}
          {(hasUploadedFile && currentFileName && currentFileColumns.length === 0) && (
            <div className="mb-4 flex items-center gap-3 px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-300 font-medium">
                File <span className="text-white font-semibold">{currentFileName}</span> is active for analysis.
              </span>
            </div>
          )}


          <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-[#181A20] rounded-xl shadow-lg border border-[#232323] overflow-hidden" style={{boxShadow: '0 2px 16px rgba(0, 0, 0, 0.2)'}}>
            
            {/* Displaying *new* file to be uploaded from input */}
            {uploadedFileFromInput && (
              <div className="absolute bottom-full left-0 mb-2 ml-2 flex items-center gap-1 bg-[#232323] text-[#1ABC9C] px-2 py-1 rounded-lg border border-[#1ABC9C] text-sm max-w-[calc(100%-40px)]">
                <Paperclip className="h-4 w-4" />
                <span className="font-semibold truncate">{uploadedFileFromInput.name}</span>
                <button 
                  type="button" 
                  className="ml-1 text-white hover:text-red-500" 
                  onClick={handleRemoveFile} 
                  title="Remove file"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".csv,.json,.xlsx,.xls"
            />
            
            <button
              type="button"
              className="p-3 text-gray-400 hover:text-white transition-colors flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            
            <textarea
              ref={textAreaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholderText}
              className="flex-1 w-full p-3 resize-none overflow-y-hidden min-h-[50px] max-h-[200px] text-base bg-transparent border-none focus:ring-0 focus:outline-none text-white placeholder-gray-500"
              rows={1}
            />
            
            <button
              type="submit"
              className={`p-3 bg-[#1ABC9C] text-white rounded-lg m-2 flex items-center justify-center transition-all duration-200 flex-shrink-0
                ${!canSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:bg-[#16A085]'}`}
              disabled={!canSubmit}
              title={getButtonTitle()}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </form>
          
          {/* Debug info - REMOVE IN PRODUCTION */}
          <div className="mt-2 text-xs text-gray-600 text-center">
            Debug: hasFile={hasUploadedFile.toString()} | isNewFileInInput={isNewFileInInput.toString()} | query={hasQuery.toString()} | canSubmit={canSubmit.toString()}
          </div>
        </div>
      </div>
    </main>
  );
}