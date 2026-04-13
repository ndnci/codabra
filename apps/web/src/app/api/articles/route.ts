import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { articles } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  const data = await db.select().from(articles);
  return NextResponse.json(data);
}

export async function POST(_req: NextRequest) {
  const userId = getAuthUser(_req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await _req.json() as Record<string, unknown>;
  if (!body.title || String(body.title).trim() === '') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  const data = await db.insert(articles).values({ title: body.title as string, body: body.body as string }).returning().then((r) => r[0]);
  return NextResponse.json(data, { status: 201 });
}
