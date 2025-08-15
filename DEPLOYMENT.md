# Vercel Deployment Guide

This project is configured for deployment on Vercel with GitHub LFS for large dataset files.

## Setup

### 1. GitHub LFS Configuration
- Large dataset files (`.npy`, `.parquet`, `.npz`) are tracked with Git LFS
- The entire `apps/nextjs-ui/public/` folder is configured for LFS tracking
- This prevents large files from being included in the main repository

### 2. Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set the following configuration in Vercel:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/nextjs-ui`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 3. Environment Variables
If your app requires any environment variables, add them in the Vercel dashboard under Project Settings > Environment Variables.

### 4. Dataset Access
The app is configured to serve dataset files from the `public` folder. Since these files are now tracked with Git LFS, they will be available during build time and can be served statically.

## Local Development

To work with this project locally:

1. Clone the repository
2. Install Git LFS: `git lfs install`
3. Pull LFS files: `git lfs pull`
4. Navigate to the Next.js app: `cd apps/nextjs-ui`
5. Install dependencies: `npm install`
6. Run development server: `npm run dev`

## File Structure

```
Visualizer_Cluster/
├── apps/
│   └── nextjs-ui/
│       ├── public/           # Large datasets (tracked with LFS)
│       │   ├── v_chin_embeds/
│       │   ├── v2025_08_14ft/
│       │   └── embeds_chin/
│       ├── src/
│       └── vercel.json       # Vercel configuration
├── .gitattributes           # LFS configuration
└── DEPLOYMENT.md           # This file
```

## Troubleshooting

### LFS Files Not Available
If LFS files are not available after deployment:
1. Ensure Git LFS is properly configured in your repository
2. Check that all LFS files have been pushed: `git lfs push --all origin main`
3. Verify the `.gitattributes` file is committed

### Build Failures
If the build fails on Vercel:
1. Check the build logs for specific errors
2. Ensure all dependencies are properly listed in `package.json`
3. Verify the build command and output directory settings
