#!/usr/bin/env python3
import pandas as pd
import shutil
import os

def convert_parquet_to_csv():
    """Convert the Parquet metadata file to CSV for the web app"""
    try:
        # Read the Parquet file
        print("Reading Parquet file...")
        df = pd.read_parquet('v2025_07_24f/metadata.parquet')
        
        # Save as CSV
        output_path = 'apps/nextjs-ui/public/real-metadata.csv'
        df.to_csv(output_path, index=False)
        print(f"✅ Converted to CSV: {output_path}")
        print(f"📊 Data shape: {df.shape}")
        print(f"📋 Columns: {list(df.columns)}")
        
        return True
    except Exception as e:
        print(f"❌ Error converting Parquet: {e}")
        return False

def copy_npz_file():
    """Copy the NPZ file to the public directory"""
    try:
        source = 'v2025_07_24f/windows.npz'
        destination = 'apps/nextjs-ui/public/real-data.npz'
        
        # Create directory if it doesn't exist
        os.makedirs('apps/nextjs-ui/public', exist_ok=True)
        
        # Copy the file
        shutil.copy2(source, destination)
        print(f"✅ Copied NPZ file: {destination}")
        
        # Get file size
        size_mb = os.path.getsize(destination) / (1024 * 1024)
        print(f"📦 File size: {size_mb:.1f} MB")
        
        return True
    except Exception as e:
        print(f"❌ Error copying NPZ: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Converting data for web app...")
    
    success1 = convert_parquet_to_csv()
    success2 = copy_npz_file()
    
    if success1 and success2:
        print("\n🎉 Success! Data converted and ready for web app.")
        print("📝 Update the app to use '/real-metadata.csv' and '/real-data.npz'")
    else:
        print("\n❌ Some operations failed. Check the errors above.") 