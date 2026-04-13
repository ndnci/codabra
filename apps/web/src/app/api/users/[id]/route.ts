import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const data = await db.select().from(users).where(eq(users.id, id)).then((r) => r[0] ?? null);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await _req.json() as Record<string, unknown>;
  const data = await db.update(users).set({ name: body.name as string }).where(eq(users.id, id)).returning().then((r) => r[0]);
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  return NextResponse.json({ success: true });
}
