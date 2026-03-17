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
  const catId = parseInt(id);

  const txnCount = db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE category_id = ?`).get(catId) as { count: number };
  if (txnCount.count > 0) {
    return NextResponse.json({ error: 'Category has transactions, cannot delete' }, { status: 409 });
  }

  const result = db.prepare(`DELETE FROM categories WHERE id = ?`).run(catId);
  if (result.changes === 0) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const db = getDb();
  const { id } = await params;
  const catId = parseInt(id);
  const body = await req.json();
  const { name, icon, color } = body;

  const existing = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(catId);
  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  try {
    const cat = db.prepare(`
      UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color)
      WHERE id = ? RETURNING *
    `).get(name ?? null, icon ?? null, color ?? null, catId);
    return NextResponse.json(cat);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
