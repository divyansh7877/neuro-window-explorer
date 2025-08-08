// Data types for neuro-explorer
export interface WindowMetadata {
  window_id: number;
  label_code: number;
  pca_x: number;
  pca_y: number;
}

export interface NPZData {
  traces: Float32Array; // shape: (N, 500)
  label_seq: Uint8Array; // shape: (N, 2, 500)
  encoded_labels: Uint8Array; // shape: (N,)
  emb_mean: Float32Array; // shape: (N, 64)
  pca_xy: Float32Array; // shape: (N, 2)
  tsne_xy?: Float32Array; // optional: shape (N, 2)
  origin_keys: Record<string, unknown>; // shape varies
}

export interface TraceData {
  mean: number[];
  std: number[];
  samples: number[];
}

// Alignment methods for trace synchronization
export type AlignmentMethod = 'none' | 'neg-peak' | 'pos-peak' | 'xcorr';

export interface SelectionState {
  selectedIds: number[];
  isComputing: boolean;
}

export interface ClusterStats {
  cluster_id: number;
  mean_trace: number[];
  std_trace: number[];
  count: number;
} 