import React from 'react';
import { Moon, Sun, Upload } from 'lucide-react';

interface HeaderProps {
  onUploadClick: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
}

export default function Header({ onUploadClick, onThemeToggle, isDark }: HeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-[#1E1E1E] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-[#1ABC9C] flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-white"></div>
            </div>
            <span className="text-xl font-semibold text-white">Vizoraa</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            Home
          </a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            Explore
          </a>
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            About
          </a>
          <button 
            onClick={onUploadClick}
            className="bg-[#1ABC9C] hover:bg-[#1ABC9C]/90 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Upload size={16} />
            Upload
          </button>
        </nav>

        <div className="flex items-center gap-4">
          {/* Mobile Upload Button */}
          <button 
            onClick={onUploadClick}
            className="md:hidden bg-[#1ABC9C] hover:bg-[#1ABC9C]/90 text-white p-2 rounded-lg transition-colors"
          >
            <Upload size={16} />
          </button>
          
          <button
            onClick={onThemeToggle}
            className="h-8 w-8 p-0 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </button>
        </div>
      </div>
    </header>
  );
}