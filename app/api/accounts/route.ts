import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';

export async function GET() {
  await ensureInit();
  const db = getDb();
  const accounts = db.prepare(`SELECT * FROM accounts ORDER BY is_default DESC, name`).all();
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const db = getDb();
  const body = await req.json();
  const { name, currency = 'PHP', initial_balance = 0 } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  try {
    const acc = db.prepare(`INSERT INTO accounts (name, currency, initial_balance) VALUES (?, ?, ?) RETURNING *`).get(name.trim(), currency, initial_balance);
    return NextResponse.json(acc, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 409 });
  }
}
