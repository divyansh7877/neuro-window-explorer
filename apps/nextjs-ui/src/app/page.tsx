'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { WindowMetadata, NPZData, AlignmentMethod } from '@/types';
import { loadNPZData, loadMetadata, computeTraceStats, alignTraces } from '@/lib/npz-loader';
import ScatterPlot from '@/components/ScatterPlot';
import TracePlot from '@/components/TracePlot';
import LabelFilter from '@/components/LabelFilter';

// Fallback list of dataset folders; replaced by API response if available
const FALLBACK_DATASET_FOLDERS = [
  { label: 'v2025_07_24f', folder: '/v2025_07_24f/', csv: '/v2025_07_24f/metadata.parquet' },
];

function HomeContent() {
  console.log('[Neuro-Explorer] Home component mounted');
  const [metadata, setMetadata] = useState<WindowMetadata[]>([]);
  const [npzData, setNpzData] = useState<NPZData | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  
  // Clear selections when filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [selectedLabels]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traceStats, setTraceStats] = useState<{ mean: number[], std: number[] }>({ mean: [], std: [] });
  const [alignedTraceData, setAlignedTraceData] = useState<{ alignedTraces: number[][], peakPositions: number[], mean: number[], std: number[] }>({ alignedTraces: [], peakPositions: [], mean: [], std: [] });
  const [plotType1, setPlotType1] = useState<'mean' | 'aligned' | 'individual'>('mean');
  const [plotType2, setPlotType2] = useState<'mean' | 'aligned' | 'individual'>('individual');
  const [alignmentMethod, setAlignmentMethod] = useState<AlignmentMethod>('neg-peak');
  const [datasetIdx, setDatasetIdx] = useState(0);
  const [datasets, setDatasets] = useState(FALLBACK_DATASET_FOLDERS);
  const [embedType, setEmbedType] = useState<'pca' | 'tsne'>('pca');

  console.log('[Neuro-Explorer] Component render - datasetIdx:', datasetIdx, 'isLoading:', isLoading);

  // Fetch dataset list from API on mount
  useEffect(() => {
    async function fetchDatasets() {
      try {
        const res = await fetch('/api/datasets', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.datasets) && json.datasets.length > 0) {
            setDatasets(json.datasets);
            setDatasetIdx(0);
          }
        }
      } catch (e) {
        console.warn('[Neuro-Explorer] Using fallback datasets');
      }
    }
    fetchDatasets();
  }, []);

  // Load data when dataset changes
  useEffect(() => {
    console.log('[Neuro-Explorer] useEffect for data loading triggered');
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedIds([]);
        setSelectedLabels([]);

        const { folder, csv } = datasets[datasetIdx] || datasets[0];
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
  }, [datasetIdx, datasets]);

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
      // Use full metadata for window IDs since traces array corresponds to full dataset
      const windowIds = metadata.map(m => m.window_id);
      const stats = computeTraceStats(npzData.traces, selectedIds, windowIds);
      setTraceStats(stats);
      
      // Also compute aligned traces
      const alignedData = alignTraces(npzData.traces, selectedIds, windowIds, alignmentMethod);
      setAlignedTraceData(alignedData);
    } else {
      setTraceStats({ mean: [], std: [] });
      setAlignedTraceData({ alignedTraces: [], peakPositions: [], mean: [], std: [] });
    }
  }, [selectedIds, npzData, metadata, alignmentMethod]);

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
              {datasets.map((ds, idx) => (
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">Embedding</h2>
                <div className="flex items-center space-x-4">
                  <label className="text-sm text-gray-300">Type:</label>
                  <select
                    className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 text-sm"
                    value={embedType}
                    onChange={(e) => setEmbedType(e.target.value as 'pca' | 'tsne')}
                  >
                    <option value="pca">PCA</option>
                    <option value="tsne">t-SNE</option>
                  </select>
                </div>
              </div>
              <ScatterPlot
                data={filteredMetadata}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                coords={embedType === 'pca' ? npzData?.pca_xy : npzData?.tsne_xy}
                title={embedType === 'pca' ? 'PCA-XY Embedding' : 't-SNE Embedding'}
              />
            </div>

            {/* Trace controls */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <label className="text-sm text-gray-300 mr-2">Alignment:</label>
                  <select
                    className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 text-sm"
                    value={alignmentMethod}
                    onChange={(e) => setAlignmentMethod(e.target.value as AlignmentMethod)}
                  >
                    <option value="none">None</option>
                    <option value="neg-peak">Negative peak</option>
                    <option value="pos-peak">Positive peak</option>
                    <option value="xcorr">Cross-correlation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Trace Plot 1 */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">
                  Trace Plot 1
                </h2>
                <div className="flex items-center space-x-4">
                  <label className="text-sm text-gray-300">Plot Type:</label>
                  <select
                    className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 text-sm"
                    value={plotType1}
                    onChange={(e) => setPlotType1(e.target.value as 'mean' | 'aligned' | 'individual')}
                  >
                    <option value="mean">Mean ± Std</option>
                    <option value="aligned">Aligned Traces</option>
                    <option value="individual">Individual Traces</option>
                  </select>
                </div>
              </div>
              {selectedIds.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-300 mb-4">
                    Selected {selectedIds.length} windows
                  </p>
                  <TracePlot
                    mean={
                      plotType1 === 'mean'
                        ? (alignmentMethod === 'none' ? traceStats.mean : alignedTraceData.mean)
                        : alignedTraceData.mean
                    }
                    std={
                      plotType1 === 'mean'
                        ? (alignmentMethod === 'none' ? traceStats.std : alignedTraceData.std)
                        : alignedTraceData.std
                    }
                    title={
                      plotType1 === 'mean' ? `Mean ± Std (${selectedIds.length} windows)` :
                      plotType1 === 'aligned' ? `Aligned Traces (${selectedIds.length} windows)` :
                      `Individual Traces (${selectedIds.length} windows)`
                    }
                    alignedTraces={alignedTraceData.alignedTraces}
                    showIndividualTraces={plotType1 !== 'mean'}
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

            {/* Trace Plot 2 */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">
                  Trace Plot 2
                </h2>
                <div className="flex items-center space-x-4">
                  <label className="text-sm text-gray-300">Plot Type:</label>
                  <select
                    className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 text-sm"
                    value={plotType2}
                    onChange={(e) => setPlotType2(e.target.value as 'mean' | 'aligned' | 'individual')}
                  >
                    <option value="mean">Mean ± Std</option>
                    <option value="aligned">Aligned Traces</option>
                    <option value="individual">Individual Traces</option>
                  </select>
                </div>
              </div>
              {selectedIds.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-300 mb-4">
                    Selected {selectedIds.length} windows
                  </p>
                  <TracePlot
                    mean={
                      plotType2 === 'mean'
                        ? (alignmentMethod === 'none' ? traceStats.mean : alignedTraceData.mean)
                        : (plotType2 === 'individual' ? [] : alignedTraceData.mean)
                    }
                    std={
                      plotType2 === 'mean'
                        ? (alignmentMethod === 'none' ? traceStats.std : alignedTraceData.std)
                        : (plotType2 === 'individual' ? [] : alignedTraceData.std)
                    }
                    title={
                      plotType2 === 'mean' ? `Mean ± Std (${selectedIds.length} windows)` :
                      plotType2 === 'aligned' ? `Aligned Traces (${selectedIds.length} windows)` :
                      `Individual Traces (${selectedIds.length} windows)`
                    }
                    alignedTraces={alignedTraceData.alignedTraces}
                    showIndividualTraces={plotType2 !== 'mean'}
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
