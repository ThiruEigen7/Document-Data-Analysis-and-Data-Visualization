import React from 'react';

export default function StyleGuide() {
  return (
    <div className="p-8 space-y-12 bg-[#121212] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">DataViz Agent Style Guide</h1>

        {/* Color Palette */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-16 bg-[#121212] border border-gray-600 rounded-lg"></div>
              <p className="text-sm text-gray-300">Primary Background</p>
              <p className="text-xs text-gray-500">#121212</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-[#1E1E1E] border border-gray-600 rounded-lg"></div>
              <p className="text-sm text-gray-300">Surface Panels</p>
              <p className="text-xs text-gray-500">#1E1E1E</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-[#1ABC9C] rounded-lg"></div>
              <p className="text-sm text-gray-300">Accent Teal</p>
              <p className="text-xs text-gray-500">#1ABC9C</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-[#2A2A2A] border border-gray-600 rounded-lg"></div>
              <p className="text-sm text-gray-300">Secondary Surface</p>
              <p className="text-xs text-gray-500">#2A2A2A</p>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Typography</h2>
          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-bold text-white">Heading 1 - Bold 2.25rem</h1>
              <p className="text-sm text-gray-500">font-bold text-4xl</p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Heading 2 - Bold 1.5rem</h2>
              <p className="text-sm text-gray-500">font-bold text-2xl</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Heading 3 - Semibold 1.125rem</h3>
              <p className="text-sm text-gray-500">font-semibold text-lg</p>
            </div>
            <div>
              <p className="text-base text-[#ECECEC]">Body text - Regular 1rem (#ECECEC)</p>
              <p className="text-sm text-gray-500">text-base text-[#ECECEC]</p>
            </div>
            <div>
              <p className="text-sm text-[#A0A0A0]">Secondary text - Regular 0.875rem (#A0A0A0)</p>
              <p className="text-sm text-gray-500">text-sm text-[#A0A0A0]</p>
            </div>
          </div>
        </section>

        {/* Components */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Component Examples</h2>
          
          {/* Buttons */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-4">
              <button className="px-4 py-2 bg-[#1ABC9C] text-white rounded-lg hover:bg-[#1ABC9C]/90 transition-colors">
                Primary Button
              </button>
              <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Secondary Button
              </button>
              <button className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:border-[#1ABC9C] hover:text-[#1ABC9C] transition-colors">
                Outline Button
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-800 hover:border-[#1ABC9C]/50 transition-all duration-200">
                <h4 className="text-lg font-semibold text-white mb-2">Chart Card</h4>
                <p className="text-gray-400">Interactive chart container with hover effects</p>
              </div>
              <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-800">
                <h4 className="text-lg font-semibold text-white mb-2">Data Card</h4>
                <p className="text-gray-400">Static data display card</p>
              </div>
            </div>
          </div>

          {/* Form Elements */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Form Elements</h3>
            <div className="space-y-4 max-w-md">
              <input
                type="text"
                placeholder="Input field"
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#1ABC9C] transition-colors"
              />
              <select className="w-full px-3 py-2 bg-[#2A2A2A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#1ABC9C] transition-colors">
                <option>Select option</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </div>
        </section>

        {/* States */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Interactive States</h2>
          <div className="space-y-4">
            <div className="p-4 bg-[#1E1E1E] border border-gray-800 rounded-lg">
              <p className="text-white">Default State</p>
            </div>
            <div className="p-4 bg-[#1E1E1E] border border-[#1ABC9C]/50 rounded-lg transform -translate-y-1 shadow-xl shadow-[#1ABC9C]/10">
              <p className="text-white">Hover State (elevated with teal glow)</p>
            </div>
            <div className="p-4 bg-[#1E1E1E] border border-[#1ABC9C] rounded-lg">
              <p className="text-white">Active/Focus State</p>
            </div>
          </div>
        </section>

        {/* Usage Notes */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Usage Notes</h2>
          <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-800">
            <ul className="space-y-2 text-gray-300">
              <li>• Use teal (#1ABC9C) sparingly for accents and interactive elements</li>
              <li>• Maintain 4.5:1 contrast ratio for accessibility</li>
              <li>• Apply subtle hover effects with 200ms transitions</li>
              <li>• Use elevated shadows with teal tint for important interactions</li>
              <li>• Keep surfaces on #1E1E1E with #121212 background</li>
              <li>• Use Inter font family with appropriate weights</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}