import { NPZData, WindowMetadata } from '@/types';

// Generate realistic mock trace data
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

// Basic NPZ loader - simplified version
export async function loadNPZData(url: string): Promise<NPZData> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch NPZ: ${response.statusText}`);
    }
    
    // For now, return mock data structure with realistic traces
    console.warn('NPZ loading not fully implemented yet - using mock data');
    
    const numWindows = 50; // Match our sample metadata
    const numSamples = 500;
    
    return {
      traces: generateMockTraces(numWindows, numSamples),
      label_seq: new Uint8Array(numWindows * 2 * numSamples),
      encoded_labels: new Uint8Array(numWindows),
      emb_mean: new Float32Array(numWindows * 64),
      pca_xy: new Float32Array(numWindows * 2),
      origin_keys: {}
    };
  } catch (error) {
    console.error('Error loading NPZ data:', error);
    throw error;
  }
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