import { NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';

export async function GET() {
  try {
    await ensureInit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Init error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
