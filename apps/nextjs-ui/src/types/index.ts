// Data types for neuro-explorer
export interface WindowMetadata {
  window_id: number;
  label_code: number;
  cluster_code?: number;
  pca_x: number;
  pca_y: number;
  tsne_x?: number;
  tsne_y?: number;
}

export interface Manifest {
  version: string;
  description: string;
  num_samples: number;
  timesteps_per_sample: number;
  embedding_dim: number;
  num_labels: number;
  num_clusters?: number;
  label_map: Record<string, string>;
  cluster_map?: Record<string, string>;
  files: Record<string, string>;
}

// For backward-compatibility with old, flat manifest files
export type OldManifest = {
  [key: string]: string;
} & Omit<Manifest, 'files'>;

export interface NPZData {
  traces: Float32Array; // shape: (N, 500)
  encoded_labels: Uint8Array; // shape: (N,)
  cluster_labels?: Int16Array; // shape: (N,)
  emb_mean: Float32Array; // shape: (N, 64)
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