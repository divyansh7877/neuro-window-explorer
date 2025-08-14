import { tableFromIPC } from 'apache-arrow';
import { parseNPYFile } from './npz-parser';
import type { NPZData, WindowMetadata, AlignmentMethod, Manifest, OldManifest } from '../types';

// Helper to load and parse a .npy file
async function loadNPY(url: string): Promise<Float32Array | Uint8Array | Int16Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch NPY: ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  const { array } = parseNPYFile(arrayBuffer);
  return array;
}

// Loader for data based on manifest.json
export async function loadDataFromManifest(folder: string): Promise<{ manifest: Manifest, npzData: NPZData }> {
  const manifestUrl = `${folder}manifest.json`;
  const manifestResponse = await fetch(manifestUrl);
  if (!manifestResponse.ok) throw new Error(`Failed to fetch manifest: ${manifestUrl}`);
  const manifest = await manifestResponse.json() as Manifest | OldManifest;
  let manifestObject: Manifest;

  // For backward compatibility with old manifests
  if (!('files' in manifest)) {
    const oldManifest = manifest as OldManifest;
    const files: Record<string, string> = {};
    if (oldManifest.traces) files.traces = oldManifest.traces;
    if (oldManifest.encoded_labels) files.encoded_labels = oldManifest.encoded_labels;
    if (oldManifest.cluster_labels) files.cluster_labels = oldManifest.cluster_labels;
    if (oldManifest.emb_mean) files.emb_mean = oldManifest.emb_mean;
    if (oldManifest.metadata) files.metadata = oldManifest.metadata;
    
    // Create a new, valid Manifest object
    manifestObject = { ...oldManifest, files };
  } else {
    manifestObject = manifest as Manifest;
  }

  const dataPromises = Object.entries(manifestObject.files).map(async ([key, filename]) => {
    if (typeof filename === 'string' && filename.endsWith('.npy')) {
      const url = `${folder}${filename}`;
      const array = await loadNPY(url);
      return [key, array];
    }
    return [key, null];
  });

  const dataEntries = await Promise.all(dataPromises);
  const npzDataArrays: Record<string, Float32Array | Uint8Array | Int16Array> = Object.fromEntries(dataEntries.filter(([, val]) => val !== null));

  const npzData: NPZData = {
    traces: npzDataArrays.traces as Float32Array,
    encoded_labels: npzDataArrays.encoded_labels as Uint8Array,
    cluster_labels: (npzDataArrays.cluster_labels as Int16Array) || undefined,
    emb_mean: npzDataArrays.emb_mean as Float32Array,
    origin_keys: {},
  };

  return { manifest: manifestObject, npzData };
}

