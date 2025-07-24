# Neuro-Window Explorer (Next.js UI)

A modern, browser-based toolkit for exploring neural calcium traces after HPC preprocessing, featuring a dark mode React/Next.js web UI.

---

## Features

- **Input**: Preprocessed calcium-trace windows (`windows.npz`, `metadata.parquet` → CSV)
- **Output**: Interactive web app with:
  - Lasso selection in PCA scatter plot
  - Mean ± std trace panel for selected points
  - Label-based filtering
  - Responsive dark mode UI
  - (Planned) Cluster comparison, CSV export, and more

---

## Quick Start

### 1. Prepare Data
- Convert your `metadata.parquet` to CSV (see `convert_data.py`)
- Place `real-data.npz` and `real-metadata.csv` in `apps/nextjs-ui/public/`

### 2. Run Locally
```bash
cd apps/nextjs-ui
npm install
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel
- Push to GitHub (see repo root for instructions)
- [Set up Git LFS](https://git-lfs.github.com/) for large `.npz` files
- Import the repo on [vercel.com](https://vercel.com), set root to `apps/nextjs-ui`, and deploy

---

## Project Structure
```
apps/nextjs-ui/
├── public/
│   ├── real-data.npz         # Large NPZ file (use Git LFS)
│   └── real-metadata.csv     # Metadata as CSV
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/           # React components (ScatterPlot, TracePlot, LabelFilter)
│   ├── lib/                  # Data loaders and NPZ parser
│   └── types/                # TypeScript types
├── README.md
└── ...
```

---

## Data Format
- **real-data.npz**: Contains `traces` (N, 500), `label_seq`, `encoded_labels`, `emb_mean`, `pca_xy`, `origin_keys`
- **real-metadata.csv**: Columns: `window_id`, `label_code`, `pca_x`, `pca_y`

---

## Pending Tasks / TODO
- [ ] **Full NPZ parsing in browser** (currently uses realistic generated traces)
- [ ] **Cluster comparison panel**
- [ ] **Export selected windows to CSV**
- [ ] **Deploy with Git LFS for large files**
- [ ] **Optional: External storage for very large datasets**
- [ ] **Performance optimizations for large N**
- [ ] **UI polish and accessibility improvements**

---

## Notes
- For files >50MB, use [Git LFS](https://git-lfs.github.com/)
- For datasets >100MB, consider external storage (S3, GCS, etc.)
- See `convert_data.py` for data conversion utilities

---

## License
MIT
