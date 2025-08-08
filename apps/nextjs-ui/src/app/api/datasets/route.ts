import { NextResponse } from 'next/server';

// Run on Edge to avoid bundling the local filesystem into a serverless function
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL('/datasets.json', request.url);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ datasets: [] }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[datasets API] Failed to read datasets.json', error);
    return NextResponse.json({ datasets: [] }, { status: 200 });
  }
}
