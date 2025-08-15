'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { WindowMetadata, NPZData, AlignmentMethod, Manifest } from '@/types';
import { loadDataFromManifest, loadMetadata, computeTraceStats, alignTraces } from '@/lib/npz-loader';
import ScatterPlot from '@/components/ScatterPlot';
import TracePlot from '@/components/TracePlot';
import LabelFilter from '@/components/LabelFilter';

import { ColorMode } from '@/components/LabelFilter';

// Fallback list of dataset folders; replaced by API response if available
const FALLBACK_DATASET_FOLDERS = [
  { label: 'v_chin_embeds', folder: '/v_chin_embeds/' },
];

function HomeContent() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [metadata, setMetadata] = useState<WindowMetadata[]>([]);
  const [npzData, setNpzData] = useState<NPZData | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [colorMode, setColorMode] = useState<ColorMode>('label');
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);

  // Reset selections when color mode changes
  useEffect(() => {
    setSelectedIds([]);
    const allCodes = Array.from(new Set(metadata.map(m => colorMode === 'label' ? m.label_code : m.cluster_code)));
    if (colorMode === 'label') {
      setSelectedLabels(allCodes as number[]);
      setSelectedClusters([]);
    } else {
      setSelectedClusters(allCodes as number[]);
      setSelectedLabels([]);
    }
  }, [colorMode, metadata]);

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

  const BASE_URL = process.env.NEXT_PUBLIC_DATA_BASE_URL || '';

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
      } catch (e: unknown) {
        console.warn('[Neuro-Explorer] Using fallback datasets', e);
      }
    }
    fetchDatasets();
  }, []);

  // Load data when dataset changes
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedIds([]);
        
        const { folder } = datasets[datasetIdx] || datasets[0];
        const effectiveFolder = `${BASE_URL}${folder}`;
        const { manifest, npzData } = await loadDataFromManifest(effectiveFolder);
        const metadata = await loadMetadata(`${effectiveFolder}${manifest.files.metadata}`);

        setManifest(manifest);
        setMetadata(metadata);
        setNpzData(npzData);

        // Default to selecting all labels
        setColorMode('label');
        const allLabels = Array.from(new Set(metadata.map(m => m.label_code)));
        setSelectedLabels(allLabels);
        setSelectedClusters([]);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('[Neuro-Explorer] Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [datasetIdx, datasets]);

  // Filter data based on selected labels or clusters
  const filteredMetadata = metadata.filter(item => {
    if (colorMode === 'label') {
      return selectedLabels.length > 0 ? selectedLabels.includes(item.label_code) : true;
    } else {
      return selectedClusters.length > 0 ? selectedClusters.includes(item.cluster_code!) : true;
    }
  });

  // Compute trace stats when selection changes
  useEffect(() => {
    if (selectedIds.length > 0 && npzData && manifest) {
      const windowIds = metadata.map(m => m.window_id);
      const timesteps = manifest.timesteps_per_sample;
      const stats = computeTraceStats(npzData.traces, selectedIds, windowIds, timesteps);
      setTraceStats(stats);
      
      const alignedData = alignTraces(npzData.traces, selectedIds, windowIds, timesteps, alignmentMethod);
      setAlignedTraceData(alignedData);
    } else {
      setTraceStats({ mean: [], std: [] });
      setAlignedTraceData({ alignedTraces: [], peakPositions: [], mean: [], std: [] });
    }
  }, [selectedIds, npzData, metadata, alignmentMethod, manifest]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Neuro-Window Explorer</h1>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <label className="text-gray-400 mr-2 font-medium">Dataset version:</label>
              <select
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1"
                value={datasetIdx}
                onChange={e => setDatasetIdx(Number(e.target.value))}
              >
                {datasets.map((ds, idx) => (
                  <option value={idx} key={ds.label}>{ds.label}</option>
                ))}
              </select>
            </div>
            {manifest && (
              <div className="text-right text-sm text-gray-400">
                <p>{manifest.version}</p>
                <p>{manifest.num_samples} samples, {manifest.timesteps_per_sample} timesteps</p>
              </div>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-lg">Loading neuro-explorer data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-xl mb-4">⚠️ Error Loading Data</div>
              <p className="text-gray-300">{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Make sure data files are in the public directory and the server is running.
              </p>
            </div>
          </div>
        ) : (
        <>
        {manifest?.description && (
          <div className="mb-8 bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Dataset Description</h2>
            <p className="text-gray-300 text-sm">{manifest.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <LabelFilter
              data={metadata}
              selected={colorMode === 'label' ? selectedLabels : selectedClusters}
              onFilterChange={colorMode === 'label' ? setSelectedLabels : setSelectedClusters}
              colorMode={colorMode}
              onColorModeChange={setColorMode}
              labelMap={manifest?.label_map}
              clusterMap={manifest?.cluster_map}
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Embedding</h2>
                <div className="flex items-center space-x-4">
                  <label className="text-sm text-gray-300">Type:</label>
                  <select
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
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
                embedType={embedType}
                colorMode={colorMode}
                labelMap={manifest?.label_map}
                clusterMap={manifest?.cluster_map}
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
                    mean={plotType1 === 'mean' ? (alignmentMethod === 'none' ? traceStats.mean : alignedTraceData.mean) : alignedTraceData.mean}
                    std={plotType1 === 'mean' ? (alignmentMethod === 'none' ? traceStats.std : alignedTraceData.std) : alignedTraceData.std}
                    title={`Plot 1: ${plotType1}`}
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
                    mean={plotType2 === 'mean' ? (alignmentMethod === 'none' ? traceStats.mean : alignedTraceData.mean) : (plotType2 === 'individual' ? [] : alignedTraceData.mean)}
                    std={plotType2 === 'mean' ? (alignmentMethod === 'none' ? traceStats.std : alignedTraceData.std) : (plotType2 === 'individual' ? [] : alignedTraceData.std)}
                    title={`Plot 2: ${plotType2}`}
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
        </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-100">Initializing client...</p>
        </div>
      </div>
    );
  }

  return <HomeContent />;
}