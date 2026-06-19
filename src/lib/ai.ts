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
  const isMock = !key || key === 'YOUR_GEMINI_API_KEY_HERE' || key.trim() === '';

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

กรุณาเขียนบทความใหม่เป็นภาษาไทยที่มีความดึงดูด น่าอ่าน โดยจัดรูปแบบให้อ่านง่าย:
- มีการเว้นย่อหน้าอย่างสม่ำเสมอ (ความยาว 3-4 ย่อหน้า)
- ใช้ Emoji ประกอบในจุดสำคัญหรือหัวข้อย่อเพื่อให้น่าอ่านและสะดุดสายตา
- มีการสรุปประเด็นหลักและผลกระทบของข่าวให้ชัดเจน
- หากแหล่งข่าวต้นฉบับเป็นภาษาอังกฤษหรือภาษาอื่นใด ให้แปลและสรุปเป็นภาษาไทยโดยสมบูรณ์

นอกจากนี้ ให้เขียน Prompt ภาษาอังกฤษที่มีความละเอียดสูง สำหรับส่งไปเจเนอเรตรูปภาพประกอบข่าวชิ้นนี้ผ่าน AI (Imagen 3) โดยเน้นสไตล์ภาพข่าวแบบพรีเมียม (Premium editorial photojournalism, detailed realistic photography, cinematic lighting, sharp focus, 8k resolution, suitable for news banner) และหลีกเลี่ยงข้อความสะกดผิดบนภาพ

ผลลัพธ์ที่ต้องการต้องเป็นรูปแบบ JSON ตามโครงสร้างนี้:
{
  "title": "หัวข้อข่าวใหม่ที่ดึงดูดกระชับในภาษาไทย (สามารถใส่ Emoji ได้)",
  "content": "เนื้อหาข่าวที่เรียบเรียงใหม่เป็นภาษาไทยพร้อมย่อหน้าและ Emoji",
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
  } catch (error: any) {
    console.error('Error generating article via Gemini:', error);
    
    const isQuotaError = error.status === 429 || 
      (error.message && (
        error.message.includes('quota') || 
        error.message.includes('Quota') || 
        error.message.includes('429') || 
        error.message.includes('RESOURCE_EXHAUSTED') ||
        error.message.includes('limit')
      ));
      
    if (isQuotaError) {
      console.warn('Gemini quota exceeded or rate limited. Falling back to mock translation/rewriting.');
      return {
        title: `สรุปประเด็นร้อน: ${originalTitle} (เขียนโดย AI สำรองเนื่องจากโควตาเต็ม)`,
        content: `นี่คือเนื้อความข่าวที่แปลและเรียบเรียงขึ้นชั่วคราวเนื่องจากคีย์ Gemini Free Tier ของคุณหมดโควตารายวัน (จำกัดที่ 20 ครั้งต่อวัน)\n\nข่าวสารต้นฉบับเรื่อง: "${originalTitle}"\n\nเนื้อความบางส่วน: ${originalContent.substring(0, 400)}...\n\n(หากต้องการให้ AI แปลและเขียนข่าววิเคราะห์แบบเต็มรูปแบบ แนะนำให้ตรวจสอบโควตาของคีย์ หรือใช้คีย์ที่เป็นเวอร์ชันจ่ายเงินในหน้ารายละเอียดการตั้งค่า)`,
        imagePrompt: "A sleek modern office space with computer monitors displaying data visualization, technology background, editorial photography"
      };
    }
    
    throw error;
  }
}

/**
 * Generates an image using Imagen 3 and saves it to the public directory.
 * Returns the public image path (e.g. "/generated-images/[draftId].jpg").
 */
