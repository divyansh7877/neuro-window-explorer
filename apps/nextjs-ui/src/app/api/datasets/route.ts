import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// This now runs on the Node.js runtime, which has access to the filesystem.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get the full path to the public directory, assuming CWD is the project root
    const publicDir = path.join(process.cwd(), 'public');
    const allEntries = await fs.readdir(publicDir, { withFileTypes: true });

    const datasetFolders = allEntries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    const datasets = [];
    for (const folderName of datasetFolders) {
      const manifestPath = path.join(publicDir, folderName, 'manifest.json');
      try {
        // Check if manifest.json exists in the directory
        await fs.access(manifestPath);
        datasets.push({
          label: folderName,
          folder: `/${folderName}/`,
        });
      } catch {
        // Ignore folders that do not contain a manifest.json
      }
    }

    return NextResponse.json({ datasets });

  } catch (error) {
    console.error('[datasets API] Failed to scan public directory', error);
    // Return an empty list in case of an error
    return NextResponse.json({ datasets: [] }, { status: 500 });
  }
}