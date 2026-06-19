import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

const MOCK_DB_FILE = path.join(process.cwd(), 'mock-db.json');

// Types definitions matching Prisma models
export interface NewsSource {
  id: string;
  name: string;
  type: string;
  url: string | null;
  query: string | null;
  isActive: boolean;
  autoPost: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WritingPersona {
  id: string;
  name: string;
  tone: string;
  instructions: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsDraft {
  id: string;
  title: string;
  originalTitle: string;
  originalUrl: string | null;
  originalSource: string | null;
  content: string;
  imageUrl: string | null;
  imagePrompt: string | null;
  status: string; // DRAFT, APPROVED, POSTED, FAILED
  curatorReason: string | null;
  sourceId: string | null;
  personaId: string | null;
  scheduledAt: Date | null;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  persona?: WritingPersona | null;
}

export interface SocialAccount {
  id: string;
  platform: string; // FACEBOOK, TWITTER, INSTAGRAM, TIKTOK, WEBHOOK
  name: string;
  config: string; // JSON String
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostLog {
  id: string;
  draftId: string;
  platform: string;
  status: string;
  externalPostId: string | null;
  errorMessage: string | null;
  postedAt: Date;
}

interface MockDB {
  sources: NewsSource[];
  personas: WritingPersona[];
  drafts: NewsDraft[];
  socialAccounts: SocialAccount[];
  logs: PostLog[];
}

const DEFAULT_DB: MockDB = {
  sources: [
    {
      id: 'src-1',
      name: 'Google News (ไอที)',
      type: 'RSS',
      url: 'https://news.google.com/rss/search?q=technology&hl=th&gl=TH&ceid=TH:th',
      query: null,
      isActive: true,
      autoPost: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'src-2',
      name: 'ไทยรัฐ ไอที',
      type: 'RSS',
      url: 'https://www.thairath.co.th/rss/tech',
      query: null,
      isActive: true,
      autoPost: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  personas: [
    {
      id: 'p-1',
      name: 'วิเคราะห์เจาะลึก',
      tone: 'วิเคราะห์เชิงลึก ให้ความรู้เชิงเทคนิคหรือสถิติที่น่าสนใจ',
      instructions: 'เขียนข่าวในโทนวิเคราะห์ เจาะประเด็นเบื้องลึก อธิบายเหตุและผลอย่างเป็นระบบ อ้างอิงตัวเลขหรือสถิติให้น่าเชื่อถือ',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'p-2',
      name: 'เล่าข่าวสนุก (คุยเป็นกันเอง)',
      tone: 'เป็นกันเอง ภาษาวัยรุ่น สนุกสนาน คุยเหมือนเพื่อนเล่าให้ฟัง',
      instructions: 'เขียนข่าวโดยใช้ภาษาที่เป็นกันเอง สรุปประเด็นเข้าใจง่าย มีความสนุกสนาน ใช้สำนวนกระฉับกระเฉง หลีกเลี่ยงศัพท์ทางการที่ยากเกินไป',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'p-3',
      name: 'สรุปทางการ',
      tone: 'เป็นทางการ รวดเร็ว กระชับ มีความน่าเชื่อถือสูง',
      instructions: 'สรุปข่าวสารอย่างเป็นทางการ ถูกต้อง แม่นยำ เขียนกระชับตรงประเด็น เน้นข้อเท็จจริงสำคัญ ไม่มีอารมณ์ส่วนตัว',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  drafts: [],
  socialAccounts: [
    {
      id: 'sa-1',
      platform: 'FACEBOOK',
      name: 'Facebook Page จำลอง',
      config: '{"pageId":"mock-page-123","accessToken":"mock-token-abc"}',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'sa-2',
      platform: 'TWITTER',
      name: 'X (Twitter) จำลอง',
      config: '{"apiKey":"mock-key","accessToken":"mock-token"}',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'sa-3',
      platform: 'INSTAGRAM',
      name: 'Instagram จำลอง',
      config: '{"pageId":"mock-ig-123"}',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'sa-4',
      platform: 'WEBHOOK',
      name: 'Make.com Webhook',
      config: '{"url":"https://hook.us1.make.com/your-custom-hook-id"}',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'sa-6',
      platform: 'BRANDING',
      name: 'ตั้งค่าแบรนด์ & ลายน้ำภาพข่าว (Watermark Branding)',
      config: '{"logoText":"CHRONICLE AI"}',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  logs: []
};

// Reads data from Mock DB (JSON file)
function readMockDB(): MockDB {
  if (!fs.existsSync(MOCK_DB_FILE)) {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
    return DEFAULT_DB;
  }
  try {
    const data = fs.readFileSync(MOCK_DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Convert string dates back to Date objects
    const convertDates = (obj: any) => {
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj[key])) {
            obj[key] = new Date(obj[key]);
          } else if (typeof obj[key] === 'object') {
            convertDates(obj[key]);
          }
        }
      }
    };
    convertDates(parsed);
    return parsed;
  } catch (e) {
    console.error('Error reading mock db, resetting to default', e);
    return DEFAULT_DB;
  }
}

// Writes data to Mock DB (JSON file)
function writeMockDB(db: MockDB) {
  fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(db, null, 2));
}

// Helper to determine if we are in mock mode
export function isMockMode(): boolean {
  return process.env.APP_MODE === 'mock' || !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost:5432/chronicle_ai');
}

export const db = {
  // === SOURCES ===
  async getSources(): Promise<NewsSource[]> {
    if (isMockMode()) {
      return readMockDB().sources;
    }
    return prisma.newsSource.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async createSource(data: { name: string; type: string; url?: string | null; query?: string | null; autoPost?: boolean }): Promise<NewsSource> {
    if (isMockMode()) {
      const dbData = readMockDB();
      const newSource: NewsSource = {
        id: 'src-' + Math.random().toString(36).substr(2, 9),
        name: data.name,
        type: data.type,
        url: data.url || null,
        query: data.query || null,
        isActive: true,
        autoPost: data.autoPost || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbData.sources.unshift(newSource);
      writeMockDB(dbData);
      return newSource;
    }
    return prisma.newsSource.create({ data });
  },

  async updateSource(id: string, data: Partial<NewsSource>): Promise<NewsSource> {
    if (isMockMode()) {
      const dbData = readMockDB();
      const idx = dbData.sources.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Source not found');
      dbData.sources[idx] = {
        ...dbData.sources[idx],
        ...data,
        updatedAt: new Date()
      } as NewsSource;
      writeMockDB(dbData);
      return dbData.sources[idx];
    }
    return prisma.newsSource.update({ where: { id }, data });
  },

  async deleteSource(id: string): Promise<any> {
    if (isMockMode()) {
      const dbData = readMockDB();
      dbData.sources = dbData.sources.filter(s => s.id !== id);
      writeMockDB(dbData);
      return { success: true };
    }
    return prisma.newsSource.delete({ where: { id } });
  },

  // === PERSONAS ===
  async getPersonas(): Promise<WritingPersona[]> {
    if (isMockMode()) {
      const dbData = readMockDB();
      // Auto-inject TL;DR if not present
      if (!dbData.personas.some(p => p.id === 'p-4')) {
        dbData.personas.push({
          id: 'p-4',
          name: 'สรุปสั้น 3 ประเด็น (TL;DR สำหรับ Twitter/X)',
          tone: 'กระชับ รวดเร็ว สรุปเป็น 3 หัวข้อหลัก เหมาะสำหรับการสแกนอ่านเร็ว',
          instructions: 'เขียนสรุปข่าวเป็น 3 หัวข้อย่อยสั้นๆ (แต่ละหัวข้อขึ้นต้นด้วยอิโมจิที่เกี่ยวข้อง) เขียนข้อความรวมกันทั้งหมดให้สั้นกระชับไม่เกิน 250 ตัวอักษร เพื่อให้วางใน X/Twitter ได้พอดีโดยไม่เกินโควตา',
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        writeMockDB(dbData);
      }
      return dbData.personas;
    }
    return prisma.writingPersona.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async createPersona(data: { name: string; tone: string; instructions: string; isDefault?: boolean }): Promise<WritingPersona> {
    if (isMockMode()) {
      const dbData = readMockDB();
      if (data.isDefault) {
        dbData.personas.forEach(p => p.isDefault = false);
      }
      const newPersona: WritingPersona = {
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        name: data.name,
        tone: data.tone,
        instructions: data.instructions,
        isDefault: data.isDefault || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbData.personas.push(newPersona);
      writeMockDB(dbData);
      return newPersona;
    }
    if (data.isDefault) {
      await prisma.writingPersona.updateMany({ data: { isDefault: false } });
    }
    return prisma.writingPersona.create({ data });
  },

  async updatePersona(id: string, data: Partial<WritingPersona>): Promise<WritingPersona> {
    if (isMockMode()) {
      const dbData = readMockDB();
      if (data.isDefault) {
        dbData.personas.forEach(p => p.isDefault = false);
      }
      const idx = dbData.personas.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Persona not found');
      dbData.personas[idx] = {
        ...dbData.personas[idx],
        ...data,
        updatedAt: new Date()
      } as WritingPersona;
      writeMockDB(dbData);
      return dbData.personas[idx];
    }
    if (data.isDefault) {
      await prisma.writingPersona.updateMany({ data: { isDefault: false } });
    }
    return prisma.writingPersona.update({ where: { id }, data });
  },

  async deletePersona(id: string): Promise<any> {
    if (isMockMode()) {
      const dbData = readMockDB();
      dbData.personas = dbData.personas.filter(p => p.id !== id);
      writeMockDB(dbData);
      return { success: true };
    }
    return prisma.writingPersona.delete({ where: { id } });
  },

  // === DRAFTS ===
  async getDrafts(): Promise<NewsDraft[]> {
    if (isMockMode()) {
      const dbData = readMockDB();
      return dbData.drafts.map(d => ({
        ...d,
        persona: dbData.personas.find(p => p.id === d.personaId) || null
      })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return prisma.newsDraft.findMany({
      include: { persona: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getDraftById(id: string): Promise<NewsDraft | null> {
    if (isMockMode()) {
      const dbData = readMockDB();
      const draft = dbData.drafts.find(d => d.id === id);
      if (!draft) return null;
      return {
        ...draft,
        persona: dbData.personas.find(p => p.id === draft.personaId) || null
      };
    }
    return prisma.newsDraft.findUnique({
      where: { id },
      include: { persona: true }
    });
  },

  async createDraft(data: {
    title: string;
    originalTitle: string;
    originalUrl?: string | null;
    originalSource?: string | null;
    content: string;
    imageUrl?: string | null;
    imagePrompt?: string | null;
    sourceId?: string | null;
    personaId?: string | null;
    status?: string;
    curatorReason?: string | null;
  }): Promise<NewsDraft> {
    if (isMockMode()) {
      const dbData = readMockDB();
      const newDraft: NewsDraft = {
        id: 'draft-' + Math.random().toString(36).substr(2, 9),
        title: data.title,
        originalTitle: data.originalTitle,
        originalUrl: data.originalUrl || null,
        originalSource: data.originalSource || null,
        content: data.content,
        imageUrl: data.imageUrl || null,
        imagePrompt: data.imagePrompt || null,
        status: data.status || 'DRAFT',
        curatorReason: data.curatorReason || null,
        sourceId: data.sourceId || null,
        personaId: data.personaId || null,
        scheduledAt: null,
        postedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbData.drafts.unshift(newDraft);
      writeMockDB(dbData);
      return newDraft;
    }
    return prisma.newsDraft.create({ data });
  },

  async updateDraft(id: string, data: Partial<NewsDraft>): Promise<NewsDraft> {
    if (isMockMode()) {
      const dbData = readMockDB();
      const idx = dbData.drafts.findIndex(d => d.id === id);
      if (idx === -1) throw new Error('Draft not found');
      dbData.drafts[idx] = {
        ...dbData.drafts[idx],
        ...data,
        updatedAt: new Date()
      } as NewsDraft;
      writeMockDB(dbData);
      return dbData.drafts[idx];
    }
    // Remove relation fields and handle prisma input compatibility
    const { id: _, persona, logs, ...cleanData } = data as any;
    return prisma.newsDraft.update({
      where: { id },
      data: cleanData
    }) as any;
  },

  async deleteDraft(id: string): Promise<any> {
    if (isMockMode()) {
      const dbData = readMockDB();
      dbData.drafts = dbData.drafts.filter(d => d.id !== id);
      dbData.logs = dbData.logs.filter(l => l.draftId !== id);
      writeMockDB(dbData);
      return { success: true };
    }
    return prisma.newsDraft.delete({ where: { id } });
  },

  // === SOCIAL ACCOUNTS ===
  async getSocialAccounts(): Promise<SocialAccount[]> {
    if (isMockMode()) {
      const dbData = readMockDB();
      let changed = false;
      // Auto-inject GEMINI if not present
      if (!dbData.socialAccounts.some(sa => sa.platform === 'GEMINI')) {
        dbData.socialAccounts.push({
          id: 'sa-5',
          platform: 'GEMINI',
          name: 'Google Gemini API Key (บริการหลัก)',
          config: '{"apiKey":""}',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        changed = true;
      }
      // Auto-inject BRANDING if not present
      if (!dbData.socialAccounts.some(sa => sa.platform === 'BRANDING')) {
        dbData.socialAccounts.push({
          id: 'sa-6',
          platform: 'BRANDING',
          name: 'ตั้งค่าแบรนด์ & ลายน้ำภาพข่าว (Watermark Branding)',
          config: '{"logoText":"CHRONICLE AI"}',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        changed = true;
      }
      if (changed) {
        writeMockDB(dbData);
      }
      return dbData.socialAccounts;
    }
    
    const accounts = await prisma.socialAccount.findMany();
    let hasGemini = accounts.some(a => a.platform === 'GEMINI');
    let hasBranding = accounts.some(a => a.platform === 'BRANDING');
    
    const resultAccounts = [...accounts];
    
    if (!hasGemini) {
      try {
        const newGemini = await prisma.socialAccount.create({
          data: {
            platform: 'GEMINI',
            name: 'Google Gemini API Key (บริการหลัก)',
            config: '{"apiKey":""}',
            isActive: false
          }
        });
        resultAccounts.push(newGemini);
      } catch (e) {
        console.error('Failed to create default gemini social account in DB:', e);
      }
    }
    
    if (!hasBranding) {
      try {
        const newBranding = await prisma.socialAccount.create({
          data: {
            platform: 'BRANDING',
            name: 'ตั้งค่าแบรนด์ & ลายน้ำภาพข่าว (Watermark Branding)',
            config: '{"logoText":"CHRONICLE AI"}',
            isActive: true
          }
        });
        resultAccounts.push(newBranding);
      } catch (e) {
        console.error('Failed to create default branding social account in DB:', e);
      }
    }
    
    return resultAccounts;
  },

  async updateSocialAccount(id: string, data: Partial<SocialAccount>): Promise<SocialAccount> {
    if (isMockMode()) {
      const dbData = readMockDB();
      const idx = dbData.socialAccounts.findIndex(sa => sa.id === id);
      if (idx === -1) throw new Error('Social Account not found');
      dbData.socialAccounts[idx] = {
        ...dbData.socialAccounts[idx],
        ...data,
        updatedAt: new Date()
      } as SocialAccount;
      writeMockDB(dbData);
      return dbData.socialAccounts[idx];
    }
    return prisma.socialAccount.update({ where: { id }, data });
  },

  // === LOGS ===
  async getLogs(): Promise<PostLog[]> {
    if (isMockMode()) {
      return readMockDB().logs.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
    }
    return prisma.postLog.findMany({
      orderBy: { postedAt: 'desc' }
    });
  },

  async createLog(data: { draftId: string; platform: string; status: string; externalPostId?: string | null; errorMessage?: string | null }): Promise<PostLog> {
    if (isMockMode()) {
      const dbData = readMockDB();
      const newLog: PostLog = {
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        draftId: data.draftId,
        platform: data.platform,
        status: data.status,
        externalPostId: data.externalPostId || null,
        errorMessage: data.errorMessage || null,
        postedAt: new Date()
      };
      dbData.logs.unshift(newLog);
      writeMockDB(dbData);
      return newLog;
    }
    return prisma.postLog.create({ data });
  }
};

export async function getGeminiApiKey(): Promise<string | null> {
  const accounts = await db.getSocialAccounts();
  const gemini = accounts.find(a => a.platform === 'GEMINI');
  if (gemini && gemini.isActive) {
    try {
      const conf = JSON.parse(gemini.config);
      if (conf.apiKey) return conf.apiKey;
    } catch (e) {}
  }
  return process.env.GEMINI_API_KEY || null;
}
