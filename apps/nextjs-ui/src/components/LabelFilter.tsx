'use client';

import { useState, useEffect } from 'react';
import { WindowMetadata } from '@/types';

interface LabelFilterProps {
  data: WindowMetadata[];
  onFilterChange: (selectedLabels: number[]) => void;
  selectedLabels: number[];
}

export default function LabelFilter({ data, onFilterChange, selectedLabels }: LabelFilterProps) {
  const [labelCounts, setLabelCounts] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    // Count occurrences of each label
    const counts = new Map<number, number>();
    data.forEach(item => {
      counts.set(item.label_code, (counts.get(item.label_code) || 0) + 1);
    });
    setLabelCounts(counts);
  }, [data]);

  const handleLabelToggle = (labelCode: number) => {
    const newSelected = selectedLabels.includes(labelCode)
      ? selectedLabels.filter(l => l !== labelCode)
      : [...selectedLabels, labelCode];
    onFilterChange(newSelected);
  };

  const handleSelectAll = () => {
    const allLabels = Array.from(labelCounts.keys());
    onFilterChange(allLabels);
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  const sortedLabels = Array.from(labelCounts.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Filter by Labels</h3>
        <div className="space-x-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {sortedLabels.map(([labelCode, count]) => (
          <label key={labelCode} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedLabels.includes(labelCode)}
              onChange={() => handleLabelToggle(labelCode)}
              className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
            />
            <span className="flex-1 text-gray-200">
              Label {labelCode}
            </span>
            <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">
              {count}
            </span>
          </label>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          Showing {data.length} windows
          {selectedLabels.length > 0 && selectedLabels.length < sortedLabels.length && (
            <span className="text-blue-400">
              {' '}(filtered from {Array.from(labelCounts.values()).reduce((a, b) => a + b, 0)})
            </span>
          )}
        </p>
      </div>
    </div>
  );
} 