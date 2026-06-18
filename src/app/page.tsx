'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Play, RefreshCw, FileText, CheckCircle, Clock, AlertCircle, 
  ExternalLink, ChevronRight, Settings, Plus, Send
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalDrafts: 0,
    pendingApproval: 0,
    posted: 0,
    failed: 0
  });
  const [recentDrafts, setRecentDrafts] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlMessage, setCrawlMessage] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('all');

  const [personas, setPersonas] = useState<any[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [crafting, setCrafting] = useState(false);
  const [craftMessage, setCraftMessage] = useState('');

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      // Fetch Drafts
      const draftsRes = await fetch('/api/drafts');
      const drafts = await draftsRes.json();
      
      // Fetch Logs
      const logsRes = await fetch('/api/logs');
      const logs = await logsRes.json();

      // Calculate Stats
      const total = drafts.length;
      const pending = drafts.filter((d: any) => d.status === 'DRAFT').length;
      const posted = drafts.filter((d: any) => d.status === 'POSTED').length;
      const failed = drafts.filter((d: any) => d.status === 'FAILED').length;

      setStats({
        totalDrafts: total,
        pendingApproval: pending,
        posted: posted,
        failed: failed
      });

      setRecentDrafts(drafts.slice(0, 5));
      setRecentLogs(logs.slice(0, 5));

      // Fetch Personas
      const pRes = await fetch('/api/personas');
      const personasData = await pRes.json();
      setPersonas(personasData);
      if (personasData.length > 0 && !selectedPersonaId) {
        const def = personasData.find((p: any) => p.isDefault) || personasData[0];
        setSelectedPersonaId(def.id);
      }

      // Fetch Sources
      const sRes = await fetch('/api/sources');
      const sourcesData = await sRes.json();
      setSources(sourcesData.filter((s: any) => s.isActive));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCraftLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    setCrafting(true);
    setCraftMessage('กำลังสแกนเว็บข่าวและวิเคราะห์เขียนร่างภาษาไทย...');
    try {
      const res = await fetch('/api/drafts/craft-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput,
          personaId: selectedPersonaId
        })
      });
      const data = await res.json();
      if (data.success) {
        setCraftMessage(data.message || 'เรียบเรียงข่าวด่วนเรียบร้อย!');
        setUrlInput('');
        fetchData();
      } else {
        setCraftMessage(`ข้อขัดข้อง: ${data.error}`);
      }
    } catch (err) {
      setCraftMessage('เกิดข้อผิดพลาดในการดึงข้อมูลข่าว');
    } finally {
      setCrafting(false);
      setTimeout(() => setCraftMessage(''), 6000);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerCrawl = async () => {
    setCrawling(true);
    setCrawlMessage('กำลังดึงข้อมูลข่าวสารล่าสุด...');
    try {
      const res = await fetch(`/api/cron/fetch-news?manual=true&sourceId=${selectedSourceId}`);
      const data = await res.json();
      if (data.success) {
        setCrawlMessage(data.message || 'ดึงข่าวสำเร็จแล้ว!');
        fetchData();
      } else {
        setCrawlMessage(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (e) {
      setCrawlMessage('เกิดข้อผิดพลาดในการดึงข่าว');
    } finally {
      setCrawling(false);
      setTimeout(() => setCrawlMessage(''), 5000);
    }
  };

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">ภาพรวมระบบข่าว (Dashboard)</h1>
          <p className="text-sm text-stone-500 mt-1">
            ยินดีต้อนรับสู่ Chronicle AI ระบบบริหารจัดการและเขียนข่าวสารอัตโนมัติของคุณ
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedSourceId}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            className="bg-card border border-border px-3 py-2.5 rounded-lg text-xs focus:outline-none focus:border-stone-500"
          >
            <option value="all">ดึงทุกแหล่งข่าว (All Sources)</option>
            {sources.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
            ))}
          </select>
          <button
            onClick={triggerCrawl}
            disabled={crawling}
            className="flex items-center justify-center space-x-2 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-stone-850 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            {crawling ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{crawling ? 'กำลังดึงข่าว...' : 'ดึงข่าวด่วนทันที (Crawl)'}</span>
          </button>
        </div>
      </div>

      {crawlMessage && (
        <div className="mb-6 p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-800 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-300 text-sm flex items-center space-x-2 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{crawlMessage}</span>
        </div>
      )}

      {craftMessage && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300 text-sm flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>{craftMessage}</span>
        </div>
      )}

      {/* Craft News from URL form */}
      <form onSubmit={handleCraftLink} className="bg-card border border-border p-6 rounded-xl mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0 w-full">
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5">
              เรียบเรียงข่าวด่วนจากลิงก์เว็บ (Craft news from URL link)
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-background border border-border px-4 py-2.5 rounded-lg text-xs focus:outline-none focus:border-stone-500"
              placeholder="วางลิงก์ข่าว เช่น https://www.thairath.co.th/news/tech/..."
              required
            />
          </div>
          
          <div className="w-full md:w-56 shrink-0">
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1.5">
              เลือกบุคลิก AI (Persona)
            </label>
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2.5 rounded-lg text-xs focus:outline-none"
            >
              <option value="">-- บุคลิกเริ่มต้น --</option>
              {personas.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={crafting || !urlInput}
            className="w-full md:w-auto shrink-0 flex items-center justify-center space-x-2 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-stone-850 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            {crafting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{crafting ? 'กำลังดึงและร่าง...' : 'เรียบเรียงทันที'}</span>
          </button>
        </div>
      </form>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-card border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-500 font-medium">ร่างข่าวทั้งหมด</span>
            <FileText className="w-5 h-5 text-stone-400" />
          </div>
          <p className="text-3xl font-serif font-bold">{stats.totalDrafts}</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-500 font-medium">รออนุมัติโพส</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-serif font-bold text-amber-500">{stats.pendingApproval}</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-500 font-medium">โพสสำเร็จแล้ว</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-serif font-bold text-emerald-500">{stats.posted}</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-500 font-medium">โพสล้มเหลว</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-serif font-bold text-red-500">{stats.failed}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-stone-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Drafts List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">บทร่างข่าวสารล่าสุด</h2>
              <Link
                href="/drafts"
                className="text-xs text-accent font-medium flex items-center space-x-1 hover:underline"
              >
                <span>ดูทั้งหมด</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentDrafts.length === 0 ? (
              <div className="bg-card border border-border p-10 rounded-xl text-center text-stone-500 text-sm">
                ไม่มีข้อมูลบทร่างข่าว คลิก "ดึงข่าวด่วนทันที" ด้านบนเพื่อเริ่มดึงข่าวแรกของคุณ
              </div>
            ) : (
              <div className="space-y-4">
                {recentDrafts.map((draft) => (
                  <div 
                    key={draft.id} 
                    className="bg-card border border-border p-5 rounded-xl flex space-x-5 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
                  >
                    {draft.imageUrl && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-stone-100 relative">
                        <img 
                          src={draft.imageUrl} 
                          alt={draft.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="text-[10px] bg-stone-100 dark:bg-stone-900 border border-border text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded font-mono">
                            {draft.originalSource || 'RSS Feed'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            draft.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' :
                            draft.status === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
                          }`}>
                            {draft.status === 'POSTED' ? 'โพสแล้ว' : draft.status === 'FAILED' ? 'ล้มเหลว' : 'ร่างข่าว'}
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-base leading-snug line-clamp-2 mb-1 hover:text-accent">
                          <Link href={`/drafts?id=${draft.id}`}>{draft.title}</Link>
                        </h3>
                        <p className="text-xs text-stone-500 line-clamp-1">
                          {draft.content}
                        </p>
                      </div>
                      <span className="text-[10px] text-stone-400 mt-2">
                        สร้างเมื่อ: {new Date(draft.createdAt).toLocaleString('th-TH')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Social logs & Shortcuts */}
          <div className="space-y-6">
            <h2 className="font-serif text-xl font-bold">บันทึกการส่งข่าวล่าสุด (Logs)</h2>

            {recentLogs.length === 0 ? (
              <div className="bg-card border border-border p-6 rounded-xl text-center text-stone-500 text-sm">
                ยังไม่มีบันทึกประวัติการโพส
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-4 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold tracking-wider font-mono text-stone-600 dark:text-stone-400 uppercase">
                        {log.platform}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300'
                      }`}>
                        {log.status === 'SUCCESS' ? 'สำเร็จ' : 'ล้มเหลว'}
                      </span>
                    </div>
                    {log.errorMessage ? (
                      <p className="text-red-500 font-mono text-[10px] break-all my-1">{log.errorMessage}</p>
                    ) : (
                      <p className="text-stone-500 my-1">
                        ID: {log.externalPostId || 'mock-id'}
                      </p>
                    )}
                    <span className="text-[10px] text-stone-400">
                      {new Date(log.postedAt).toLocaleString('th-TH')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions / Info */}
            <div className="bg-stone-100 dark:bg-stone-900/50 border border-border p-5 rounded-xl">
              <h3 className="font-serif font-bold text-sm mb-3">คำแนะนำการใช้งาน</h3>
              <ul className="text-xs text-stone-600 dark:text-stone-400 space-y-2">
                <li className="flex items-start space-x-1">
                  <span>•</span>
                  <span><strong>ระบบดึงข่าว (Crawl)</strong> ดึงข่าวสดใหม่เรียงเป็นภาษาไทยด้วย AI ในคราวเดียว</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span>•</span>
                  <span><strong>การโพส</strong> ไปที่แท็บ "บทร่างข่าว" เพื่อตรวจแต่งบทความ หรือขอเจนรูปภาพใหม่ก่อนสั่งโพสลงโซเชียลมีเดีย</span>
                </li>
                <li className="flex items-start space-x-1">
                  <span>•</span>
                  <span><strong>สไตล์การเขียน</strong> ตั้งค่าความสั้น/ยาว บุคลิกการเขียน และคีย์บอร์ด RSS ได้จากเมนู "ตั้งค่าระบบ"</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
