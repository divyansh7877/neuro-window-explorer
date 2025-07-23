import streamlit as st, numpy as np

#@st.cache_resource
def load_npz(path):
    return np.load(path, allow_pickle=True)

data = load_npz("v2025-07-24f/windows.npz")

traces         = data["traces"]            # (N, 500)
encoded_labels = data["encoded_labels"]    # (N,)
pca_xy         = data["pca_xy"]            # (N, 2)

sel = st.plotly_chart(...).selected_points
if sel:
    idx = np.array(sel, dtype=int)
    mean_trace = traces[idx].mean(axis=0)
    st.line_chart(mean_trace)