export async function generateImage(prompt: string, draftId: string): Promise<string> {
  const key = await getGeminiApiKey();
  const isMock = !key || key === 'YOUR_GEMINI_API_KEY_HERE' || key.trim() === '';

  const categories = {
    code: [
      'https://images.unsplash.com/photo-1607799279861-4dd421887fb3',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
      'https://images.unsplash.com/photo-1542831371-29b0f74f9713',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97'
    ],
    security: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3',
      'https://images.unsplash.com/photo-1614064641938-3bbee52942c7',
      'https://images.unsplash.com/photo-1593508512255-86ab42a8e620',
      'https://images.unsplash.com/photo-1601597111158-2fceff270190'
    ],
    network: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31',
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8',
      'https://images.unsplash.com/photo-1597852074816-d933c7d2b988'
    ],
    chip: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1',
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31'
    ],
    business: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
      'https://images.unsplash.com/photo-1497366216548-37526070297c',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c'
    ],
    finance: [
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f',
      'https://images.unsplash.com/photo-1518546305927-5a555bb7020d',
      'https://images.unsplash.com/photo-1621761191319-c6fb62004040',
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3'
    ],
    mobile: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
      'https://images.unsplash.com/photo-1565849906660-bf4b4e295f23',
      'https://images.unsplash.com/photo-1546054454-aa26e2b734c7',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505'
    ],
    generic: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b',
      'https://images.unsplash.com/photo-1547082299-de196ea013d6',
      'https://images.unsplash.com/photo-1535378917042-10a22c95931a'
    ]
  };

  const getUnsplashPhoto = (searchPrompt: string): string => {
    const lowerPrompt = searchPrompt.toLowerCase();
    let pool = categories.generic;

    if (lowerPrompt.includes('code') || lowerPrompt.includes('programming') || lowerPrompt.includes('software') || lowerPrompt.includes('developer')) {
      pool = categories.code;
    } else if (lowerPrompt.includes('security') || lowerPrompt.includes('cyber') || lowerPrompt.includes('hacker') || lowerPrompt.includes('lock')) {
      pool = categories.security;
    } else if (lowerPrompt.includes('network') || lowerPrompt.includes('cloud') || lowerPrompt.includes('server') || lowerPrompt.includes('data center')) {
      pool = categories.network;
    } else if (lowerPrompt.includes('chip') || lowerPrompt.includes('processor') || lowerPrompt.includes('semiconductor') || lowerPrompt.includes('circuit')) {
      pool = categories.chip;
    } else if (lowerPrompt.includes('business') || lowerPrompt.includes('meeting') || lowerPrompt.includes('office') || lowerPrompt.includes('corp')) {
      pool = categories.business;
    } else if (lowerPrompt.includes('finance') || lowerPrompt.includes('money') || lowerPrompt.includes('crypto') || lowerPrompt.includes('bitcoin') || lowerPrompt.includes('stock') || lowerPrompt.includes('investment') || lowerPrompt.includes('การเงิน') || lowerPrompt.includes('หุ้น')) {
      pool = categories.finance;
    } else if (lowerPrompt.includes('phone') || lowerPrompt.includes('mobile') || lowerPrompt.includes('gadget') || lowerPrompt.includes('tablet') || lowerPrompt.includes('speaker') || lowerPrompt.includes('nest') || lowerPrompt.includes('watch') || lowerPrompt.includes('มือถือ') || lowerPrompt.includes('สมาร์ทโฟน')) {
      pool = categories.mobile;
    }

    const randomUrl = pool[Math.floor(Math.random() * pool.length)];
    return `${randomUrl}?w=800&auto=format&fit=crop&q=60&sig=${Math.random().toString(36).substring(7)}`;
  };

  if (isMock) {
    return getUnsplashPhoto(prompt);
  }

  const ai = new GoogleGenAI({ apiKey: key });

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
    return getUnsplashPhoto(prompt);
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
  const isMock = !key || key === 'YOUR_GEMINI_API_KEY_HERE' || key.trim() === '';

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

/**
 * Generates a news article from a short idea or keyword using Gemini with Google Search grounding.
 */
