# Neuro‑Window Explorer

A **zero‑backend**, browser‑friendly toolkit for slicing neural calcium traces
after HPC preprocessing and exploring them through a modern React web UI.

---
## 1 · Project Goal
* **Input**: raw 1‑D calcium‑trace recordings + per‑sample event labels
  (FAST, SLOW).
* **Pre‑processing** (HPC/Jupyter): slice into 500‑sample windows,
  aggregate 64‑D embeddings → 2‑D PCA.
* **Output**: an interactive web app where users can:
  * lasso points in an embedding scatter plot,
  * instantly view the mean ± std trace or overlay raw traces,
  * compare clusters or export selections.

<p align="center"><img src="docs/architecture.png" width="680"/></p>

---
## 2 · High‑Level Architecture

| Step | Tech | Artefact | Notes |
|------|------|----------|-------|
| **HPC notebook** | Python (`numpy`, `polars`, `scikit‑learn`) | `traces.npy`, `label_seq.npy`, `pca_xy.npy`, `metadata.parquet`, `manifest.json` | 90 MB bundle; versioned folders `vYYYY‑MM‑DD` |
| **Static storage** | Git LFS (in repo)
 or **S3 + CloudFront** | CDN URL | no backend needed |
| **Web client** | **Next.js + React 18 + Vite + TypeScript** | — | pulls the NPZ once, keeps data in JS typed arrays |
| **Plotting** | **Plotly.js** (`scattergl`, `line`) | — | WebGL scatter handles 50 k points |
| **Hosting** | **Vercel (free tier)** | Live URL | 1‑click deploy from GitHub |

> **Why NPZ?**  90 MB loads in < 1 s; no spec drama (unlike Zarr v2/v3).
> When data > 4 GB, swap to **HDF5 + h5wasm**.

---
## 3 · Repository Layout

```text
neuro-explorer/
├─ data/
│   └─ v2025-07-24/
│      ├─ traces.npy
│      ├─ label_seq.npy
│      ├─ pca_xy.npy
│      ├─ metadata.parquet
│      └─ manifest.json
├─ apps/
│   ├─ nextjs-ui/               # production React client
│   └─ streamlit-proto/         # quick Python prototype
├─ scripts/
│   ├─ export_npz.py            # run on HPC to make the bundle
│   └─ bump_version.sh          # CI helper
└─ README.md                    # this file
```

---
## 4 · Quick Start

### 4.1 Run the exporter on HPC
```bash
conda activate neuro
python scripts/export_npz.py \
       --input path/to/trained_data.pkl \
       --out   data/v$(date +%Y-%m-%d)
```

### 4.2 Preview in Streamlit (local)
```bash
cd apps/streamlit-proto
streamlit run App.py  # loads latest windows.npz
```

### 4.3 Build & launch React UI
```bash
cd apps/nextjs-ui
npm i
npm run dev          # local dev mode
vercel deploy --prod # free prod URL
```

---
## 5 · Task Checklist

### Data & Backend
- [x] `window_processing.py` – slice traces, retain per‑sample labels
- [x] `export_npz.py` – create NPZ + Parquet bundle
- [ ] **Clustering & `cluster_stats.parquet`** (HDBSCAN / k‑means)
- [ ] CI workflow: on push to `data/*` → redeploy Vercel

### Front‑end
- [x] React + Tailwind skeleton (Vite)
- [x] DataProvider: fetch & cache `.npy` files (apache-arrow, npy-wasm)
- [x] Scatter plot with Plotly `scattergl` + lasso selection
- [ ] Mean ± std trace panel (line + shaded area)
- [ ] Compare clusters panel
- [ ] Download selection as CSV

### Deployment & Ops
- [x] GitHub → Vercel integration
- [ ] GitHub Action: nightly `export_npz.py` on HPC artefacts
- [ ] Upgrade to HDF5 when bundle > 4 GB

---
## 6 · Future Improvements
* **HDF5 + h5wasm** when dataset grows to multi‑GB.
* **FastAPI** endpoint for lazy slice streaming (if NPZ is too big).
* **deck.gl ScatterplotLayer** for > 1 M points.
* **Supabase** for collaborative annotations.
* **DVC** to track dataset versions & automate CI.

---
## 7 · Credits & Licence
Developed by Divyansh Agarwal · MIT License
