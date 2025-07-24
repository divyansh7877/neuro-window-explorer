'use client';

import { useState, useEffect } from 'react';
import { WindowMetadata, NPZData } from '@/types';
import { loadNPZData, loadMetadata, computeTraceStats } from '@/lib/npz-loader';
import ScatterPlot from '@/components/ScatterPlot';
import TracePlot from '@/components/TracePlot';
import LabelFilter from '@/components/LabelFilter';

export default function Home() {
  const [metadata, setMetadata] = useState<WindowMetadata[]>([]);
  const [npzData, setNpzData] = useState<NPZData | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traceStats, setTraceStats] = useState<{ mean: number[], std: number[] }>({ mean: [], std: [] });

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // Load metadata (using a sample CSV for now)
        const metadataUrl = '/sample-metadata.csv'; // You'll need to add this file
        const metadata = await loadMetadata(metadataUrl);
        setMetadata(metadata);

        // Load NPZ data (mock for now)
        const npzUrl = '/sample-data.npz'; // You'll need to add this file
        const npz = await loadNPZData(npzUrl);
        setNpzData(npz);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter data based on selected labels
  const filteredMetadata = selectedLabels.length > 0 
    ? metadata.filter(item => selectedLabels.includes(item.label_code))
    : metadata;

  // Compute trace stats when selection changes
  useEffect(() => {
    if (selectedIds.length > 0 && npzData) {
      const windowIds = metadata.map(m => m.window_id);
      const stats = computeTraceStats(npzData.traces, selectedIds, windowIds);
      setTraceStats(stats);
    } else {
      setTraceStats({ mean: [], std: [] });
    }
  }, [selectedIds, npzData, metadata]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading neuro-explorer data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Data</div>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Make sure the data files are available in the public directory
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Neuro-Window Explorer
          </h1>
          <p className="text-gray-600">
            Interactive exploration of neural calcium traces
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Label Filter */}
          <div className="lg:col-span-1">
            <LabelFilter
              data={metadata}
              selectedLabels={selectedLabels}
              onFilterChange={setSelectedLabels}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Scatter Plot */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">PCA Embedding</h2>
              <ScatterPlot
                data={filteredMetadata}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </div>

            {/* Trace Statistics */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Trace Statistics
              </h2>
              {selectedIds.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Selected {selectedIds.length} windows
                  </p>
                  <TracePlot
                    mean={traceStats.mean}
                    std={traceStats.std}
                    title={`Mean ± Std (${selectedIds.length} windows)`}
                  />
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">
                    Select points in the scatter plot to view trace statistics
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Data Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Windows:</span>
              <span className="ml-2">{metadata.length}</span>
            </div>
            <div>
              <span className="font-medium">Filtered:</span>
              <span className="ml-2">{filteredMetadata.length}</span>
            </div>
            <div>
              <span className="font-medium">Selected:</span>
              <span className="ml-2">{selectedIds.length}</span>
            </div>
            <div>
              <span className="font-medium">Labels:</span>
              <span className="ml-2">
                {new Set(metadata.map(m => m.label_code)).size}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
