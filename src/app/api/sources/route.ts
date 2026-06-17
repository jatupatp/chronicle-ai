import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const sources = await db.getSources();
    return NextResponse.json(sources);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, url, query, autoPost } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'ชื่อและประเภทแหล่งข่าวจำเป็นต้องระบุ' }, { status: 400 });
    }

    const source = await db.createSource({ name, type, url, query, autoPost });
    return NextResponse.json(source);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing source ID' }, { status: 400 });
    }

    const source = await db.updateSource(id, data);
    return NextResponse.json(source);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing source ID' }, { status: 400 });
    }

    await db.deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
