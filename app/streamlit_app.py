import streamlit as st
import pandas as pd
import plotly.express as px
import glob
import os
import sys

st.set_page_config(page_title="Neuro-Window Explorer", layout="wide")

# Helper to find latest data folder
def get_latest_data_folder(base_path="../"):
    folders = sorted(glob.glob(os.path.join(base_path, "v*/")))
    return folders[-1] if folders else None

# Parse data path from CLI or use latest
data_path = None
if len(sys.argv) > 1:
    data_path = sys.argv[1]
else:
    data_path = get_latest_data_folder()

if not data_path:
    st.error("No data folder found. Please provide a valid data path.")
    st.stop()

meta_path = os.path.join(data_path, "metadata.parquet")

# Load metadata
try:
    meta = pd.read_parquet(meta_path)
except Exception as e:
    st.error(f"Failed to load metadata.parquet: {e}")
    st.stop()

st.title("Neuro-Window Explorer")
st.markdown("### PCA Embedding Scatter Plot")

# Assume columns: 'pca_x', 'pca_y', 'encoded_labels' (adjust if needed)
if {'pca_x', 'pca_y'}.issubset(meta.columns):
    fig = px.scatter(
        meta, x='pca_x', y='pca_y', color=meta.get('encoded_labels', None),
        title="PCA-XY Embedding",
        labels={"pca_x": "PCA X", "pca_y": "PCA Y"},
        width=900, height=600
    )
    st.plotly_chart(fig, use_container_width=True)
else:
    st.warning("metadata.parquet missing 'pca_x' and/or 'pca_y' columns.") 