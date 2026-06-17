import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateArticle, generateImage } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, personaId } = body;

    if (!url) {
      return NextResponse.json({ error: 'กรุณากรอก URL ลิงก์ข่าวสาร' }, { status: 400 });
    }

    const personas = await db.getPersonas();
    const persona = personas.find(p => p.id === personaId) || personas.find(p => p.isDefault) || personas[0];

    if (!persona) {
      return NextResponse.json({ error: 'ไม่พบบุคลิกการเขียนในระบบ' }, { status: 400 });
    }

    let originalTitle = 'ข่าวสารจาก URL';
    let originalContent = '';

    // If APP_MODE is mock, we can generate a mock article based on the domain name to simulate instantly
    const isMock = process.env.APP_MODE === 'mock';
    if (isMock) {
      const urlObj = new URL(url);
      originalTitle = `ประเด็นด่วนจาก ${urlObj.hostname}`;
      originalContent = `บทร่างนี้เจเนอเรตโดยอ้างอิงจากข้อมูลข่าวสารที่เผยแพร่อยู่บนเว็บไซต์ ${url} เกี่ยวกับการอัปเดตระบบในอุตสาหกรรมเทคโนโลยีสารสนเทศ การปรับปรุงฟังก์ชันการใช้งาน และสถิติเชิงบวก`;
    } else {
      try {
        // Fetch raw HTML from news site
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`ไม่สามารถดึงข้อมูลเว็บได้ (HTTP ${response.status})`);
        }

        const html = await response.text();

        // 1. Extract HTML Title
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          originalTitle = titleMatch[1].replace(/ - [^-]+$/g, '').trim();
        }

        // 2. Strip scripts, styles, navs, footers to extract clean text
        const cleanHtml = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
          .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');

        // Extract raw text
        originalContent = cleanHtml
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000); // Cap size for prompt token efficiency

        if (originalContent.length < 50) {
          throw new Error('เนื้อหาเว็บสั้นเกินไปหรืออาจถูกป้องกันบอท');
        }
      } catch (fetchErr: any) {
        console.error('Fetch HTML error, falling back to URL metadata:', fetchErr);
        // Fallback: ask Gemini to write based on the URL name
        originalTitle = `บทความแนะนำข่าวจากลิงก์: ${url}`;
        originalContent = `เนื้อหาอ้างอิงจากเว็บหลัก ${url} ซึ่งนำเสนอเกี่ยวกับข่าวสารเทคโนโลยีปัจจุบันและการเปลี่ยนแปลงล่าสุด`;
      }
    }

    // 3. Rewrite using Gemini
    const rewritten = await generateArticle(
      originalTitle,
      originalContent,
      persona.instructions
    );

    // 4. Save to Database
    const draft = await db.createDraft({
      title: rewritten.title,
      originalTitle: originalTitle,
      originalUrl: url,
      originalSource: new URL(url).hostname,
      content: rewritten.content,
      imagePrompt: rewritten.imagePrompt,
      status: 'DRAFT',
      personaId: persona.id
    });

    // 5. Generate image
    const imageUrl = await generateImage(rewritten.imagePrompt, draft.id);
    const updatedDraft = await db.updateDraft(draft.id, { imageUrl });

    return NextResponse.json({
      success: true,
      message: 'ดึงข้อมูลจากลิงก์เว็บและสร้างร่างข่าวใหม่สำเร็จ!',
      draft: updatedDraft
    });
  } catch (error: any) {
    console.error('Craft link API error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจากลิงก์' }, { status: 500 });
  }
}
