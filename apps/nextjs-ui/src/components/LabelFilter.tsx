'use client';

import { useState, useEffect } from 'react';
import { WindowMetadata } from '@/types';

export type ColorMode = 'label' | 'cluster';

interface LabelFilterProps {
  data: WindowMetadata[];
  onFilterChange: (selected: number[]) => void;
  selected: number[];
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  labelMap?: Record<string, string>;
  clusterMap?: Record<string, string>;
}

export default function LabelFilter({ 
  data, 
  onFilterChange, 
  selected, 
  colorMode, 
  onColorModeChange,
  labelMap = {},
  clusterMap = {}
}: LabelFilterProps) {
  const [counts, setCounts] = useState<Map<number, number>>(new Map());

  const activeMap = colorMode === 'label' ? labelMap : clusterMap;
  const dataKey = colorMode === 'label' ? 'label_code' : 'cluster_code';

  useEffect(() => {
    const newCounts = new Map<number, number>();
    data.forEach(item => {
      const key = item[dataKey];
      if (key !== undefined) {
        newCounts.set(key, (newCounts.get(key) || 0) + 1);
      }
    });
    setCounts(newCounts);
  }, [data, dataKey]);

  const handleToggle = (code: number) => {
    const newSelected = selected.includes(code)
      ? selected.filter(l => l !== code)
      : [...selected, code];
    onFilterChange(newSelected);
  };

  const handleSelectAll = () => {
    const allCodes = Array.from(counts.keys());
    onFilterChange(allCodes);
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  const sortedItems = Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Color By</h3>
        <div className="flex space-x-2 rounded-lg bg-gray-700 p-1">
          <button 
            onClick={() => onColorModeChange('label')} 
            className={`w-full py-1 text-sm font-medium rounded-md transition-colors ${colorMode === 'label' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
            Labels
          </button>
          <button 
            onClick={() => onColorModeChange('cluster')} 
            className={`w-full py-1 text-sm font-medium rounded-md transition-colors ${colorMode === 'cluster' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
            Clusters
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Filter by {colorMode === 'label' ? 'Label' : 'Cluster'}</h3>
        <div className="space-x-2">
          <button onClick={handleSelectAll} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">All</button>
          <button onClick={handleClearAll} className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">Clear</button>
        </div>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {sortedItems.map(([code, count]) => (
          <label key={code} className="flex items-center space-x-3 cursor-pointer p-1 rounded-md hover:bg-gray-700">
            <input
              type="checkbox"
              checked={selected.includes(code)}
              onChange={() => handleToggle(code)}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
            />
            <span className="flex-1 text-gray-200">
              {activeMap[code] || `${colorMode === 'label' ? 'Label' : 'Cluster'} ${code}`}
            </span>
            <span className="text-sm text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full">
              {count}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}