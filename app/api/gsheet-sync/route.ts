import { NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';
import { pushUnsyncedToGSheet } from '@/lib/gsheet-sync';

function getPendingCount() {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as c FROM transactions WHERE synced_to_gsheet = 0`).get() as { c: number };
  return row.c;
}

export async function POST() {
  await ensureInit();
  const result = await pushUnsyncedToGSheet();
  return NextResponse.json({ ...result, pending: getPendingCount() });
}

export async function GET() {
  await ensureInit();
  return NextResponse.json({ pending: getPendingCount() });
}

// PUT /api/gsheet-sync — reset all synced flags so everything re-syncs
export async function PUT() {
  await ensureInit();
  const db = getDb();
  const { changes } = db.prepare(`UPDATE transactions SET synced_to_gsheet = 0`).run();
  return NextResponse.json({ reset: changes, pending: changes });
}
