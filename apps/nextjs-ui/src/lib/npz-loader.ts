import { NPZData, WindowMetadata } from '@/types';
import { parseNPYFile } from './npz-parser';

// Helper to load and parse a .npy file
async function loadNPY(url: string): Promise<Float32Array | Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch NPY: ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  const { array } = parseNPYFile(arrayBuffer);
  return array;
}

// Loader for separate NPY files
export async function loadNPZData(folder: string): Promise<NPZData> {
  // folder should be like '/v2025_07_24f' or '' for root
  const prefix = folder.endsWith('/') ? folder : folder + '/';
  try {
    const [traces, label_seq, encoded_labels, emb_mean, pca_xy] = await Promise.all([
      loadNPY(prefix + 'traces.npy'),
      loadNPY(prefix + 'label_seq.npy'),
      loadNPY(prefix + 'encoded_labels.npy'),
      loadNPY(prefix + 'emb_mean.npy'),
      loadNPY(prefix + 'pca_xy.npy'),
    ]);
    return {
      traces: traces as Float32Array,
      label_seq: label_seq as Uint8Array,
      encoded_labels: encoded_labels as Uint8Array,
      emb_mean: emb_mean as Float32Array,
      pca_xy: pca_xy as Float32Array,
      origin_keys: {},
    };
  } catch (error) {
    console.error('Error loading NPY data:', error);
    throw error;
  }
}

// Generate realistic mock trace data (for sample data)
function generateMockTraces(numWindows: number, numSamples: number = 500): Float32Array {
  const traces = new Float32Array(numWindows * numSamples);
  for (let i = 0; i < numWindows; i++) {
    const baseSignal = Math.sin(i * 0.1) * 0.5; // Varying base signal
    for (let j = 0; j < numSamples; j++) {
      const time = j / numSamples;
      const signal = baseSignal + 
                    Math.sin(time * 2 * Math.PI * 3) * 0.3 + // Oscillation
                    Math.random() * 0.1; // Noise
      traces[i * numSamples + j] = signal;
    }
  }
  return traces;
}

// Load metadata from CSV file (simplified)
export async function loadMetadata(url: string): Promise<WindowMetadata[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        window_id: parseInt(values[0]),
        label_code: parseInt(values[1]),
        pca_x: parseFloat(values[2]),
        pca_y: parseFloat(values[3])
      };
    });
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