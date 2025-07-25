declare module 'plotly.js-dist' {
  const Plotly: {
    newPlot: (element: HTMLElement, data: unknown, layout: unknown, config?: unknown) => void;
    purge: (element: HTMLElement) => void;
    restyle: (element: HTMLElement, update: unknown, indices?: number[]) => void;
  };
  export default Plotly;
} 