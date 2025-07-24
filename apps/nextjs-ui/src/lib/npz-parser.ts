// NPZ Parser for browser environment
// NPZ files are ZIP files containing .npy files

interface NPZEntry {
  name: string;
  data: ArrayBuffer;
}

export async function parseNPZFile(arrayBuffer: ArrayBuffer): Promise<{ [key: string]: Float32Array | Uint8Array }> {
  const entries: NPZEntry[] = [];
  let offset = 0;
  
  // NPZ files are ZIP files
  while (offset < arrayBuffer.byteLength) {
    // Look for ZIP local file header (PK\x03\x04)
    const header = new Uint8Array(arrayBuffer, offset, 4);
    if (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) {
      // Found a ZIP entry
      const view = new DataView(arrayBuffer, offset);
      
      // Read ZIP header
      const compressedSize = view.getUint32(18, true);
      const uncompressedSize = view.getUint32(22, true);
      const fileNameLength = view.getUint16(26, true);
      const extraFieldLength = view.getUint16(28, true);
      
      // Read filename
      const fileName = new TextDecoder().decode(
        new Uint8Array(arrayBuffer, offset + 30, fileNameLength)
      );
      
      // Skip to data
      const dataOffset = offset + 30 + fileNameLength + extraFieldLength;
      
      if (fileName.endsWith('.npy')) {
        // This is a NumPy array file
        const data = arrayBuffer.slice(dataOffset, dataOffset + uncompressedSize);
        entries.push({ name: fileName.replace('.npy', ''), data });
      }
      
      // Move to next entry
      offset = dataOffset + compressedSize;
    } else {
      offset++;
    }
  }
  
  // Parse each .npy file
  const result: { [key: string]: Float32Array | Uint8Array } = {};
  
  for (const entry of entries) {
    const array = parseNPYFile(entry.data);
    result[entry.name] = array;
  }
  
  return result;
}

function parseNPYFile(arrayBuffer: ArrayBuffer): Float32Array | Uint8Array {
  const view = new DataView(arrayBuffer);
  
  // NPY files start with magic string
  const magic = new Uint8Array(arrayBuffer, 0, 6);
  const magicString = new TextDecoder().decode(magic);
  
  if (!magicString.startsWith('\x93NUMPY')) {
    throw new Error('Not a valid NPY file');
  }
  
  // Read header
  const majorVersion = view.getUint8(6);
  const minorVersion = view.getUint8(7);
  
  let headerLength: number;
  if (majorVersion === 1) {
    headerLength = view.getUint16(8, true);
  } else {
    headerLength = view.getUint32(8, true);
  }
  
  // Parse header string
  const headerBytes = new Uint8Array(arrayBuffer, 10, headerLength);
  const header = new TextDecoder().decode(headerBytes);
  
  // Extract shape and dtype from header
  const shapeMatch = header.match(/shape\s*:\s*\(([^)]+)\)/);
  const dtypeMatch = header.match(/descr\s*:\s*'([^']+)'/);
  
  if (!shapeMatch || !dtypeMatch) {
    throw new Error('Invalid NPY header');
  }
  
  const shape = shapeMatch[1].split(',').map(s => parseInt(s.trim()));
  const dtype = dtypeMatch[1];
  
  // Calculate data offset
  const dataOffset = 10 + headerLength;
  const data = new Uint8Array(arrayBuffer, dataOffset);
  
  // Convert to appropriate typed array
  if (dtype === '<f4' || dtype === 'float32') {
    return new Float32Array(data.buffer, data.byteOffset, data.length / 4);
  } else if (dtype === 'u1' || dtype === 'uint8') {
    return new Uint8Array(data);
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