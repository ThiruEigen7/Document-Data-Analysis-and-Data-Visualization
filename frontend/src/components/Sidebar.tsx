import React from 'react';
import {
  Search,
  BarChart3,
  Upload,
  PieChart,
  TrendingUp,
  FileText,
  Home,
  X // Import X icon for removing documents
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: Date;
  // Make sure this interface matches the one in App.tsx
  columns?: string[]; 
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  documents: Document[];
  onRemoveDocument: (id: string) => void; // New prop
  onPreviewDocument: (document: Document) => void; // New prop
  selectedDocumentId?: string | null; // New prop for highlighting the selected document
}

const sidebarItems = [
  {
    id: "chat", // Renamed 'overview' to 'chat' if chat is the main interaction
    label: "Chat",
    icon: Home, // Use Home for chat, or a specific chat icon if you have one
  },
  {
    id: "documents", // Added a 'Documents' section for managing all documents
    label: "Documents",
    icon: FileText,
  },
  // You can add 'analyze' and 'visualize' later if they lead to distinct UIs
  // For now, we'll focus on chat + document list
];

export default function Sidebar({ activeSection, onSectionChange, documents, onRemoveDocument, onPreviewDocument, selectedDocumentId }: SidebarProps) {
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('text')) return '📝';
    if (type.includes('csv') || type.includes('excel')) return '📊'; // Added excel
    if (type.includes('json')) return '⚙️';
    return '📎';
  };

  return (
    <aside className="w-64 border-r border-gray-800 bg-[#1E1E1E] flex flex-col h-full"> {/* h-full to take full height */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Menu</h2>
        <nav className="space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                  isActive
                    ? "bg-[#1ABC9C]/20 text-[#1ABC9C]"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Recent Documents Section */}
      <div className="p-4 flex-1 overflow-y-auto"> {/* Added overflow-y-auto */}
        <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Documents</h3>
        <div className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-xs text-gray-500">No documents uploaded yet</p>
          ) : (
            documents.map((doc) => { // Map all documents, not just slice(-3)
                const isSelected = selectedDocumentId === doc.id;
                return (
                    <div
                        key={doc.id}
                        className={`group p-2 rounded-lg relative transition-colors border ${
                            isSelected ? "bg-[#1ABC9C]/20 border-[#1ABC9C]" : "bg-gray-800/50 border-transparent hover:bg-gray-800"
                        }`}
                    >
                        <button
                            onClick={() => onPreviewDocument(doc)}
                            className="w-full text-left flex-grow focus:outline-none"
                        >
                            <div className="flex items-center gap-2 text-sm text-white mb-1">
                                <span className="text-xs">{getFileIcon(doc.type)}</span>
                                <span className="truncate">{doc.name}</span>
                            </div>
                            <div className="text-xs text-gray-400">{doc.size}</div>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent onPreviewDocument from firing
                                onRemoveDocument(doc.id);
                            }}
                            className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Remove document"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                );
            })
          )}
        </div>
      </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-300 justify-center">
    {["bar","pie","scatter","histogram","line","box","violin","area","heatmap","funnel","treemap","density"].map(type => (
      <button
        key={type}
        onClick={() => setMessage(`Show ${type} chart`)}
        className="px-2 py-1 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
      >
        {type}
      </button>
    ))}
  </div>


      {/* Footer */}
      <div className="p-4 border-t border-gray-800 flex-shrink-0"> {/* flex-shrink-0 to keep it at bottom */}
        <div className="text-xs text-gray-500">
          <p className="mb-1">Vizoraa v1.0</p>
          <p>© 2025 Analytics Suite</p>
        </div>
      </div>
    </aside>
  );
}