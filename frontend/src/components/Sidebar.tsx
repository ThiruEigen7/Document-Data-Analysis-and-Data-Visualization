import React from 'react';
import {
  Search,
  BarChart3,
  Upload,
  PieChart,
  TrendingUp,
  FileText,
  Home
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: Date;
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  documents: Document[];
}

const sidebarItems = [
  {
    id: "overview",
    label: "Overview",
    icon: Home,
  },
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
  },
  {
    id: "analyze",
    label: "Analyze",
    icon: Search,
  },
  {
    id: "visualize",
    label: "Visualize",
    icon: BarChart3,
  }
];

export default function Sidebar({ activeSection, onSectionChange, documents }: SidebarProps) {
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('text')) return '📝';
    if (type.includes('csv')) return '📊';
    if (type.includes('json')) return '⚙️';
    return '📎';
  };

  return (
    <aside className="w-64 border-r border-gray-800 bg-[#1E1E1E] flex flex-col">
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

      {/* Documents Section */}
      <div className="p-4 flex-1">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Documents</h3>
        <div className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-xs text-gray-500">No documents uploaded yet</p>
          ) : (
            documents.slice(-3).map((doc) => (
              <div
                key={doc.id}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm text-white mb-1">
                  <span className="text-xs">{getFileIcon(doc.type)}</span>
                  <span className="truncate">{doc.name}</span>
                </div>
                <div className="text-xs text-gray-400">{doc.size}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          <p className="mb-1">Vizoraa v1.0</p>
          <p>© 2024 Analytics Suite</p>
        </div>
      </div>
    </aside>
  );
}