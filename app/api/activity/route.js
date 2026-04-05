import { NextResponse } from 'next/server';
import { appendFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req) {
  try {
    const entry = await req.json();
    const line = JSON.stringify({
      ts: entry.ts || new Date().toISOString().slice(0, 16).replace('T', ' '),
      cat: entry.cat || 'application',
      label: entry.label,
      detail: entry.detail || ''
    }) + '\n';

    const logPath = join(process.cwd(), '..', 'activity-log.jsonl');
    await appendFile(logPath, line, 'utf-8');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Activity log error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
