import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateArticleFromIdea, generateImage } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idea, personaId } = body;

    if (!idea) {
      return NextResponse.json({ error: 'กรุณากรอกไอเดียหรือประเด็นข่าวด่วน' }, { status: 400 });
    }

    const personas = await db.getPersonas();
    const persona = personas.find(p => p.id === personaId) || personas.find(p => p.isDefault) || personas[0];

    if (!persona) {
      return NextResponse.json({ error: 'ไม่พบบุคลิกการเขียนในระบบ' }, { status: 400 });
    }

    // 1. Generate article using Gemini with Google Search grounding
    const rewritten = await generateArticleFromIdea(idea, persona.instructions);

    // 2. Save Draft to DB
    const draft = await db.createDraft({
      title: rewritten.title,
      originalTitle: idea,
      originalUrl: null,
      originalSource: 'Idea Prompt',
      content: rewritten.content,
      imagePrompt: rewritten.imagePrompt,
      status: 'DRAFT',
      personaId: persona.id,
      curatorReason: 'เขียนขึ้นโดย AI จากแนวคิดไอเดียและสืบค้นข้อมูลล่าสุดในอินเทอร์เน็ต'
    });

    // 3. Generate Image
    const imageUrl = await generateImage(rewritten.imagePrompt, draft.id);
    const updatedDraft = await db.updateDraft(draft.id, { imageUrl });

    return NextResponse.json({
      success: true,
      message: 'สร้างร่างข่าวใหม่จากไอเดียสำเร็จ!',
      draft: updatedDraft
    });
  } catch (error: any) {
    console.error('Generate from idea API error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการสร้างข่าวจากไอเดีย' }, { status: 500 });
  }
}
