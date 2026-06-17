import { NextResponse } from 'next/server';
import { publishDraft } from '@/lib/publisher';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { draftId, platformIds } = body;

    if (!draftId || !platformIds || !Array.isArray(platformIds) || platformIds.length === 0) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน (ต้องการ draftId และ platformIds)' }, { status: 400 });
    }

    const result = await publishDraft(draftId, platformIds);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'เผยแพร่ข่าวสำเร็จ!' : 'การเผยแพร่ข่าวบางช่องทางล้มเหลว',
      results: result.results
    });
  } catch (error: any) {
    console.error('API publish error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการเผยแพร่ข่าว' }, { status: 500 });
  }
}
