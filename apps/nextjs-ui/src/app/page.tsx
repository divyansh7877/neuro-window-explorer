'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { WindowMetadata, NPZData } from '@/types';
import { loadNPZData, loadMetadata, computeTraceStats } from '@/lib/npz-loader';
import ScatterPlot from '@/components/ScatterPlot';
import TracePlot from '@/components/TracePlot';
import LabelFilter from '@/components/LabelFilter';

// List of available dataset folders (update as needed)
const DATASET_FOLDERS = [
  { label: 'v2025_07_24f', folder: '/v2025_07_24f/', csv: '/v2025_07_24f/metadata.parquet' },
  // Add more folders as needed
];

function HomeContent() {
  console.log('[Neuro-Explorer] Home component mounted');
  const [metadata, setMetadata] = useState<WindowMetadata[]>([]);
  const [npzData, setNpzData] = useState<NPZData | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traceStats, setTraceStats] = useState<{ mean: number[], std: number[] }>({ mean: [], std: [] });
  const [datasetIdx, setDatasetIdx] = useState(0);

  console.log('[Neuro-Explorer] Component render - datasetIdx:', datasetIdx, 'isLoading:', isLoading);

  // Load data when dataset changes
  useEffect(() => {
    console.log('[Neuro-Explorer] useEffect for data loading triggered');
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedIds([]);
        setSelectedLabels([]);

        const { folder, csv } = DATASET_FOLDERS[datasetIdx];
        console.log('[Neuro-Explorer] About to fetch manifest:', `${folder}manifest.json`);
        // Load metadata
        const metadata = await loadMetadata(csv);
        console.log('[Neuro-Explorer] Loaded metadata:', metadata && metadata.length, metadata?.slice?.(0, 5));
        setMetadata(metadata);
        // Select all labels by default
        const allLabels = Array.from(new Set(metadata.map(m => m.label_code)));
        setSelectedLabels(allLabels);
        // Load NPY data from folder
        const npzObj = await loadNPZData(folder);
        console.log('[Neuro-Explorer] Loaded NPZ data:', npzObj);
        setNpzData(npzObj);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('[Neuro-Explorer] Error loading data:', err);
      } finally {
        setIsLoading(false);
        console.log('[Neuro-Explorer] Loading complete. isLoading:', false);
      }
    }
    loadData();
  }, [datasetIdx]);

  // Test useEffect to see if useEffect works at all
  useEffect(() => {
    console.log('[Neuro-Explorer] Test useEffect with no dependencies - component mounted/hydrated');
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

  console.log('[Neuro-Explorer] About to return JSX - isLoading:', isLoading, 'error:', error);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Neuro-Window Explorer
          </h1>
          <p className="text-gray-300">
            Interactive exploration of neural traces and their embeddings
          </p>
          <div className="mt-4">
            <label className="text-gray-400 mr-2 font-medium">Dataset version:</label>
            <select
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1"
              value={datasetIdx}
              onChange={e => setDatasetIdx(Number(e.target.value))}
            >
              {DATASET_FOLDERS.map((ds, idx) => (
                <option value={idx} key={ds.label}>{ds.label}</option>
              ))}
            </select>
          </div>
        </header>

        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-lg text-gray-100">Loading neuro-explorer data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-xl mb-4">⚠️ Error Loading Data</div>
              <p className="text-gray-300">{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Make sure the data files are available in the public directory
              </p>
            </div>
          </div>
        ) : (
        <>
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
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-white">PCA Embedding</h2>
              <ScatterPlot
                data={filteredMetadata}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                pca_xy={npzData?.pca_xy}
              />
            </div>

            {/* Trace Statistics */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-white">
                Trace Statistics
              </h2>
              {selectedIds.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-300 mb-4">
                    Selected {selectedIds.length} windows
                  </p>
                  <TracePlot
                    mean={traceStats.mean}
                    std={traceStats.std}
                    title={`Mean ± Std (${selectedIds.length} windows)`}
                  />
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gray-700 rounded-lg">
                  <p className="text-gray-400">
                    Select points in the scatter plot to view trace statistics
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Info */}
        <div className="mt-8 bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-white">Data Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-300">Total Windows:</span>
              <span className="ml-2 text-white">{metadata.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-300">Filtered:</span>
              <span className="ml-2 text-white">{filteredMetadata.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-300">Selected:</span>
              <span className="ml-2 text-white">{selectedIds.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-300">Labels:</span>
              <span className="ml-2 text-white">
                {new Set(metadata.map(m => m.label_code)).size}
              </span>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [testCounter, setTestCounter] = useState(0);

  // Test basic JavaScript execution
  console.log('[Neuro-Explorer] About to set timeout');
  setTimeout(() => {
    console.log('[Neuro-Explorer] setTimeout executed - basic JS works');
    console.log('[Neuro-Explorer] React available?', typeof React !== 'undefined');
    console.log('[Neuro-Explorer] useState available?', typeof useState === 'function');
    console.log('[Neuro-Explorer] useEffect available?', typeof useEffect === 'function');
  }, 1000);

  console.log('[Neuro-Explorer] testCounter:', testCounter);

  useEffect(() => {
    console.log('[Neuro-Explorer] Setting isClient to true');
    setIsClient(true);
  }, []);

  console.log('[Neuro-Explorer] Home wrapper - isClient:', isClient);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-100">Initializing client...</p>
          <button 
            onClick={() => {
              console.log('[Neuro-Explorer] Button clicked - testing useState');
              setTestCounter(c => c + 1);
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test useState (Count: {testCounter})
          </button>
          <button 
            onClick={() => {
              console.log('[Neuro-Explorer] Manually setting isClient to true');
              setIsClient(true);
            }}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Bypass useEffect - Start App
          </button>
        </div>
      </div>
    );
  }

  return (
    <HomeContent />
  );
}
