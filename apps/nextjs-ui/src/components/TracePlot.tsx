'use client';

import { useEffect, useRef, useState } from 'react';

interface TracePlotProps {
  mean: number[];
  std: number[];
  title?: string;
}

export default function TracePlot({ mean, std, title = "Mean ± Std Trace" }: TracePlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import Plotly only on client side
    import('plotly.js-dist').then((Plotly) => {
      setPlotlyLoaded(true);
      
      if (!plotRef.current || mean.length === 0) return;

      const x = Array.from({ length: mean.length }, (_, i) => i);
      
      const plotData = [
        {
          x,
          y: mean,
          mode: 'lines' as const,
          type: 'scatter' as const,
          name: 'Mean',
          line: { color: 'royalblue', width: 2 }
        },
        {
          x: [...x, ...x.slice().reverse()],
          y: [...mean.map((m, i) => m - std[i]), ...mean.map((m, i) => m + std[i]).reverse()],
          mode: 'lines' as const,
          type: 'scatter' as const,
          fill: 'toself' as const,
          fillcolor: 'rgba(65,105,225,0.2)',
          line: { color: 'rgba(255,255,255,0)' },
          name: '±1 Std. Dev.',
          showlegend: true
        }
      ];

      const layout = {
        title,
        xaxis: { title: 'Sample' },
        yaxis: { title: 'Signal' },
        width: 900,
        height: 400,
        showlegend: true
      };

      const config = {
        displayModeBar: true,
        displaylogo: false
      };

      Plotly.default.newPlot(plotRef.current, plotData, layout, config);

      return () => {
        if (plotRef.current) {
          Plotly.default.purge(plotRef.current);
        }
      };
    });
  }, [mean, std, title]);

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

  if (mean.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No trace data to display</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={plotRef} className="w-full" />
    </div>
  );
} 