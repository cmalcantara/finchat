import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';

function getBalance(db: ReturnType<typeof getDb>, id: number): number {
  const account = db.prepare(`SELECT initial_balance FROM accounts WHERE id = ?`).get(id) as { initial_balance: number } | undefined;
  const init = account?.initial_balance ?? 0;
  const income = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='income' AND account_id=?`).get(id) as { t: number }).t;
  const expense = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='expense' AND account_id=?`).get(id) as { t: number }).t;
  const out = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='transfer' AND account_id=?`).get(id) as { t: number }).t;
  const inc = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='transfer' AND to_account_id=?`).get(id) as { t: number }).t;
  return init + income - expense - out + inc;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const db = getDb();
  const { id } = await params;
  const acc = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(parseInt(id)) as { id: number } | undefined;
  if (!acc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...acc, balance: getBalance(db, parseInt(id)) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const db = getDb();
  const { id } = await params;
  const body = await req.json();
  const { name, currency, initial_balance, is_default } = body;
  try {
    const acc = db.prepare(`
      UPDATE accounts SET
        name = COALESCE(?, name),
        currency = COALESCE(?, currency),
        initial_balance = COALESCE(?, initial_balance),
        is_default = COALESCE(?, is_default)
      WHERE id = ? RETURNING *
    `).get(name ?? null, currency ?? null, initial_balance ?? null, is_default ?? null, parseInt(id));
    return NextResponse.json(acc);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureInit();
  const db = getDb();
  const { id } = await params;
  const count = (db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE account_id=? OR to_account_id=?`).get(parseInt(id), parseInt(id)) as { c: number }).c;
  if (count > 0) return NextResponse.json({ error: 'Account has transactions' }, { status: 409 });
  db.prepare(`DELETE FROM accounts WHERE id = ?`).run(parseInt(id));
  return NextResponse.json({ ok: true });
}
