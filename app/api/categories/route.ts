import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';

export async function GET() {
  await ensureInit();
  const db = getDb();
  const categories = db.prepare(`SELECT * FROM categories ORDER BY name`).all();
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const db = getDb();
  const body = await req.json();
  const { name, icon = 'default', color = '#888888' } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  try {
    const cat = db.prepare(`INSERT INTO categories (name, icon, color) VALUES (?, ?, ?) RETURNING *`).get(name.trim(), icon, color);
    return NextResponse.json(cat, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
