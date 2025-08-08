'use client';

import { useEffect, useRef, useState } from 'react';
import { WindowMetadata } from '@/types';

interface ScatterPlotProps {
  data: WindowMetadata[];
  onSelectionChange: (selectedIds: number[]) => void;
  selectedIds: number[];
  coords?: Float32Array; // interleaved (N,2)
  title?: string;
}

export default function ScatterPlot({ data, onSelectionChange, selectedIds, coords, title = 'Embedding' }: ScatterPlotProps) {
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
      // Choose coordinates: either provided coords or metadata PCA
      let x: number[] = [];
      let y: number[] = [];
      if (coords && coords.length >= data.length * 2) {
        for (let i = 0; i < data.length; i++) {
          x.push(coords[i * 2]);
          y.push(coords[i * 2 + 1]);
        }
      } else {
        x = data.map(d => d.pca_x);
        y = data.map(d => d.pca_y);
      }
      
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
        title,
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
      if (plotRef.current) {
        const currentPlotRef = plotRef.current;
        import('plotly.js-dist').then((PlotlyModule) => {
          const Plotly = PlotlyModule.default;
          Plotly.purge(currentPlotRef);
        });
      }
    };
  }, [data, plotlyLoaded, onSelectionChange, coords, title]);

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