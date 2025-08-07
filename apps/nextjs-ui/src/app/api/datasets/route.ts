import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DatasetEntry {
  label: string;
  folder: string; // public-relative path starting and ending with '/'
  csv: string;    // public-relative path to metadata parquet
}

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const entries = await fs.readdir(publicDir, { withFileTypes: true });
    const datasets: DatasetEntry[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = path.join(publicDir, entry.name);
      const manifestPath = path.join(dirPath, 'manifest.json');
      const parquetPath = path.join(dirPath, 'metadata.parquet');
      try {
        await fs.access(manifestPath);
        await fs.access(parquetPath);
        datasets.push({
          label: entry.name,
          folder: `/${entry.name}/`,
          csv: `/${entry.name}/metadata.parquet`,
        });
      } catch {
        // Not a dataset folder; skip
      }
    }

    // Sort by name for stable ordering
    datasets.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({ datasets });
  } catch (error) {
    console.error('[datasets API] Failed to list datasets', error);
    return NextResponse.json({ datasets: [] }, { status: 200 });
  }
}
