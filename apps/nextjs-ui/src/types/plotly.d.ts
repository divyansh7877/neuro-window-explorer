declare module 'plotly.js-dist' {
  const Plotly: {
    newPlot: (element: HTMLElement, data: any, layout: any, config?: any) => void;
    purge: (element: HTMLElement) => void;
  };
  export default Plotly;
} 