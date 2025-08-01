import { tableFromIPC } from 'apache-arrow';
import { parseNPYFile } from './npz-parser';
import type { NPZData, WindowMetadata } from '../types';

// Helper to load and parse a .npy file
async function loadNPY(url: string): Promise<Float32Array | Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch NPY: ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  const { array } = parseNPYFile(arrayBuffer);
  return array;
}

// Loader for data based on manifest.json
export async function loadNPZData(folder: string): Promise<NPZData> {
  const manifestUrl = `${folder}manifest.json`;
  const manifestResponse = await fetch(manifestUrl);
  if (!manifestResponse.ok) throw new Error(`Failed to fetch manifest: ${manifestUrl}`);
  const manifest = await manifestResponse.json();

  const dataPromises = Object.entries(manifest).map(async ([key, filename]) => {
    if (typeof filename === 'string' && filename.endsWith('.npy')) {
      const url = `${folder}${filename}`;
      const array = await loadNPY(url);
      return [key, array];
    }
    return [key, null];
  });

  const dataEntries = await Promise.all(dataPromises);
  const npzData: Record<string, Float32Array | Uint8Array> = Object.fromEntries(dataEntries.filter(([, val]) => val !== null));

  return {
    traces: npzData.traces as Float32Array,
    label_seq: npzData.label_seq as Uint8Array,
    encoded_labels: npzData.encoded_labels as Uint8Array,
    emb_mean: npzData.emb_mean as Float32Array,
    pca_xy: npzData.pca_xy as Float32Array,
    origin_keys: {},
  };
}

// Load metadata from Parquet file
export async function loadMetadata(url: string): Promise<WindowMetadata[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    // Dynamic import to avoid Node.js bundle issues
    const { readParquet } = await import('parquet-wasm/bundler');
    
    const arrayBuffer = await response.arrayBuffer();
    const parquetUint8Array = new Uint8Array(arrayBuffer);
    
    // Read Parquet file using parquet-wasm
    const wasmTable = readParquet(parquetUint8Array);
    const table = tableFromIPC(wasmTable.intoIPCStream());
    
    const metadata: WindowMetadata[] = [];

    for (const row of table) {
        metadata.push({
            window_id: row.window_id,
            label_code: row.label_code,
            pca_x: row.pca_x,
            pca_y: row.pca_y,
        });
    }

    return metadata;
  } catch (error) {
    console.error('Error loading metadata:', error);
    throw error;
  }
}

// Compute mean and std for selected traces
export function computeTraceStats(
  traces: Float32Array, 
  selectedIds: number[], 
  windowIds: number[]
): { mean: number[], std: number[] } {
  if (selectedIds.length === 0) {
    return { mean: [], std: [] };
  }
  
  const numSamples = 500; // Fixed window size
  const selectedIndices = selectedIds.map(id => windowIds.indexOf(id)).filter(i => i !== -1);
  
  if (selectedIndices.length === 0) {
    return { mean: [], std: [] };
  }
  
  const selectedTraces = selectedIndices.map(idx => 
    Array.from(traces.slice(idx * numSamples, (idx + 1) * numSamples))
  );
  
  const mean = new Array(numSamples).fill(0);
  const std = new Array(numSamples).fill(0);
  
  // Compute mean
  for (let i = 0; i < numSamples; i++) {
    let sum = 0;
    for (let j = 0; j < selectedTraces.length; j++) {
      sum += selectedTraces[j][i];
    }
    mean[i] = sum / selectedTraces.length;
  }
  
  // Compute std
  for (let i = 0; i < numSamples; i++) {
    let sumSq = 0;
    for (let j = 0; j < selectedTraces.length; j++) {
      const diff = selectedTraces[j][i] - mean[i];
      sumSq += diff * diff;
    }
    std[i] = Math.sqrt(sumSq / selectedTraces.length);
  }
  
  return { mean, std };
}

// Detect peaks in a trace
export function detectPeaks(trace: number[], minProminence: number = 0.05): number[] {
  const peaks: number[] = [];
  const traceMin = Math.min(...trace);
  const traceMax = Math.max(...trace);
  const range = traceMax - traceMin;
  const prominence = range * minProminence;
  
  // Simple peak detection - find local minima
  for (let i = 1; i < trace.length - 1; i++) {
    // Look for local minima (negative peaks)
    const current = trace[i];
    const left = trace[i - 1];
    const right = trace[i + 1];
    
    // Check if this is a local minimum
    if (current < left && current < right) {
      // Simple prominence check - just make sure it's significantly below neighbors
      const avgNeighbor = (left + right) / 2;
      const depth = avgNeighbor - current;
      
      if (depth >= prominence) {
        peaks.push(i);
      }
    }
  }
  
  return peaks;
}

// Align traces based on their primary peak
export function alignTraces(
  traces: Float32Array, 
  selectedIds: number[], 
  windowIds: number[]
): { alignedTraces: number[][], peakPositions: number[], mean: number[], std: number[] } {
  if (selectedIds.length === 0) {
    return { alignedTraces: [], peakPositions: [], mean: [], std: [] };
  }
  
  const numSamples = 500;
  const selectedIndices = selectedIds.map(id => windowIds.indexOf(id)).filter(i => i !== -1);
  
  if (selectedIndices.length === 0) {
    return { alignedTraces: [], peakPositions: [], mean: [], std: [] };
  }
  
  // Extract individual traces
  const individualTraces = selectedIndices.map(idx => 
    Array.from(traces.slice(idx * numSamples, (idx + 1) * numSamples))
  );
  
  // Detect peaks for each trace
  const peakPositions: number[] = [];
  const alignedTraces: number[][] = [];
  
  for (const trace of individualTraces) {
    const peaks = detectPeaks(trace);
    if (peaks.length > 0) {
      // Use the most prominent peak (deepest minimum)
      const primaryPeak = peaks.reduce((min, peak) => 
        trace[peak] < trace[min] ? peak : min, peaks[0]
      );
      peakPositions.push(primaryPeak);
      
      // Align trace so peak is at center (250)
      const shift = 250 - primaryPeak;
      const alignedTrace = new Array(numSamples).fill(0);
      
      for (let i = 0; i < numSamples; i++) {
        const sourceIndex = i - shift;
        if (sourceIndex >= 0 && sourceIndex < numSamples) {
          alignedTrace[i] = trace[sourceIndex];
        } else {
          // Left and right padding: use zeros
          alignedTrace[i] = 0;
        }
      }
      
      alignedTraces.push(alignedTrace);
    } else {
      // If no peak found, use original trace
      peakPositions.push(250);
      alignedTraces.push(trace);
    }
  }
  
  // Compute mean and std of aligned traces
  const mean = new Array(numSamples).fill(0);
  const std = new Array(numSamples).fill(0);
  
  // Compute mean
  for (let i = 0; i < numSamples; i++) {
    let sum = 0;
    for (let j = 0; j < alignedTraces.length; j++) {
      sum += alignedTraces[j][i];
    }
    mean[i] = sum / alignedTraces.length;
  }
  
  // Compute std
  for (let i = 0; i < numSamples; i++) {
    let sumSq = 0;
    for (let j = 0; j < alignedTraces.length; j++) {
      const diff = alignedTraces[j][i] - mean[i];
      sumSq += diff * diff;
    }
    std[i] = Math.sqrt(sumSq / alignedTraces.length);
  }
  
  return { alignedTraces, peakPositions, mean, std };
} 