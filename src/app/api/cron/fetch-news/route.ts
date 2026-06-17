import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { db } from '@/lib/db';
import { generateArticle, generateImage } from '@/lib/ai';
import { publishDraft } from '@/lib/publisher';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const manual = searchParams.get('manual') === 'true';

  try {
    const sources = await db.getSources();
    const activeSources = sources.filter(s => s.isActive);
    const personas = await db.getPersonas();
    const defaultPersona = personas.find(p => p.isDefault) || personas[0];

    if (!defaultPersona) {
      return NextResponse.json({ error: 'No writing personas found. Please create one in Settings.' }, { status: 400 });
    }

    const parser = new Parser();
    const createdDrafts = [];
    const existingDrafts = await db.getDrafts();
    const existingUrls = new Set(existingDrafts.map(d => d.originalUrl).filter(Boolean));

    // Cap the number of items processed per run to prevent API quota exhaustion (e.g., max 2 per run)
    const maxItemsPerSource = manual ? 3 : 1; 

    for (const source of activeSources) {
      if (source.type === 'RSS' && source.url) {
        try {
          const feed = await parser.parseURL(source.url);
          let processedCount = 0;

          for (const item of feed.items) {
            if (processedCount >= maxItemsPerSource) break;

            const itemUrl = item.link || '';
            if (!itemUrl || existingUrls.has(itemUrl)) continue;

            const originalTitle = item.title || 'ไม่มีหัวข้อข่าว';
            const originalContent = item.contentSnippet || item.content || '';

            // 1. Generate rewritten article with Gemini
            const rewritten = await generateArticle(
              originalTitle,
              originalContent,
              defaultPersona.instructions
            );

            // 2. Save Draft to DB first (status DRAFT or PENDING_IMAGE)
            const draft = await db.createDraft({
              title: rewritten.title,
              originalTitle: originalTitle,
              originalUrl: itemUrl,
              originalSource: source.name,
              content: rewritten.content,
              imagePrompt: rewritten.imagePrompt,
              status: 'DRAFT',
              sourceId: source.id,
              personaId: defaultPersona.id
            });

            // 3. Generate Image using Imagen 3 based on imagePrompt
            const imageUrl = await generateImage(rewritten.imagePrompt, draft.id);
            
            // Update draft with image URL
            const updatedDraft = await db.updateDraft(draft.id, { imageUrl });

            // 4. If Auto-Post is enabled for this source, post immediately!
            if (source.autoPost) {
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
              source: source.name,
              autoPosted: source.autoPost
            });

            processedCount++;
          }
        } catch (feedErr) {
          console.error(`Failed parsing feed ${source.name}:`, feedErr);
        }
      } else {
        // Other types (Google Search, Web scrapers, Social search)
        // For Mock / simpler implementation, we can simulate fetching a custom keyword query news
        // if user triggers manually.
        if (manual && source.query) {
          const mockTitle = `ข่าวเด่นด่วนเกี่ยวกับ: ${source.query}`;
          const mockContent = `ความคืบหน้าล่าสุดเกี่ยวกับการค้นหาข้อมูลของ "${source.query}" ในอุตสาหกรรมเทคโนโลยี มีรายงานความตื่นตัวและการอภิปรายในวงกว้างในสัปดาห์นี้`;
          
          if (!existingDrafts.some(d => d.originalTitle === mockTitle)) {
            const rewritten = await generateArticle(mockTitle, mockContent, defaultPersona.instructions);
            const draft = await db.createDraft({
              title: rewritten.title,
              originalTitle: mockTitle,
              originalUrl: `https://mocknews.com/search?q=${encodeURIComponent(source.query)}`,
              originalSource: source.name,
              content: rewritten.content,
              imagePrompt: rewritten.imagePrompt,
              status: 'DRAFT',
              sourceId: source.id,
              personaId: defaultPersona.id
            });

            const imageUrl = await generateImage(rewritten.imagePrompt, draft.id);
            const updatedDraft = await db.updateDraft(draft.id, { imageUrl });

            createdDrafts.push({
              id: updatedDraft.id,
              title: updatedDraft.title,
              source: source.name,
              autoPosted: false
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `ดึงข้อมูลสำเร็จ ร่างข่าวใหม่ทั้งหมด ${createdDrafts.length} ข่าว`,
      drafts: createdDrafts
    });
  } catch (error: any) {
    console.error('Fetch news cron error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการดึงข่าว' }, { status: 500 });
  }
}
