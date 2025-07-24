'use client';

import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import { WindowMetadata } from '@/types';

interface ScatterPlotProps {
  data: WindowMetadata[];
  onSelectionChange: (selectedIds: number[]) => void;
  selectedIds: number[];
}

export default function ScatterPlot({ data, onSelectionChange, selectedIds }: ScatterPlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plotRef.current || !data.length) return;

    // Prepare data for Plotly
    const x = data.map(d => d.pca_x);
    const y = data.map(d => d.pca_y);
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

    Plotly.newPlot(plotRef.current, plotData, layout, config);

    // Handle selection events
    plotRef.current.on('plotly_selected', (eventData) => {
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
        Plotly.purge(plotRef.current);
      }
    };
  }, [data, selectedIds, onSelectionChange]);

  return (
    <div className="w-full">
      <div ref={plotRef} className="w-full" />
      <div className="mt-2 text-sm text-gray-600">
        Use lasso tool to select points. Selected: {selectedIds.length} windows
      </div>
    </div>
  );
} 