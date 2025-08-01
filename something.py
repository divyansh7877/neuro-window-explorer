import numpy as np

def check_npy_file(file_path):
    try:
        data = np.load(file_path)
        print(f"File: {file_path}")
        print(f"Shape: {data.shape}")
        print(f"Data Type: {data.dtype}")
        print("Sample Data:", data[:5])  # Print first 5 elements for inspection
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

# Replace with the path to your NPY file
check_npy_file('apps/nextjs-ui/public/v2025_07_24f/encoded_labels.npy')