import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { getGeminiApiKey } from './db';

export interface GeneratedArticle {
  title: string;
  content: string;
  imagePrompt: string;
}

/**
 * Rewrites a news article using Gemini based on a specific persona instructions.
 */
export async function generateArticle(
  originalTitle: string,
  originalContent: string,
  personaInstructions: string
): Promise<GeneratedArticle> {
  const key = await getGeminiApiKey();
  const isMock = process.env.APP_MODE === 'mock' || !key || key === 'YOUR_GEMINI_API_KEY_HERE';

  if (isMock) {
    // Return realistic mock rewritten news in Thai
    const mockTopics = [
      {
        title: `สรุปประเด็นร้อน: ${originalTitle} (เขียนโดย AI จำลอง)`,
        content: `นี่คือเนื้อหาข่าวที่ถูกเรียบเรียงขึ้นใหม่สไตล์คุณตามรายงานข่าวเรื่อง "${originalTitle}" \n\nประเด็นสำคัญของเรื่องนี้คือ เทคโนโลยีมีการอัปเดตใหม่อย่างมีนัยสำคัญ ซึ่งจะช่วยเพิ่มประสิทธิภาพการทำงานได้มากถึง 40% และลดความผิดพลาดลงอย่างเห็นได้ชัด ผู้เชี่ยวชาญคาดการณ์ว่าระบบนี้จะเป็นมาตรฐานใหม่ในวงการอุตสาหกรรมในอีก 3-6 เดือนข้างหน้า\n\nอย่างไรก็ตาม ผู้ใช้งานยังต้องคอยติดตามอัปเดตและปรับตัวเนื่องจากการตั้งค่าและการเชื่อมโยงข้อมูลยังมีบางส่วนที่ซับซ้อนอยู่`,
        imagePrompt: "A sleek workspace with modern computers showing data charts and artificial intelligence symbols, minimalist editorial style, photography"
      }
    ];
    return mockTopics[0];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `คุณคือบรรณาธิการข่าวและนักเขียนข่าวอัจฉริยะ 
กรุณาเรียบเรียงข่าวเรื่องนี้ใหม่ให้อยู่ในสไตล์/บุคลิกต่อไปนี้อย่างเคร่งครัด:
"${personaInstructions}"

รายละเอียดข่าวต้นฉบับ:
หัวข้อข่าว: ${originalTitle}
เนื้อหาข่าว: ${originalContent}

กรุณาเขียนบทความใหม่เป็นภาษาไทยที่มีความดึงดูด น่าอ่าน และสร้างสรรค์ตามบุคลิกที่ระบุ 
นอกจากนี้ ให้เขียน Prompt ภาษาอังกฤษสำหรับส่งไปเจเนอเรตรูปภาพประกอบข่าวชิ้นนี้ผ่าน AI (Imagen 3) โดยเน้นสไตล์ภาพข่าวแบบพรีเมียม (Premium Editorial Editorial photography) และตรงกับเนื้อหาข่าว

ผลลัพธ์ที่ต้องการต้องเป็นรูปแบบ JSON ตามโครงสร้างนี้:
{
  "title": "หัวข้อข่าวใหม่ที่ดึงดูดในภาษาไทย",
  "content": "เนื้อหาข่าวทั้งหมดที่เรียบเรียงใหม่เป็นภาษาไทย (ความยาว 3-5 ย่อหน้า)",
  "imagePrompt": "English image generation prompt for Imagen 3"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            content: { type: 'STRING' },
            imagePrompt: { type: 'STRING' }
          },
          required: ['title', 'content', 'imagePrompt']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');
    
    return JSON.parse(text) as GeneratedArticle;
  } catch (error) {
    console.error('Error generating article via Gemini:', error);
    throw error;
  }
}

/**
 * Generates an image using Imagen 3 and saves it to the public directory.
 * Returns the public image path (e.g. "/generated-images/[draftId].jpg").
 */
export async function generateImage(prompt: string, draftId: string): Promise<string> {
  const key = await getGeminiApiKey();
  const isMock = process.env.APP_MODE === 'mock' || !key || key === 'YOUR_GEMINI_API_KEY_HERE';

  if (isMock) {
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
  }

  const ai = new GoogleGenAI({ apiKey: key });
  let lastError: any = null;

  // 1. Try Imagen 3 first
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      }
    });

    const base64Bytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64Bytes) {
      return `data:image/jpeg;base64,${base64Bytes}`;
    }
  } catch (err: any) {
    console.warn('Imagen 3 failed, trying Gemini Flash Image...', err);
    lastError = err;
  }

  // 2. Try Gemini 2.5 Flash Image fallback
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      }
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.find((p: any) => p.inlineData);
    const base64Bytes = part?.inlineData?.data;
    if (base64Bytes) {
      return `data:image/jpeg;base64,${base64Bytes}`;
    }
    throw new Error('No image returned from Gemini Flash Image');
  } catch (err: any) {
    console.error('Gemini Flash Image also failed, using Unsplash fallback:', err);
    
    // Curated high-quality tech/business stock photos
    const fallbackUrls = [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80', // Tech Circuit board
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80', // Matrix/Binary code
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80', // Network sphere
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80', // Cybersecurity/Lock
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80', // Business tech
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&auto=format&fit=crop&q=80'  // Generic clean tech
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    let selectedUrl = fallbackUrls[5]; // default generic tech
    
    if (lowerPrompt.includes('code') || lowerPrompt.includes('programming') || lowerPrompt.includes('software') || lowerPrompt.includes('developer')) {
      selectedUrl = fallbackUrls[1];
    } else if (lowerPrompt.includes('security') || lowerPrompt.includes('cyber') || lowerPrompt.includes('hacker') || lowerPrompt.includes('lock')) {
      selectedUrl = fallbackUrls[3];
    } else if (lowerPrompt.includes('network') || lowerPrompt.includes('cloud') || lowerPrompt.includes('server') || lowerPrompt.includes('data center')) {
      selectedUrl = fallbackUrls[2];
    } else if (lowerPrompt.includes('chip') || lowerPrompt.includes('processor') || lowerPrompt.includes('semiconductor') || lowerPrompt.includes('circuit')) {
      selectedUrl = fallbackUrls[0];
    } else if (lowerPrompt.includes('business') || lowerPrompt.includes('meeting') || lowerPrompt.includes('office') || lowerPrompt.includes('corp')) {
      selectedUrl = fallbackUrls[4];
    }
    
    return selectedUrl;
  }
}

export interface CandidateArticle {
  title: string;
  snippet: string;
  source: string;
}

export interface CuratedResult {
  selectedIndices: number[];
  reasons: Record<number, string>;
}

/**
 * Uses Gemini to evaluate a list of news candidate stories and selects the top 3 most interesting.
 */
export async function curateNewsArticles(
  articles: CandidateArticle[]
): Promise<CuratedResult> {
  const key = await getGeminiApiKey();
  const isMock = process.env.APP_MODE === 'mock' || !key || key === 'YOUR_GEMINI_API_KEY_HERE';

  if (isMock || articles.length === 0) {
    // Return first 3 items with mock reasons
    const selectedIndices = articles.slice(0, 3).map((_, i) => i);
    const reasons: Record<number, string> = {};
    selectedIndices.forEach(idx => {
      reasons[idx] = `เป็นข่าวที่กำลังได้รับความสนใจอย่างมากในหมวดหมู่ข่าวสารไอทีและนวัตกรรมใหม่ (AI บรรณาธิการจำลอง)`;
    });
    return { selectedIndices, reasons };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Format the articles list for the prompt
    const articlesFormatted = articles.map((art, idx) => {
      return `[ข่าวที่ ${idx}]
แหล่งข่าว: ${art.source}
หัวข้อ: ${art.title}
เนื้อหาสรุป: ${art.snippet}`;
    }).join('\n\n');

    const prompt = `คุณคือ "บรรณาธิการบริหารสูงสุด (Editor-in-Chief)" ของสำนักข่าวด้านเทคโนโลยี ธุรกิจ และนวัตกรรมชั้นนำ
ภารกิจของคุณคือการคัดกรองข่าวดิบและหัวข้อข่าวด้านล่างนี้ทั้งหมด แล้วคัดเลือกข่าวสารที่ "น่าสนใจที่สุด, มีเทรนด์การเข้าชมสูง, และมีผลกระทบต่ออุตสาหกรรมในวงกว้าง" เพียง 3 ข่าวเด่นเท่านั้น (หากจำนวนข่าวน้อยกว่า 3 ข่าว ให้เลือกมาทั้งหมดที่มี)

นี่คือรายการข่าวสารทั้งหมดที่มีให้พิจารณา:
${articlesFormatted}

กรุณาประเมินและคัดเลือกข่าวที่สมควรนำมาเรียบเรียงเขียนใหม่ และระบุเหตุผลสั้นๆ (ภาษาไทย ไม่เกิน 1-2 ประโยค) ว่าทำไมข่าวนี้ถึงได้รับเลือกและน่าสนใจอย่างไร

ผลลัพธ์ที่ต้องการต้องอยู่ในรูปแบบ JSON ตามโครงสร้างนี้:
{
  "selected": [
    {
      "index": 0,
      "reason": "ระบุเหตุผลสั้นๆ ในภาษาไทย เช่น: เป็นเมกะดีลสำคัญที่จะขับเคลื่อนการเติบโตของเทคโนโลยีคลาวด์ในเอเชีย"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            selected: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  index: { type: 'INTEGER' },
                  reason: { type: 'STRING' }
                },
                required: ['index', 'reason']
              }
            }
          },
          required: ['selected']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini curator');
    
    const parsed = JSON.parse(text);
    const selectedIndices: number[] = [];
    const reasons: Record<number, string> = {};

    if (parsed.selected && Array.isArray(parsed.selected)) {
      parsed.selected.forEach((item: any) => {
        const idx = Number(item.index);
        if (!isNaN(idx) && idx >= 0 && idx < articles.length) {
          selectedIndices.push(idx);
          reasons[idx] = item.reason;
        }
      });
    }

    // fallback if selection is empty
    if (selectedIndices.length === 0) {
      const fallbackIndices = articles.slice(0, 3).map((_, i) => i);
      const fallbackReasons: Record<number, string> = {};
      fallbackIndices.forEach(idx => {
        fallbackReasons[idx] = 'ได้รับเลือกจากการคัดกรองอัตโนมัติ (ข่าวด่วนน่าสนใจ)';
      });
      return { selectedIndices: fallbackIndices, reasons: fallbackReasons };
    }

    return { selectedIndices, reasons };
  } catch (error) {
    console.error('Error curating news articles via Gemini:', error);
    // Fallback: return top 3 items
    const selectedIndices = articles.slice(0, 3).map((_, i) => i);
    const reasons: Record<number, string> = {};
    selectedIndices.forEach(idx => {
      reasons[idx] = 'ได้รับเลือกจากการคัดกรองอัตโนมัติ (Fallbackเนื่องจากการเรียกวิเคราะห์ขัดข้อง)';
    });
    return { selectedIndices, reasons };
  }
}
