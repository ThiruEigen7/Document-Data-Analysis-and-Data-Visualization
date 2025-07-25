import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Eye, Loader2 } from 'lucide-react';
import { Dataset } from '../types';

interface FileUploaderProps {
  datasets: Dataset[];
  uploadingFiles: string[];
  onUpload: (files: File[]) => void;
  onRemove: (id: string) => void;
  onPreview: (dataset: Dataset) => void;
}

export default function FileUploader({ datasets, uploadingFiles, onUpload, onRemove, onPreview }: FileUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive
            ? 'border-[#1ABC9C] bg-[#1ABC9C]/10'
            : 'border-gray-600 hover:border-[#1ABC9C] hover:bg-[#1ABC9C]/5'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-semibold text-white mb-2">
          {isDragActive ? 'Drop files here' : 'Upload your dataset'}
        </h3>
        <p className="text-gray-400 mb-4">
          Drag & drop your CSV, JSON, or Excel files here, or click to browse
        </p>
        <button className="px-4 py-2 bg-[#1ABC9C] text-white rounded-lg hover:bg-[#1ABC9C]/90 transition-colors">
          Choose Files
        </button>
      </div>

      {/* Uploaded Files List */}
      {(datasets.length > 0 || uploadingFiles.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Uploaded Datasets</h3>
          <div className="space-y-2">
            {/* Uploading Files */}
            {uploadingFiles.map((fileName) => (
              <div
                key={`uploading-${fileName}`}
                className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-gray-800
                         animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <File className="text-gray-500" size={20} />
                    <Loader2 className="absolute -top-1 -right-1 text-[#1ABC9C] animate-spin" size={12} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{fileName}</p>
                    <p className="text-gray-400 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="animate-spin" size={12} />
                        Processing...
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1ABC9C] rounded-full animate-pulse" 
                         style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Uploaded Files */}
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-gray-800
                         hover:border-gray-700 transition-all duration-200 animate-fadeIn"
              >
                <div className="flex items-center gap-3">
                  <File className="text-[#1ABC9C]" size={20} />
                  <div>
                    <p className="text-white font-medium">{dataset.name}</p>
                    <p className="text-gray-400 text-sm">
                      {dataset.size} • {dataset.type} • {dataset.uploadedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPreview(dataset)}
                    className="p-2 text-gray-400 hover:text-[#1ABC9C] transition-colors"
                    title="Preview"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => onRemove(dataset.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}