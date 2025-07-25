'use client';

import { useEffect, useRef, useState } from 'react';
import { WindowMetadata } from '@/types';

interface ScatterPlotProps {
  data: WindowMetadata[];
  onSelectionChange: (selectedIds: number[]) => void;
  selectedIds: number[];
  pca_xy?: Float32Array;
}

export default function ScatterPlot({ data, onSelectionChange, selectedIds, pca_xy }: ScatterPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import Plotly only on client side
    import('plotly.js-dist').then((Plotly) => {
      setPlotlyLoaded(true);
      
      if (!plotRef.current || !data.length) return;

      // Prepare data for Plotly
      const x = pca_xy ? pca_xy.filter((_, i) => i % 2 === 0) : data.map(d => d.pca_x);
      const y = pca_xy ? pca_xy.filter((_, i) => i % 2 !== 0) : data.map(d => d.pca_y);
      const colors = data.map(d => d.label_code);
      const ids = data.map(d => d.window_id);

      const plotData = [{
        x,
        y,
        mode: 'markers' as const,
        type: 'scattergl' as const,
        marker: {
          size: 6,
          color: colors,
          colorscale: 'Viridis' as const,
          showscale: true,
          colorbar: {
            title: 'Label Code'
          }
        },
        text: ids.map(id => `Window ID: ${id}`),
        hoverinfo: 'text',
        selectedpoints: selectedIds.map(id => data.findIndex(d => d.window_id === id)).filter(i => i !== -1)
      }];

      const layout = {
        title: 'PCA-XY Embedding',
        xaxis: { title: 'PCA X' },
        yaxis: { title: 'PCA Y' },
        width: 900,
        height: 600,
        dragmode: 'lasso' as const,
        selectdirection: 'any' as const
      };

      const config = {
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        displaylogo: false
      };

      Plotly.default.newPlot(plotRef.current, plotData, layout, config);

      // Handle selection events
      plotRef.current.on('plotly_selected', (eventData: any) => {
        if (eventData && eventData.points) {
          const selectedIndices = eventData.points.map((p: any) => p.pointIndex);
          const newSelectedIds = selectedIndices.map((i: number) => data[i].window_id);
          onSelectionChange(newSelectedIds);
        }
      });

      // Handle deselection
      plotRef.current.on('plotly_deselect', () => {
        onSelectionChange([]);
      });

      return () => {
        if (plotRef.current) {
          Plotly.default.purge(plotRef.current);
        }
      };
    });
  }, [data, selectedIds, onSelectionChange]);

  if (!plotlyLoaded) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading plot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={plotRef} className="w-full" />
      <div className="mt-2 text-sm text-gray-600">
        Use lasso tool to select points. Selected: {selectedIds.length} windows
      </div>
    </div>
  );
} 