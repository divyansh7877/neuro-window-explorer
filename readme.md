# Neuro‑Window Explorer

A lightweight pipeline + Streamlit app for exploring neural calcium traces in fixed‑length windows.

---

## 1. Project goal

* **Input**: raw 1‑D calcium‐trace recordings + per‑sample event labels (`FAST`, `SLOW`).
* **Output**: an interactive dashboard where you can

  * select clusters or lasso arbitrary points in an embedding scatter‑plot,
  * instantly view mean ± std traces or overlay raw examples,
  * download selections for further analysis.

---

## 2. Repo layout

```
neuro_window_explorer/
│
├── notebooks/
│   └── 01_export_artifacts.ipynb    # runs on OOD, produces npz/parquet bundle
│
├── app/
│   └── streamlit_app.py             # interactive explorer (coming soon)
│
├── scripts/
│   └── window_processing.py         # ← auto‑window + label extractor
│
├── data/
│   └── vYYYY‑MM‑DD/                 # versioned artifact folders
│       ├── windows.npz             # traces, per‑sample labels, embeddings
│       ├── metadata.parquet        # window‑level table (label_code, PCA x/y)
│       └── manifest.json           # shapes, paths, version tag
│
└── README.md                       # you’re here
```

---

## 3. Quick‑start



2. **Generate a data bundle inside Jupyter on HPC**



   * slice traces into 500‑sample windows,
   * aggregate embeddings → 64‑D + 2‑D PCA,
   * write `data/v2025‑07‑24/windows.npz` + `metadata.parquet`.

3. **Launch the Streamlit app locally**

   ```bash
   streamlit run app/streamlit_app.py -- --data data/v2025‑07‑24
   ```

---

## 4. Processing pipeline

| Step                                 | Script / notebook           | Result                                                                                                                   |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1. Window slicing & label encoding   | `window_processing.py`      | `all_windowed_traces (N,500)`  ‹float32›  <br>`all_windowed_labels (N,2,500)` ‹uint8›  <br>`encoded_labels (N,)` ‹uint8› |
| 2. Embedding aggregation (mean‑pool) | `01_export_artifacts.ipynb` | `emb_mean (N,64)`                                                                                                        |
| 3. 2‑D projection (PCA)              | same                        | `pca_xy (N,2)`                                                                                                           |
| 4. Save bundle                       | same                        | `windows.npz` + `metadata.parquet`                                                                                       |
| 5. (optional) Clustering             | same or separate            | append `cluster_id` to `metadata.parquet` + save `cluster_stats.parquet`                                                 |

---

## 5. Storage format rationale

* **windows.npz** ‑ single compressed archive (<100 MB) fast to load.<br>Suitable while *N ≈ 3 × 10⁴*.
* **metadata.parquet** ‑ table‑friendly for joins / filters.
* **manifest.json** ‑ lets the UI auto‑discover the latest version.

If the dataset grows beyond a few GB: migrate traces → **HDF5** (chunked, gzip) and keep the rest unchanged.

---

## 6. To‑do / task list

* [x] Write `window_processing.py` that returns traces  +  per‑sample labels.
* [x] Aggregate embeddings & export **npz / parquet** bundle.
* [ ] **Streamlit**: scatter‑plot of PCA‑XY with lasso + mean trace overlay.
* [ ] Add multiselect for `encoded_labels` filter.
* [ ] Compute k‑means on 64‑D embeddings → save `cluster_id`.
* [ ] Pre‑compute `cluster_stats.parquet` (mean ± std) for instant shading.
* [ ] Button to export selected windows to CSV.
* [ ] Optional: swap storage to **HDF5** when data > 1 GB.

---

## 7. Maintenance & versioning

* Every run of `01_export_artifacts.ipynb` writes to a new dated folder.<br>`streamlit_app.py` lists folders and loads the most recent by default.
* Never overwrite prior versions – reproducibility FTW.

---

## 8. Contact / authors

* **Primary dev**: Divyansh Agarwal
  [divyansh@email.com](mailto:divyansh@email.com)
* PRs & issues welcome!
