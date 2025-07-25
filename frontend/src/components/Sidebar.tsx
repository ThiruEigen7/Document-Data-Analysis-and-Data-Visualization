import React from 'react';
import { 
  Upload, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  FileText, 
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sidebarItems = [
  { id: 'upload', label: 'Upload Data', icon: Upload },
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'charts', label: 'Charts', icon: PieChart },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export default function Sidebar({ isCollapsed, onToggle, activeSection, onSectionChange }: SidebarProps) {
  return (
    <div className={`
      h-screen bg-[#1E1E1E] border-r border-gray-800 flex flex-col
      transition-all duration-300 ease-in-out relative z-10
      ${isCollapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Mobile Backdrop */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-white">DataViz Agent</h1>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          {isCollapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                relative group
                ${isActive 
                  ? 'bg-[#1ABC9C]/20 text-[#1ABC9C]' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }
              `}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1ABC9C] rounded-r" />
              )}
              
              <Icon size={20} />
              {!isCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
                              whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 flex-shrink-0">
        {!isCollapsed ? (
          <div className="text-xs text-gray-500">
            <p className="mb-1">DataViz Agent v1.0</p>
            <p>© 2024 Analytics Suite</p>
          </div>
        ) : (
          <div className="w-8 h-8 bg-[#1ABC9C]/20 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-[#1ABC9C] rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}