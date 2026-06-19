import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.trim() === '') {
      return NextResponse.json({ success: true, items: [] });
    }

    const parser = new Parser();
    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=th&gl=TH&ceid=TH:th`;
    
    const feed = await parser.parseURL(feedUrl);
    
    // Map feed items to a clean structured response
    const items = (feed.items || []).slice(0, 10).map(item => {
      // Clean source name
      let sourceName = 'Google News';
      if (item.source && typeof item.source === 'object') {
        sourceName = (item.source as any)._ || sourceName;
      } else if (item.creator) {
        sourceName = item.creator;
      } else {
        const sourceMatch = item.title?.match(/ - ([^-]+)$/);
        if (sourceMatch) {
          sourceName = sourceMatch[1].trim();
        }
      }

      // Clean title (remove source suffix if present)
      const cleanTitle = item.title ? item.title.replace(/ - [^-]+$/, '').trim() : 'ไม่มีหัวข้อข่าว';

      return {
        title: cleanTitle,
        link: item.link || '',
        pubDate: item.pubDate || '',
        snippet: item.contentSnippet || item.content || '',
        source: sourceName
      };
    });

    return NextResponse.json({
      success: true,
      items
    });
  } catch (error: any) {
    console.error('Search news API error:', error);
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการสืบค้นข้อมูลข่าวสาร' }, { status: 500 });
  }
}
