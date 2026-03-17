import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';

export async function GET() {
  await ensureInit();
  const db = getDb();
  const settings = db.prepare(`SELECT * FROM settings`).all() as { key: string; value: string }[];
  const obj: Record<string, string> = {};
  for (const s of settings) {
    obj[s.key] = s.value;
  }
  return NextResponse.json(obj);
}

export async function PUT(req: NextRequest) {
  await ensureInit();
  const db = getDb();
  const body = await req.json();

  const upsert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  const updateMany = db.transaction((entries: [string, string][]) => {
    for (const [k, v] of entries) {
      upsert.run(k, String(v));
    }
  });

  updateMany(Object.entries(body) as [string, string][]);
  return NextResponse.json({ ok: true });
}
