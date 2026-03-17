import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const db = getDb();
  const { id } = await params;
  const count = (db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE credit_source_id=?`).get(parseInt(id)) as { c: number }).c;
  if (count > 0) return NextResponse.json({ error: 'Source has transactions' }, { status: 409 });
  db.prepare(`DELETE FROM credit_sources WHERE id=?`).run(parseInt(id));
  return NextResponse.json({ ok: true });
}
