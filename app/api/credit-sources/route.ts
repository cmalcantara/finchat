import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';

export async function GET() {
  await ensureInit();
  const db = getDb();
  return NextResponse.json(db.prepare(`SELECT * FROM credit_sources ORDER BY name`).all());
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const db = getDb();
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  try {
    const s = db.prepare(`INSERT INTO credit_sources (name) VALUES (?) RETURNING *`).get(name.trim());
    return NextResponse.json(s, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 409 });
  }
}
