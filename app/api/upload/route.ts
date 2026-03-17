import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  await ensureInit();

  const form = await req.formData();
  const file = form.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const date = new Date().toISOString().slice(0, 10);
  const slug = Math.random().toString(36).slice(2, 8);
  const filename = `${date}-${slug}.${ext}`;

  const receiptsDir = path.resolve(process.cwd(), 'data/receipts');
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  const bytes = await file.arrayBuffer();
  fs.writeFileSync(path.join(receiptsDir, filename), Buffer.from(bytes));

  return NextResponse.json({ filename });
}
