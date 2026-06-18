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

  try {
    const ai = new GoogleGenAI({ apiKey: key });
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
    if (!base64Bytes) throw new Error('No image bytes returned from Imagen 3');

    return `data:image/jpeg;base64,${base64Bytes}`;
  } catch (error: any) {
    console.error('Error generating image via Imagen:', error);
    let msg = error?.message || String(error);
    
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const list = await ai.models.list();
      const imageModels = list
        .filter(m => m.name?.toLowerCase().includes('image') || m.name?.toLowerCase().includes('imagen'))
        .map(m => m.name?.replace('models/', ''))
        .join(', ');
      if (imageModels) {
        msg += ` | Available: ${imageModels}`;
      }
    } catch (listErr: any) {
      msg += ` | List error: ${listErr?.message || String(listErr)}`;
    }

    // Keep clean ASCII characters to prevent XML parsing issues in SVG
    const cleanedMsg = msg.replace(/[^a-zA-Z0-9\s:().,_\-\[\]|]/g, ' ').substring(0, 150);
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="100%" height="100%" fill="%231a1a1a"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23e74c3c" font-family="sans-serif" font-weight="bold" font-size="20">Image Generation Failed</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="sans-serif" font-size="10">${cleanedMsg}</text></svg>`;
  }
}