// Load metadata from Parquet file
export async function loadMetadata(url: string): Promise<WindowMetadata[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    const { readParquet } = await import('parquet-wasm/bundler');
    
    const arrayBuffer = await response.arrayBuffer();
    const parquetUint8Array = new Uint8Array(arrayBuffer);
    
    const wasmTable = readParquet(parquetUint8Array);
    const table = tableFromIPC(wasmTable.intoIPCStream());
    
    const metadata: WindowMetadata[] = [];

    for (const row of table) {
        metadata.push({
            window_id: row.window_id,
            label_code: row.label_code,
            cluster_code: row.cluster_code,
            pca_x: row.pca_x,
            pca_y: row.pca_y,
            tsne_x: row.tsne_x,
            tsne_y: row.tsne_y,
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
  windowIds: number[],
  timesteps: number
): { mean: number[], std: number[] } {
  if (selectedIds.length === 0) {
    return { mean: [], std: [] };
  }
  
  const numSamples = timesteps; // Use dynamic window size
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
  
  // Simple peak detection - find local extrema
  for (let i = 1; i < trace.length - 1; i++) {
    const current = trace[i];
    const left = trace[i - 1];
    const right = trace[i + 1];
    const avgNeighbor = (left + right) / 2;
    const depth = avgNeighbor - current; // negative peak depth
    const height = current - avgNeighbor; // positive peak height

    // Consider both negative and positive peaks; filter later by method
    if ((current < left && current < right && depth >= prominence) ||
        (current > left && current > right && height >= prominence)) {
      peaks.push(i);
    }
  }
  
  return peaks;
}

// Align traces based on their primary peak
export function alignTraces(
  traces: Float32Array,
  selectedIds: number[],
  windowIds: number[],
  timesteps: number,
  method: AlignmentMethod = 'neg-peak'
): { alignedTraces: number[][], peakPositions: number[], mean: number[], std: number[] } {
  if (selectedIds.length === 0) {
    return { alignedTraces: [], peakPositions: [], mean: [], std: [] };
  }
  
  const numSamples = timesteps;
  const selectedIndices = selectedIds.map(id => windowIds.indexOf(id)).filter(i => i !== -1);
  
  if (selectedIndices.length === 0) {
    return { alignedTraces: [], peakPositions: [], mean: [], std: [] };
  }
  
  // Extract individual traces
  const individualTraces = selectedIndices.map(idx => 
    Array.from(traces.slice(idx * numSamples, (idx + 1) * numSamples))
  );
  
  // Detect alignment anchors for each trace
  const peakPositions: number[] = [];
  const alignedTraces: number[][] = [];
  
  if (method === 'none') {
    for (const trace of individualTraces) {
      peakPositions.push(250);
      alignedTraces.push(trace);
    }
  } else if (method === 'xcorr') {
    // Cross-correlation alignment to the mean of all traces
    // Compute reference as simple average
    const reference = new Array(numSamples).fill(0);
    for (let i = 0; i < numSamples; i++) {
      let s = 0;
      for (let j = 0; j < individualTraces.length; j++) s += individualTraces[j][i];
      reference[i] = s / individualTraces.length;
    }
    const maxLag = 100; // limit search
    function computeShiftByXcorr(trace: number[], ref: number[]): number {
      let bestLag = 0;
      let bestScore = -Infinity;
      for (let lag = -maxLag; lag <= maxLag; lag++) {
        let score = 0;
        for (let i = 0; i < numSamples; i++) {
          const j = i - lag;
          if (j >= 0 && j < numSamples) score += trace[j] * ref[i];
        }
        if (score > bestScore) { bestScore = score; bestLag = lag; }
      }
      return bestLag;
    }
    for (const trace of individualTraces) {
      const shift = computeShiftByXcorr(trace, reference);
      const anchor = 250 - shift;
      peakPositions.push(Math.max(0, Math.min(numSamples - 1, Math.round(anchor))));
      const alignedTrace = new Array(numSamples).fill(0);
      for (let i = 0; i < numSamples; i++) {
        const sourceIndex = i - shift;
        if (sourceIndex >= 0 && sourceIndex < numSamples) alignedTrace[i] = trace[sourceIndex];
      }
      alignedTraces.push(alignedTrace);
    }
  } else {
    // Peak-based alignment: negative or positive peak
    for (const trace of individualTraces) {
      const peaks = detectPeaks(trace);
      if (peaks.length > 0) {
        let primaryPeak = peaks[0];
        if (method === 'neg-peak') {
          primaryPeak = peaks.reduce((best, idx) => trace[idx] < trace[best] ? idx : best, primaryPeak);
        } else {
          primaryPeak = peaks.reduce((best, idx) => trace[idx] > trace[best] ? idx : best, primaryPeak);
        }
        peakPositions.push(primaryPeak);
        const shift = 250 - primaryPeak;
        const alignedTrace = new Array(numSamples).fill(0);
        for (let i = 0; i < numSamples; i++) {
          const sourceIndex = i - shift;
          if (sourceIndex >= 0 && sourceIndex < numSamples) alignedTrace[i] = trace[sourceIndex];
        }
        alignedTraces.push(alignedTrace);
      } else {
        peakPositions.push(250);
        alignedTraces.push(trace);
      }
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