import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const socials = await db.getSocialAccounts();
    return NextResponse.json(socials);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing social account ID' }, { status: 400 });
    }

    const social = await db.updateSocialAccount(id, data);
    return NextResponse.json(social);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
