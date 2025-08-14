// NPY file parser for browser

export function parseNPYFile(arrayBuffer: ArrayBuffer): { array: Float32Array | Uint8Array | Int16Array, shape: number[], dtype: string } {
  // Log the first 16 bytes for debugging
  const headerBytes = new Uint8Array(arrayBuffer, 0, 16);
  console.log('[NPY] NPY header bytes:', Array.from(headerBytes));

  // Robust magic string check (compare raw bytes)
  const magic = new Uint8Array(arrayBuffer, 0, 6);
  if (!(magic[0] === 0x93 && magic[1] === 0x4E && magic[2] === 0x55 && magic[3] === 0x4D && magic[4] === 0x50 && magic[5] === 0x59)) {
    throw new Error('Not a valid NPY file');
  }

  const view = new DataView(arrayBuffer);

  // Read header
  const majorVersion = view.getUint8(6);
  // const minorVersion = view.getUint8(7); // Not used

  let headerLength: number;
  if (majorVersion === 1) {
    headerLength = view.getUint16(8, true);
  } else {
    headerLength = view.getUint32(8, true);
  }

  // Parse header string
  const headerBytes2 = new Uint8Array(arrayBuffer, 10, headerLength);
  const header = new TextDecoder().decode(headerBytes2);
  console.log('[NPY] NPY header string:', header);

  // Extract shape and dtype from header
  // Allow optional quotes around keys (e.g., 'shape': or "shape":)
  const shapeMatch = header.match(/["']?shape["']?\s*:\s*\(([^)]*)\)/);
  const dtypeMatch = header.match(/["']?descr["']?\s*:\s*['\"]([^'\"]+)['\"]/);

  if (!shapeMatch || !dtypeMatch) {
    throw new Error('Invalid NPY header');
  }

  // Robust shape parsing: allow trailing commas and whitespace
  const shape = shapeMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(Number);
  const dtype = dtypeMatch[1];

  // Calculate data offset
  const dataOffset = 10 + headerLength;
  const data = new Uint8Array(arrayBuffer, dataOffset);

  // Convert to appropriate typed array
  if (dtype === '<f4' || dtype === 'float32') {
    return { array: new Float32Array(data.buffer, data.byteOffset, data.length / 4), shape, dtype };
  } else if (dtype === 'u1' || dtype === 'uint8' || dtype === '|u1') {
    return { array: new Uint8Array(data), shape, dtype };
  } else if (dtype === '<i2' || dtype === 'int16') {
    return { array: new Int16Array(data.buffer, data.byteOffset, data.length / 2), shape, dtype };
  } else {
    throw new Error(`Unsupported dtype: ${dtype}`);
  }
}

// Simplified version for demo - creates realistic traces based on label patterns
export function createRealisticTraces(numWindows: number): Float32Array {
  const numSamples = 500;
  const traces = new Float32Array(numWindows * numSamples);

  for (let i = 0; i < numWindows; i++) {
    // Create different patterns based on window index (simulating different labels)
    const pattern = i % 4;
    const baseSignal = Math.sin(i * 0.01) * 0.2;

    for (let j = 0; j < numSamples; j++) {
      const time = j / numSamples;
      let signal = baseSignal;

      switch (pattern) {
        case 0: // Slow oscillations
          signal += Math.sin(time * 2 * Math.PI * 2) * 0.3;
          break;
        case 1: // Fast oscillations
          signal += Math.sin(time * 2 * Math.PI * 6) * 0.4;
          break;
        case 2: // Mixed pattern
          signal += Math.sin(time * 2 * Math.PI * 3) * 0.25 + Math.sin(time * 2 * Math.PI * 8) * 0.2;
          break;
        case 3: // Irregular with spikes
          signal += Math.sin(time * 2 * Math.PI * 4) * 0.3;
          if (Math.random() < 0.1) signal += 0.5; // Random spikes
          break;
      }

      // Add realistic noise
      signal += (Math.random() - 0.5) * 0.1;
      traces[i * numSamples + j] = signal;
    }
  }

  return traces;
} 