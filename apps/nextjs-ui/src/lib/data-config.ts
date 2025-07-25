// Configuration for data sources
export const DATA_CONFIG = {
  // For local development
  local: {
    baseUrl: '',
    datasets: [
      {
        label: 'v2025_07_24f',
        folder: '/v2025_07_24f/',
        csv: '/v2025_07_24f/metadata.parquet'
      }
    ]
  },
  
  // For production deployment (example with external hosting)
  production: {
    baseUrl: process.env.NEXT_PUBLIC_DATA_BASE_URL || 'https://your-data-hosting.com',
    datasets: [
      {
        label: 'v2025_07_24f',
        folder: '/v2025_07_24f/',
        csv: '/v2025_07_24f/metadata.parquet'
      }
    ]
  }
};

export const getDataConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return DATA_CONFIG.production;
  }
  return DATA_CONFIG.local;
}; 