import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { db } from '@/lib/db';
import { generateArticle, generateImage, curateNewsArticles } from '@/lib/ai';
import { publishDraft } from '@/lib/publisher';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const manual = searchParams.get('manual') === 'true';
  const sourceId = searchParams.get('sourceId');

  try {
    const sources = await db.getSources();
    let activeSources = sources.filter(s => s.isActive);
    
    if (sourceId && sourceId !== 'all') {
      activeSources = activeSources.filter(s => s.id === sourceId);
    }
    const personas = await db.getPersonas();
    const defaultPersona = personas.find(p => p.isDefault) || personas[0];

    if (!defaultPersona) {
      return NextResponse.json({ error: 'No writing personas found. Please create one in Settings.' }, { status: 400 });
    }

    const parser = new Parser();
    const createdDrafts = [];
    const existingDrafts = await db.getDrafts();
    const existingUrls = new Set(existingDrafts.map(d => d.originalUrl).filter(Boolean));

    // Step 1: Collect candidates from all active sources
    const rawCandidates: any[] = [];
    const maxItemsPerSource = manual ? 4 : 2;

    for (const source of activeSources) {
      if (source.type === 'RSS' && source.url) {
        try {
          const feed = await parser.parseURL(source.url);
          let count = 0;
          for (const item of feed.items) {
            if (count >= maxItemsPerSource) break;
            const itemUrl = item.link || '';
            if (!itemUrl || existingUrls.has(itemUrl)) continue;

            rawCandidates.push({
              originalTitle: item.title || 'ไม่มีหัวข้อข่าว',
              originalContent: item.contentSnippet || item.content || '',
              itemUrl,
              sourceId: source.id,
              sourceName: source.name,
              autoPost: source.autoPost
            });
            count++;
          }
        } catch (feedErr) {
          console.error(`Failed parsing feed ${source.name}:`, feedErr);
        }
      } else {
        // Other types
        if (manual && source.query) {
          const mockTitle = `ข่าวเด่นด่วนเกี่ยวกับ: ${source.query}`;
          const mockContent = `ความคืบหน้าล่าสุดเกี่ยวกับการค้นหาข้อมูลของ "${source.query}" ในอุตสาหกรรมเทคโนโลยี มีรายงานความตื่นตัวและการอภิปรายในวงกว้างในสัปดาห์นี้`;
          
          if (!existingDrafts.some(d => d.originalTitle === mockTitle)) {
            rawCandidates.push({
              originalTitle: mockTitle,
              originalContent: mockContent,
              itemUrl: `https://mocknews.com/search?q=${encodeURIComponent(source.query)}`,
              sourceId: source.id,
              sourceName: source.name,
              autoPost: false
            });
          }
        }
      }
    }

    if (rawCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'ไม่มีข่าวใหม่เพิ่มเติมจากแหล่งข่าวที่กำหนดในขณะนี้',
        drafts: []
      });
    }

    // Step 2: Curation Stage
    const curateInput = rawCandidates.map(c => ({
      title: c.originalTitle,
      snippet: c.originalContent.substring(0, 300),
      source: c.sourceName
    }));

    const { selectedIndices, reasons } = await curateNewsArticles(curateInput);

    // Step 3: Rewrite and create drafts only for selected articles
    for (const idx of selectedIndices) {
      if (idx < 0 || idx >= rawCandidates.length) continue;
      const candidate = rawCandidates[idx];
      const reason = reasons[idx] || 'ได้รับเลือกจากการวิเคราะห์ของกองบรรณาธิการ AI';

      try {
        // 1. Generate rewritten article with Gemini
        const rewritten = await generateArticle(
          candidate.originalTitle,
          candidate.originalContent,
          defaultPersona.instructions
        );

        // 2. Save Draft to DB
        const draft = await db.createDraft({
          title: rewritten.title,
          originalTitle: candidate.originalTitle,
          originalUrl: candidate.itemUrl,
          originalSource: candidate.sourceName,
          content: rewritten.content,
          imagePrompt: rewritten.imagePrompt,
          status: 'DRAFT',
          sourceId: candidate.sourceId,
          personaId: defaultPersona.id,
          curatorReason: reason
        });

        // 3. Generate Image
        const imageUrl = await generateImage(rewritten.imagePrompt, draft.id);
        
        // Update draft with image URL
        const updatedDraft = await db.updateDraft(draft.id, { imageUrl });

        // 4. Auto-post if enabled
        if (candidate.autoPost) {
          const activeSocials = await db.getSocialAccounts();
          const targetPlatformIds = activeSocials.filter(sa => sa.isActive).map(sa => sa.id);
          if (targetPlatformIds.length > 0) {
            try {
              await publishDraft(draft.id, targetPlatformIds);
            } catch (publishErr) {
              console.error(`Auto-posting failed for draft ${draft.id}:`, publishErr);
            }
          }
        }

        createdDrafts.push({
          id: updatedDraft.id,
          title: updatedDraft.title,
          source: candidate.sourceName,
          autoPosted: candidate.autoPost,
          curatorReason: reason
        });
      } catch (genErr) {
        console.error(`Failed generating draft for selected candidate ${candidate.originalTitle}:`, genErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `ดึงข่าวและผ่านคัดเลือกโดย AI สำเร็จทั้งหมด ${createdDrafts.length} ข่าว (จากข่าวดิบทั้งหมด ${rawCandidates.length} ข่าว)`,
      drafts: createdDrafts
    });
  } catch (error: any) {
    console.error('Fetch news cron error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการดึงข่าว' }, { status: 500 });
  }
}
