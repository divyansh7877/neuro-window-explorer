import streamlit as st
import pandas as pd
import numpy as np
import altair as alt
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
npz_path = os.path.join(data_path, "windows.npz")

# Load metadata
try:
    meta = pd.read_parquet(meta_path)
except Exception as e:
    st.error(f"Failed to load metadata.parquet: {e}")
    st.stop()

# Load traces
try:
    npz = np.load(npz_path)
    traces = npz['traces']  # shape (N, 500)
except Exception as e:
    st.error(f"Failed to load windows.npz: {e}")
    st.stop()

st.title("Neuro-Window Explorer")
st.markdown("### PCA Embedding Scatter Plot (colored by label_code)")

# Altair selection
selection = alt.selection_point(fields=['window_id'], bind='legend', on='click', clear='dblclick', toggle=True, nearest=True, empty='none')

scatter = alt.Chart(meta).mark_circle(size=60).encode(
    x=alt.X('pca_x', title='PCA X'),
    y=alt.Y('pca_y', title='PCA Y'),
    color=alt.Color('label_code:N', title='Label'),
    tooltip=['window_id', 'label_code', 'pca_x', 'pca_y'],
    opacity=alt.condition(selection, alt.value(1), alt.value(0.2))
).add_params(
    selection
).properties(
    width=900, height=600, title="PCA-XY Embedding (Altair)"
)

st.altair_chart(scatter, use_container_width=True)

# Get selected window_ids
selected_ids = []
if selection and hasattr(selection, 'value') and selection.value:
    selected_ids = [d['window_id'] for d in selection.value]

# Fallback: Use a multiselect for selection if Altair selection is not available
if not selected_ids:
    st.info("Select points in the scatter plot (click to select, double-click to clear, or use the multiselect below).")
    selected_ids = st.multiselect(
        "Or select window IDs manually:",
        options=meta['window_id'].tolist(),
        default=[]
    )

if selected_ids:
    st.markdown(f"#### Mean ± Std Trace for {len(selected_ids)} Selected Windows")
    if st.button("Show Mean ± Std Trace", key="show_mean_std"):
        with st.spinner("Computing mean ± std trace..."):
            idx = meta.index[meta['window_id'].isin(selected_ids)].tolist()
            selected_traces = traces[idx, :]
            mean_trace = np.mean(selected_traces, axis=0)
            std_trace = np.std(selected_traces, axis=0)
            x = np.arange(mean_trace.shape[0])
            import plotly.graph_objects as go
            trace_fig = go.Figure()
            trace_fig.add_trace(go.Scatter(
                x=x, y=mean_trace, mode='lines', name='Mean',
                line=dict(color='royalblue')
            ))
            trace_fig.add_trace(go.Scatter(
                x=np.concatenate([x, x[::-1]]),
                y=np.concatenate([mean_trace - std_trace, (mean_trace + std_trace)[::-1]]),
                fill='toself', fillcolor='rgba(65,105,225,0.2)',
                line=dict(color='rgba(255,255,255,0)'),
                hoverinfo="skip", showlegend=True, name='±1 Std. Dev.'
            ))
            trace_fig.update_layout(title="Mean ± Std Trace", xaxis_title="Sample", yaxis_title="Signal")
            st.plotly_chart(trace_fig, use_container_width=True)
else:
    st.info("Select points in the scatter plot (click to select, double-click to clear) or use the multiselect below.") 