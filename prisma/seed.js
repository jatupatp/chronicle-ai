const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Supabase Database...');

  // 1. Seed Writing Personas
  const personas = [
    {
      name: 'วิเคราะห์เจาะลึก',
      tone: 'วิเคราะห์เชิงลึก ให้ความรู้เชิงเทคนิคหรือสถิติที่น่าสนใจ',
      instructions: 'เขียนข่าวในโทนวิเคราะห์ เจาะประเด็นเบื้องลึก อธิบายเหตุและผลอย่างเป็นระบบ อ้างอิงตัวเลขหรือสถิติให้น่าเชื่อถือ',
      isDefault: true
    },
    {
      name: 'เล่าข่าวสนุก (คุยเป็นกันเอง)',
      tone: 'เป็นกันเอง ภาษาวัยรุ่น สนุกสนาน คุยเหมือนเพื่อนเล่าให้ฟัง',
      instructions: 'เขียนข่าวโดยใช้ภาษาที่เป็นกันเอง สรุปประเด็นเข้าใจง่าย มีความสนุกสนาน ใช้สำนวนกระฉับกระเฉง หลีกเลี่ยงศัพท์ทางการที่ยากเกินไป',
      isDefault: false
    },
    {
      name: 'สรุปทางการ',
      tone: 'เป็นทางการ รวดเร็ว กระชับ มีความน่าเชื่อถือสูง',
      instructions: 'สรุปข่าวสารอย่างเป็นทางการ ถูกต้อง แม่นยำ เขียนกระชับตรงประเด็น เน้นข้อเท็จจริงสำคัญ ไม่มีอารมณ์ส่วนตัว',
      isDefault: false
    },
    {
      name: 'สรุปสั้น 3 ประเด็น (TL;DR สำหรับ Twitter/X)',
      tone: 'กระชับ รวดเร็ว สรุปเป็น 3 หัวข้อหลัก เหมาะสำหรับการสแกนอ่านเร็ว',
      instructions: 'เขียนสรุปข่าวเป็น 3 หัวข้อย่อยสั้นๆ (แต่ละหัวข้อขึ้นต้นด้วยอิโมจิที่เกี่ยวข้อง) เขียนข้อความรวมกันทั้งหมดให้สั้นกระชับไม่เกิน 250 ตัวอักษร เพื่อให้วางใน X/Twitter ได้พอดีโดยไม่เกินโควตา',
      isDefault: false
    }
  ];

  for (const p of personas) {
    const existing = await prisma.writingPersona.findFirst({
      where: { name: p.name }
    });
    if (!existing) {
      await prisma.writingPersona.create({ data: p });
      console.log(`Created Persona: ${p.name}`);
    }
  }

  // 2. Seed News Sources
  const sources = [
    {
      name: 'Google News (ไอที)',
      type: 'RSS',
      url: 'https://news.google.com/rss/search?q=technology&hl=th&gl=TH&ceid=TH:th',
      isActive: true,
      autoPost: false
    },
    {
      name: 'ไทยรัฐ ไอที',
      type: 'RSS',
      url: 'https://www.thairath.co.th/rss/tech',
      isActive: true,
      autoPost: false
    },
    {
      name: 'Blognone (ข่าวไอทีและเทคโนโลยี)',
      type: 'RSS',
      url: 'https://www.blognone.com/atom.xml',
      isActive: true,
      autoPost: false
    },
    {
      name: 'Brand Inside (ธุรกิจและการตลาด)',
      type: 'RSS',
      url: 'https://brandinside.asia/feed',
      isActive: true,
      autoPost: false
    },
    {
      name: 'Thairath Money (การเงินและธุรกิจ)',
      type: 'RSS',
      url: 'https://www.thairath.co.th/rss/money',
      isActive: true,
      autoPost: false
    },
    {
      name: 'Sanook News (ข่าวเด่นประเด็นร้อน)',
      type: 'RSS',
      url: 'https://rssfeeds.sanook.com/rss/feeds/sanook/news.index.xml',
      isActive: true,
      autoPost: false
    },
    {
      name: 'Specphone (มือถือและแกดเจ็ต)',
      type: 'RSS',
      url: 'https://specphone.com/feed',
      isActive: true,
      autoPost: false
    },
    {
      name: 'TechOffside (ข่าวไอทีไลฟ์สไตล์)',
      type: 'RSS',
      url: 'https://www.techoffside.com/feed',
      isActive: true,
      autoPost: false
    },
    {
      name: 'PPTV HD 36 (ข่าวทั่วไปและต่างประเทศ)',
      type: 'RSS',
      url: 'https://www.pptvhd36.com/rss/news.xml',
      isActive: true,
      autoPost: false
    },
    {
      name: 'TechCrunch (ข่าวไอทีระดับโลก)',
      type: 'RSS',
      url: 'https://techcrunch.com/feed/',
      isActive: true,
      autoPost: false
    },
    {
      name: 'The Verge (เทคโนโลยีและวัฒนธรรม)',
      type: 'RSS',
      url: 'https://www.theverge.com/rss/index.xml',
      isActive: true,
      autoPost: false
    },
    {
      name: 'Wired (วิทยาศาสตร์และเทคโนโลยี)',
      type: 'RSS',
      url: 'https://www.wired.com/feed/rss',
      isActive: true,
      autoPost: false
    },
    {
      name: 'BBC Technology (ไอทีและนวัตกรรมโลก)',
      type: 'RSS',
      url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
      isActive: true,
      autoPost: false
    },
    {
      name: 'Engadget (รีวิวแกดเจ็ตระดับโลก)',
      type: 'RSS',
      url: 'https://www.engadget.com/rss.xml',
      isActive: true,
      autoPost: false
    },
    {
      name: 'VentureBeat (เอไอและเทคโนโลยีองค์กร)',
      type: 'RSS',
      url: 'https://venturebeat.com/feed/',
      isActive: true,
      autoPost: false
    },
    {
      name: 'CNBC Technology (ธุรกิจเทคโนโลยีโลก)',
      type: 'RSS',
      url: 'https://search.cnbc.com/rs/search/combinedseo/search?target=partner&partnerId=20000&keywords=technology&sort=date&output=rss',
      isActive: true,
      autoPost: false
    }
  ];

  for (const s of sources) {
    const existing = await prisma.newsSource.findFirst({
      where: { name: s.name }
    });
    if (!existing) {
      await prisma.newsSource.create({ data: s });
      console.log(`Created News Source: ${s.name}`);
    }
  }

  // 3. Seed Social Accounts (including GEMINI placeholder)
  const socialAccounts = [
    {
      platform: 'GEMINI',
      name: 'Google Gemini API Key (บริการหลัก)',
      config: '{"apiKey":""}',
      isActive: false
    },
    {
      platform: 'FACEBOOK',
      name: 'Facebook Page จำลอง',
      config: '{"pageId":"mock-page-123","accessToken":"mock-token-abc"}',
      isActive: true
    },
    {
      platform: 'TWITTER',
      name: 'X (Twitter) จำลอง',
      config: '{"apiKey":"mock-key","accessToken":"mock-token"}',
      isActive: true
    },
    {
      platform: 'INSTAGRAM',
      name: 'Instagram จำลอง',
      config: '{"pageId":"mock-ig-123"}',
      isActive: false
    },
    {
      platform: 'WEBHOOK',
      name: 'Make.com Webhook',
      config: '{"url":"https://hook.us1.make.com/your-custom-hook-id"}',
      isActive: false
    }
  ];

  for (const sa of socialAccounts) {
    const existing = await prisma.socialAccount.findFirst({
      where: { platform: sa.platform }
    });
    if (!existing) {
      await prisma.socialAccount.create({ data: sa });
      console.log(`Created Social Account setup for: ${sa.platform}`);
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
