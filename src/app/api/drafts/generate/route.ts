import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateArticle, generateImage } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { draftId, personaId, regenerateText, regenerateImage, customImagePrompt } = body;

    if (!draftId) {
      return NextResponse.json({ error: 'Missing draftId' }, { status: 400 });
    }

    const draft = await db.getDraftById(draftId);
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    let updatedTitle = draft.title;
    let updatedContent = draft.content;
    let updatedImagePrompt = draft.imagePrompt || '';
    let updatedImageUrl = draft.imageUrl || '';
    let targetPersonaId = personaId || draft.personaId;

    // 1. Regenerate Text
    if (regenerateText) {
      const personas = await db.getPersonas();
      const persona = personas.find(p => p.id === targetPersonaId) || personas[0];
      if (!persona) {
        return NextResponse.json({ error: 'No persona selected or found' }, { status: 400 });
      }

      const rewritten = await generateArticle(
        draft.originalTitle,
        draft.content, // use current rewritten or original content
        persona.instructions
      );

      updatedTitle = rewritten.title;
      updatedContent = rewritten.content;
      updatedImagePrompt = rewritten.imagePrompt;
      targetPersonaId = persona.id;
    }

    // Update Text first in DB to get correct data
    let updatedDraft = await db.updateDraft(draftId, {
      title: updatedTitle,
      content: updatedContent,
      imagePrompt: updatedImagePrompt,
      personaId: targetPersonaId
    });

    // 2. Regenerate Image
    if (regenerateImage || customImagePrompt) {
      const finalPrompt = customImagePrompt || updatedImagePrompt;
      if (!finalPrompt) {
        return NextResponse.json({ error: 'No image prompt available' }, { status: 400 });
      }

      const newImageUrl = await generateImage(finalPrompt, draftId);
      updatedImageUrl = newImageUrl;

      updatedDraft = await db.updateDraft(draftId, {
        imageUrl: updatedImageUrl,
        imagePrompt: finalPrompt // Save custom prompt if used
      });
    }

    return NextResponse.json({
      success: true,
      message: 'ปรับปรุงบทร่างสำเร็จ',
      draft: updatedDraft
    });
  } catch (error: any) {
    console.error('API generate error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดการปรับปรุงร่างข่าว' }, { status: 500 });
  }
}
