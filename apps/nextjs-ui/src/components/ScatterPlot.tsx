'use client';

import { useEffect, useRef, useState } from 'react';
import { WindowMetadata } from '@/types';

import { ColorMode } from './LabelFilter';

interface ScatterPlotProps {
  data: WindowMetadata[];
  onSelectionChange: (selectedIds: number[]) => void;
  selectedIds: number[];
  embedType: 'pca' | 'tsne';
  colorMode: ColorMode;
  labelMap?: Record<string, string>;
  clusterMap?: Record<string, string>;
  title?: string;
}

export default function ScatterPlot({ 
  data, 
  onSelectionChange, 
  selectedIds, 
  embedType, 
  colorMode, 
  labelMap, 
  clusterMap, 
  title = 'Embedding' 
}: ScatterPlotProps) {
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

      const x = data.map(d => embedType === 'pca' ? d.pca_x : d.tsne_x);
      const y = data.map(d => embedType === 'pca' ? d.pca_y : d.tsne_y);
      
      const colorData = data.map(d => colorMode === 'label' ? d.label_code : d.cluster_code);
      const colorBarTitle = colorMode === 'label' ? 'Label' : 'Cluster';
      const activeMap = colorMode === 'label' ? labelMap : clusterMap;
      const ids = data.map(d => d.window_id);

      const plotData = [{
        x,
        y,
        mode: 'markers' as const,
        type: 'scattergl' as const,
        selectedpoints: selectedIds.map(id => data.findIndex(d => d.window_id === id)).filter(i => i !== -1),
        marker: {
          size: 6,
          color: colorData,
          colorscale: 'Viridis' as const,
          showscale: true,
          colorbar: {
            title: colorBarTitle,
            tickvals: activeMap ? Object.keys(activeMap).map(Number) : undefined,
            ticktext: activeMap ? Object.values(activeMap) : undefined,
          }
        },
        text: ids.map(id => `Window ID: ${id}`),
        hoverinfo: 'text',
      }];

      const layout = {
        title,
        xaxis: { title: embedType === 'pca' ? 'PCA X' : 't-SNE X' },
        yaxis: { title: embedType === 'pca' ? 'PCA Y' : 't-SNE Y' },
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
  }, [data, plotlyLoaded, onSelectionChange, embedType, title, selectedIds, clusterMap, colorMode, labelMap]);

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