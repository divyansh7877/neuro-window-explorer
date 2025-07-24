# Neuro-Window Explorer (Next.js UI)

A modern, browser-based toolkit for exploring neural calcium traces after HPC preprocessing, featuring a dark mode React/Next.js web UI.

---

## Features

- **Input**: Preprocessed calcium-trace windows (now as individual `.npy` files, plus metadata CSV/Parquet)
- **Output**: Interactive web app with:
  - Lasso selection in PCA scatter plot
  - Mean ± std trace panel for selected points
  - Label-based filtering
  - Responsive dark mode UI
  - (Planned) Cluster comparison, CSV export, and more

---

## Quick Start

### 1. Prepare Data
- Export each array as a separate `.npy` file (see `export_code.py`)
- Place all `.npy` files in a versioned folder in `apps/nextjs-ui/public/`
- Place the corresponding metadata CSV/Parquet in the same folder or in `public/`

### 2. Run Locally
```bash
cd apps/nextjs-ui
npm install
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel
- Push to GitHub (see repo root for instructions)
- **Set up Git LFS for all `.npy` and `.npz` files** (see below)
- Import the repo on [vercel.com](https://vercel.com), set root to `apps/nextjs-ui`, and deploy

---

## Project Structure
```
apps/nextjs-ui/
├── public/
│   ├── v2025_07_24f/
│   │   ├── traces.npy
│   │   ├── label_seq.npy
│   │   ├── encoded_labels.npy
│   │   ├── emb_mean.npy
│   │   ├── pca_xy.npy
│   │   ├── metadata.parquet
│   │   └── manifest.json
│   └── ...
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/           # React components (ScatterPlot, TracePlot, LabelFilter)
│   ├── lib/                  # Data loaders and NPY parser
│   └── types/                # TypeScript types
├── README.md
└── ...
```

---

## Data Format
- **traces.npy**: shape (N, 500), dtype float32
- **label_seq.npy**: shape (N, 2, 500), dtype uint8
- **encoded_labels.npy**: shape (N,), dtype uint8
- **emb_mean.npy**: shape (N, 64), dtype float32
- **pca_xy.npy**: shape (N, 2), dtype float32
- **metadata.parquet**: Columns: `window_id`, `label_code`, `pca_x`, `pca_y`

---

## Git LFS for Large Files

**To track all .npy and .npz files with Git LFS:**
```bash
git lfs install
git lfs track "*.npy"
git lfs track "*.npz"
git add .gitattributes
# Add your .npy/.npz files as usual
git add path/to/your/files/*.npy
git add path/to/your/files/*.npz
git commit -m "Track .npy and .npz files with Git LFS"
git push
```
- Anyone cloning your repo will need [Git LFS](https://git-lfs.github.com/) installed.
- For datasets >100MB, consider external storage (S3, GCS, etc.)

---

## Pending Tasks / TODO
- [ ] **Cluster comparison panel**
- [ ] **Export selected windows to CSV**
- [ ] **Optional: External storage for very large datasets**
- [ ] **Performance optimizations for large N**
- [ ] **UI polish and accessibility improvements**

---

## Notes
- See `export_code.py` for data conversion utilities
- For browser compatibility, always export `.npy` files uncompressed

---

## License
MIT
