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
    import('plotly.js-dist').then(() => {
      setPlotlyLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!plotlyLoaded || !plotRef.current || !data.length) return;

    import('plotly.js-dist').then((PlotlyModule) => {
      const Plotly = PlotlyModule.default;
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

      if (plotRef.current) {
        Plotly.newPlot(plotRef.current, plotData, layout, config);

        // Attach event listeners to the Plotly graph div
        const plotDiv = plotRef.current as unknown as HTMLElement & { on: (event: string, callback: (eventData: unknown) => void) => void };
        plotDiv.on('plotly_selected', (eventData: unknown) => {
          const event = eventData as { points?: Array<{ pointIndex: number }> };
          if (event && event.points) {
            const selectedIndices = event.points.map((p) => p.pointIndex);
            const newSelectedIds = selectedIndices
              .map((i: number) => (i < data.length && data[i] ? data[i].window_id : undefined))
              .filter((id: number | undefined): id is number => id !== undefined);
            onSelectionChange(newSelectedIds);
          }
        });

        plotDiv.on('plotly_deselect', () => {
          onSelectionChange([]);
        });
      }
    });

    return () => {
      const currentPlotRef = plotRef.current;
      if (currentPlotRef) {
        import('plotly.js-dist').then((PlotlyModule) => {
          const Plotly = PlotlyModule.default;
          Plotly.purge(currentPlotRef);
        });
      }
    };
  }, [data, plotlyLoaded, onSelectionChange, pca_xy]);

  useEffect(() => {
    if (!plotlyLoaded || !plotRef.current) return;

    import('plotly.js-dist').then((PlotlyModule) => {
      const Plotly = PlotlyModule.default;
      const selectedIndices = selectedIds.map(id => data.findIndex(d => d.window_id === id)).filter(i => i !== -1);
      if (plotRef.current) {
        Plotly.restyle(plotRef.current, { selectedpoints: [selectedIndices] });
      }
    });
  }, [selectedIds, data, plotlyLoaded]);

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