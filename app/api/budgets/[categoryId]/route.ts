import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  await ensureInit();
  const db = getDb();
  const { categoryId } = await params;
  const catId = parseInt(categoryId);
  const body = await req.json();
  const { year_month, amount } = body;

  if (!year_month || amount === undefined) {
    return NextResponse.json({ error: 'year_month and amount required' }, { status: 400 });
  }

  const result = db.prepare(`
    INSERT INTO budget_limits (category_id, year_month, amount)
    VALUES (?, ?, ?)
    ON CONFLICT(category_id, year_month) DO UPDATE SET amount = excluded.amount
    RETURNING *
  `).get(catId, year_month, parseFloat(amount));

  return NextResponse.json(result);
}