export async function generateArticleFromIdea(
  idea: string,
  personaInstructions: string
): Promise<GeneratedArticle> {
  const key = await getGeminiApiKey();
  const isMock = !key || key === 'YOUR_GEMINI_API_KEY_HERE' || key.trim() === '';

  if (isMock) {
    return {
      title: `สรุปประเด็นร้อน: ${idea} (เขียนโดย AI จำลองจากไอเดีย)`,
      content: `นี่คือเนื้อหาข่าวที่ระบบจำลองขึ้นตามแนวคิดของคุณเรื่อง "${idea}" \n\nประเด็นนี้เป็นที่วิพากษ์วิจารณ์อย่างกว้างขวางในสัปดาห์นี้ โดยมีมุมมองจากนักวิเคราะห์ที่มองว่ามีความสำคัญอย่างยิ่งต่อการปรับตัวของตลาดและอุตสาหกรรมในภาพรวม การก้าวข้ามข้อจำกัดและเพิ่มนวัตกรรมใหม่ๆ จะเป็นหัวใจสำคัญในขั้นต่อไป`,
      imagePrompt: "A symbolic concept of creative ideas and technology innovation, glowing lights and data structures, editorial style, photography"
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `คุณคือบรรณาธิการข่าวและนักเขียนข่าวอัจฉริยะ 
กรุณาสืบค้นข้อมูลล่าสุดเกี่ยวกับหัวข้อ/ประเด็นต่อไปนี้:
"${idea}"

จากนั้นนำข้อมูลที่ค้นพบมาวิเคราะห์และเขียนบทความข่าวใหม่เป็นภาษาไทยให้อยู่ในสไตล์/บุคลิกต่อไปนี้อย่างเคร่งครัด:
"${personaInstructions}"

กรุณาเขียนบทความใหม่เป็นภาษาไทยที่มีความดึงดูด น่าอ่าน โดยจัดรูปแบบให้อ่านง่าย:
- มีการเว้นย่อหน้าอย่างสม่ำเสมอ (ความยาว 3-4 ย่อหน้า)
- ใช้ Emoji ประกอบในจุดสำคัญหรือหัวข้อย่อเพื่อให้น่าอ่านและสะดุดสายตา
- มีการสรุปประเด็นหลักและผลกระทบของข่าวให้ชัดเจน

นอกจากนี้ ให้เขียน Prompt ภาษาอังกฤษที่มีความละเอียดสูง สำหรับส่งไปเจเนอเรตรูปภาพประกอบข่าวชิ้นนี้ผ่าน AI (Imagen 3) โดยเน้นสไตล์ภาพข่าวแบบพรีเมียม (Premium editorial photojournalism, detailed realistic photography, cinematic lighting, sharp focus, 8k resolution, suitable for news banner) และหลีกเลี่ยงข้อความสะกดผิดบนภาพ

ผลลัพธ์ที่ต้องการต้องเป็นรูปแบบ JSON ตามโครงสร้างนี้:
{
  "title": "หัวข้อข่าวใหม่ที่ดึงดูดกระชับในภาษาไทย (สามารถใส่ Emoji ได้)",
  "content": "เนื้อหาข่าวที่เรียบเรียงใหม่เป็นภาษาไทยพร้อมย่อหน้าและ Emoji",
  "imagePrompt": "English image generation prompt for Imagen 3"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search grounding!
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
  } catch (error: any) {
    console.error('Error generating article from idea via Gemini:', error);
    
    const isQuotaError = error.status === 429 || 
      (error.message && (
        error.message.includes('quota') || 
        error.message.includes('Quota') || 
        error.message.includes('429') || 
        error.message.includes('RESOURCE_EXHAUSTED') ||
        error.message.includes('limit')
      ));
      
    if (isQuotaError) {
      console.warn('Gemini quota exceeded. Falling back to mock generation for idea.');
      return {
        title: `สรุปประเด็นร้อน: ${idea} (เขียนโดย AI สำรองเนื่องจากโควตาเต็ม)`,
        content: `นี่คือเนื้อความข่าวที่เขียนขึ้นชั่วคราวเนื่องจากคีย์ Gemini ของคุณหมดโควตารายวัน (จำกัดที่ 20 ครั้งต่อวัน)\n\nประเด็นไอเดียของคุณเรื่อง: "${idea}"\n\n(หากต้องการให้ AI ค้นหาอินเทอร์เน็ตจริงและวิเคราะห์เขียนข่าวแบบเต็มรูปแบบ แนะนำให้ตรวจสอบโควตาของคีย์ หรือใช้คีย์ที่เป็นเวอร์ชันจ่ายเงินในหน้ารายละเอียดการตั้งค่า)`,
        imagePrompt: "A symbolic concept of creative ideas and technology innovation, glowing lights and data structures, editorial style, photography"
      };
    }
    
    throw error;
  }
}
