import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest) {
  const data = await db.select().from(users);
  return NextResponse.json(data);
}

export async function POST(_req: NextRequest) {
  const body = await _req.json() as Record<string, unknown>;
  if (!body.email || String(body.email).trim() === '') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    return NextResponse.json({ error: 'email must be a valid email' }, { status: 400 });
  }
  if (!body.name || String(body.name).trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const data = await db.insert(users).values({ email: body.email as string, name: body.name as string }).returning().then((r) => r[0]);
  return NextResponse.json(data, { status: 201 });
}
