'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, RefreshCw, Check, AlertCircle, 
  Settings as SettingsIcon, Newspaper, User, Share2, ShieldAlert
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'sources' | 'personas' | 'socials' | 'system'>('sources');
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });

  // Data States
  const [sources, setSources] = useState<any[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [socials, setSocials] = useState<any[]>([]);
  
  // App system mode states
  const [appMode, setAppMode] = useState('mock');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Form States - Source
  const [sourceForm, setSourceForm] = useState({
    name: '',
    type: 'RSS',
    url: '',
    query: '',
    autoPost: false
  });

  // Form States - Persona
  const [personaForm, setPersonaForm] = useState({
    name: '',
    tone: '',
    instructions: '',
    isDefault: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const sRes = await fetch('/api/sources');
      const sourcesData = await sRes.json();
      setSources(sourcesData);

      const pRes = await fetch('/api/personas');
      const personasData = await pRes.json();
      setPersonas(personasData);

      const socRes = await fetch('/api/settings/social');
      const socialsData = await socRes.json();
      setSocials(socialsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // In actual implementation, we'd fetch Env/System settings via API,
    // For mockup we'll simulate or read from localStorage if needed,
    // or just let the page mount with default mock state which the user can edit.
    setAppMode(process.env.NEXT_PUBLIC_APP_MODE || 'mock');
  }, []);

  const triggerAlert = (type: string, text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: '', text: '' }), 4000);
  };

  // --- NEWS SOURCES ACTIONS ---
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceForm.name || (sourceForm.type === 'RSS' && !sourceForm.url) || (sourceForm.type === 'GOOGLE_SEARCH' && !sourceForm.query)) {
      triggerAlert('error', 'กรุณากรอกข้อมูลให้ครบถ้วนตามประเภทแหล่งข่าว');
      return;
    }
    setSaveLoading(true);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSources([...sources, data]);
        setSourceForm({ name: '', type: 'RSS', url: '', query: '', autoPost: false });
        triggerAlert('success', 'เพิ่มแหล่งข่าวสารใหม่สำเร็จ!');
      } else {
        triggerAlert('error', data.error);
      }
    } catch (e) {
      triggerAlert('error', 'การเชื่อมโยงขัดข้อง');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('ยืนยันลบแหล่งข่าวสารนี้?')) return;
    try {
      const res = await fetch(`/api/sources?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSources(sources.filter(s => s.id !== id));
        triggerAlert('success', 'ลบแหล่งข่าวสำเร็จ');
      }
    } catch (e) {
      triggerAlert('error', 'การลบล้มเหลว');
    }
  };

  const toggleSourceActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setSources(sources.map(s => s.id === id ? data : s));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- PERSONAS ACTIONS ---
  const handleAddPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaForm.name || !personaForm.tone || !personaForm.instructions) {
      triggerAlert('error', 'กรุณากรอกข้อมูลบุคลิก AI ให้ครบถ้วน');
      return;
    }
    setSaveLoading(true);
    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personaForm)
      });
      const data = await res.json();
      if (res.ok) {
        setPersonas([...personas, data]);
        setPersonaForm({ name: '', tone: '', instructions: '', isDefault: false });
        triggerAlert('success', 'เพิ่มบุคลิกผู้เขียนใหม่สำเร็จ!');
        fetchData(); // Refresh to update default flags
      } else {
        triggerAlert('error', data.error);
      }
    } catch (e) {
      triggerAlert('error', 'การบันทึกขัดข้อง');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeletePersona = async (id: string) => {
    if (!confirm('ยืนยันลบบุคลิก AI นี้?')) return;
    try {
      const res = await fetch(`/api/personas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPersonas(personas.filter(p => p.id !== id));
        triggerAlert('success', 'ลบบุคลิกเรียบร้อย');
      }
    } catch (e) {
      triggerAlert('error', 'การลบล้มเหลว');
    }
  };

  // --- SOCIAL CONNECTIONS ACTIONS ---
  const handleUpdateSocial = async (id: string, updatedConfig: string, currentActive: boolean) => {
    setSaveLoading(true);
    try {
      const res = await fetch('/api/settings/social', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, config: updatedConfig, isActive: currentActive })
      });
      const data = await res.json();
      if (res.ok) {
        setSocials(socials.map(s => s.id === id ? data : s));
        triggerAlert('success', 'บันทึกข้อมูลเชื่อมต่อสำเร็จ!');
      } else {
        triggerAlert('error', data.error);
      }
    } catch (e) {
      triggerAlert('error', 'การอัปเดตล้มเหลว');
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleSocialActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/settings/social', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setSocials(socials.map(s => s.id === id ? data : s));
        triggerAlert('success', `${currentStatus ? 'ปิด' : 'เปิด'} การใช้งานช่องทางนี้แล้ว`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-border pb-6 mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight">ตั้งค่าระบบ (Settings)</h1>
        <p className="text-sm text-stone-500 mt-1">ตั้งค่าแหล่งข่าว, สร้างคีย์เวิร์ด, เพิ่มบุคลิกการเขียน AI และคีย์โซเชียลมีเดีย</p>
      </div>

      {alertMsg.text && (
        <div className={`p-4 rounded-lg mb-6 text-sm flex items-center space-x-2 ${
          alertMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300' :
          'bg-red-50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-300'
        }`}>
          {alertMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Tabs bar */}
        <div className="w-full md:w-56 shrink-0 flex md:flex-col space-y-0 md:space-y-1 overflow-x-auto border-b md:border-b-0 border-border md:border-r pr-0 md:pr-4 pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors whitespace-nowrap ${
              activeTab === 'sources' ? 'bg-stone-100 dark:bg-stone-900 text-accent' : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900/50'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>แหล่งข้อมูลข่าว</span>
          </button>
          
          <button
            onClick={() => setActiveTab('personas')}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors whitespace-nowrap ${
              activeTab === 'personas' ? 'bg-stone-100 dark:bg-stone-900 text-accent' : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900/50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>บุคลิกเขียนข่าว (Personas)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('socials')}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors whitespace-nowrap ${
              activeTab === 'socials' ? 'bg-stone-100 dark:bg-stone-900 text-accent' : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900/50'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>เชื่อมต่อโซเชียล</span>
          </button>
          
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-left transition-colors whitespace-nowrap ${
              activeTab === 'system' ? 'bg-stone-100 dark:bg-stone-900 text-accent' : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>โหมดการทำงาน</span>
          </button>
        </div>

        {/* Right Tab Content area */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-stone-400 animate-spin" />
            </div>
          ) : (
            <div>
              {/* TAB 1: NEWS SOURCES */}
              {activeTab === 'sources' && (
                <div className="space-y-8">
                  {/* Add Source Form */}
                  <form onSubmit={handleAddSource} className="bg-card border border-border p-6 rounded-xl space-y-4">
                    <h3 className="font-serif font-bold text-lg">เพิ่มแหล่งข้อมูลข่าวสาร</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                          ชื่อแหล่งข่าว (เช่น ไทยรัฐ ไอที)
                        </label>
                        <input
                          type="text"
                          value={sourceForm.name}
                          onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                          className="w-full bg-background border border-border p-2.5 rounded-lg text-xs focus:outline-none focus:border-stone-500"
                          placeholder="กรอกชื่อแหล่งข่าวเพื่อแสดงในระบบ"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                          ประเภทการดึงข่าว
                        </label>
                        <select
                          value={sourceForm.type}
                          onChange={(e) => setSourceForm({ ...sourceForm, type: e.target.value, url: '', query: '' })}
                          className="w-full bg-background border border-border p-2.5 rounded-lg text-xs focus:outline-none"
                        >
                          <option value="RSS">RSS Feed (ดึงข่าวจากบล็อก/เว็บข่าวหลัก)</option>
                          <option value="GOOGLE_SEARCH">Google News Search (ดึงข่าวตามคีย์เวิร์ด)</option>
                        </select>
                      </div>
                    </div>

                    {sourceForm.type === 'RSS' ? (
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                          ที่อยู่ RSS Feed URL
                        </label>
                        <input
                          type="url"
                          value={sourceForm.url}
                          onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                          className="w-full bg-background border border-border p-2.5 rounded-lg text-xs focus:outline-none focus:border-stone-500"
                          placeholder="https://www.example.com/rss/tech"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                          คำค้นหาค้นหาคีย์เวิร์ด (Query)
                        </label>
                        <input
                          type="text"
                          value={sourceForm.query}
                          onChange={(e) => setSourceForm({ ...sourceForm, query: e.target.value })}
                          className="w-full bg-background border border-border p-2.5 rounded-lg text-xs focus:outline-none focus:border-stone-500"
                          placeholder="เช่น AI เทคโนโลยีใหม่, TikTok updates"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="autoPost"
                        checked={sourceForm.autoPost}
                        onChange={(e) => setSourceForm({ ...sourceForm, autoPost: e.target.checked })}
                        className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="autoPost" className="text-xs font-medium text-stone-600 dark:text-stone-400 cursor-pointer">
                        เปิดระบบโพสอัตโนมัติ (Auto-Post) สำหรับแหล่งข่าวนี้ทันทีเมื่อตรวจพบข่าวสารใหม่
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="flex items-center space-x-2 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มแหล่งข้อมูล</span>
                    </button>
                  </form>

                  {/* Sources List */}
                  <div className="space-y-4">
                    <h3 className="font-serif font-bold text-lg">แหล่งข่าวที่ทำงานอยู่ ({sources.length})</h3>
                    <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                      {sources.map((src) => (
                        <div key={src.id} className="p-4 flex items-center justify-between text-xs gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold">{src.name}</span>
                              <span className="text-[10px] bg-stone-100 dark:bg-stone-900 border border-border px-1.5 py-0.5 rounded font-mono uppercase">
                                {src.type}
                              </span>
                              {src.autoPost && (
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">
                                  Auto-Post
                                </span>
                              )}
                            </div>
                            <p className="text-stone-500 font-mono text-[10px] mt-1.5 truncate">
                              {src.type === 'RSS' ? src.url : `คีย์เวิร์ด: ${src.query}`}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-3 shrink-0">
                            <button
                              onClick={() => toggleSourceActive(src.id, src.isActive)}
                              className={`px-3 py-1 rounded text-[10px] font-bold ${
                                src.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' : 'bg-stone-100 text-stone-500'
                              }`}
                            >
                              {src.isActive ? 'กำลังดึง' : 'หยุดดึง'}
                            </button>

                            <button
                              onClick={() => handleDeleteSource(src.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WRITING PERSONAS */}
              {activeTab === 'personas' && (
                <div className="space-y-8">
                  {/* Add Persona Form */}
                  <form onSubmit={handleAddPersona} className="bg-card border border-border p-6 rounded-xl space-y-4">
                    <h3 className="font-serif font-bold text-lg">สร้างบุคลิก AI ใหม่ (Writing Persona)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                          ชื่อบุคลิกเขียนข่าว (เช่น สรุปข่าวตลก)
                        </label>
                        <input
                          type="text"
                          value={personaForm.name}
                          onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
                          className="w-full bg-background border border-border p-2.5 rounded-lg text-xs focus:outline-none focus:border-stone-500"
                          placeholder="เช่น สหายคุยข่าวไอที"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                          ลักษณะน้ำเสียงการเขียน (Tone)
                        </label>
                        <input
                          type="text"
                          value={personaForm.tone}
                          onChange={(e) => setPersonaForm({ ...personaForm, tone: e.target.value })}
                          className="w-full bg-background border border-border p-2.5 rounded-lg text-xs focus:outline-none focus:border-stone-500"
                          placeholder="เช่น ตลก สดใส แดกดันเล็กน้อย ภาษาวัยรุ่น"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                        คำสั่งควบคุม AI (System Prompts)
                      </label>
                      <textarea
                        rows={4}
                        value={personaForm.instructions}
                        onChange={(e) => setPersonaForm({ ...personaForm, instructions: e.target.value })}
                        className="w-full bg-background border border-border p-3 rounded-lg text-xs leading-relaxed focus:outline-none focus:border-stone-500 font-sans"
                        placeholder="คำสั่งระบุเพื่อให้ Gemini นำเนื้อหาเดิมไป rewrite เขียนข่าวในบุคลิกที่ต้องการอย่างจำกัดขอบเขต..."
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={personaForm.isDefault}
                        onChange={(e) => setPersonaForm({ ...personaForm, isDefault: e.target.checked })}
                        className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="isDefault" className="text-xs font-medium text-stone-600 dark:text-stone-400 cursor-pointer">
                        ตั้งค่าเป็นค่าเริ่มต้น (Default Persona) สำหรับการดึงข่าวรอบอัตโนมัติ
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="flex items-center space-x-2 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มบุคลิก AI</span>
                    </button>
                  </form>

                  {/* Personas List */}
                  <div className="space-y-4">
                    <h3 className="font-serif font-bold text-lg">บุคลิกทั้งหมดในระบบ ({personas.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {personas.map((p) => (
                        <div key={p.id} className="bg-card border border-border p-5 rounded-xl flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-serif font-bold text-sm">{p.name}</span>
                              {p.isDefault && (
                                <span className="text-[9px] bg-accent/10 text-accent border border-accent/25 px-1.5 py-0.5 rounded font-bold">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 italic mb-2">
                              โทนเสียง: {p.tone}
                            </p>
                            <p className="text-[10px] text-stone-400 line-clamp-3 leading-relaxed mb-4">
                              คำสั่ง: {p.instructions}
                            </p>
                          </div>

                          <div className="flex justify-end pt-3 border-t border-border/50">
                            <button
                              onClick={() => handleDeletePersona(p.id)}
                              disabled={p.isDefault}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors disabled:opacity-30"
                              title={p.isDefault ? "ไม่สามารถลบสไตล์เริ่มต้นได้" : "ลบสไตล์"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SOCIAL CONNECTIONS */}
              {activeTab === 'socials' && (
                <div className="space-y-6">
                  <h3 className="font-serif font-bold text-lg">การตั้งค่า API โซเชียลมีเดีย</h3>
                  <div className="space-y-6">
                    {socials.map((sa) => {
                      // Config text value local state helper
                      return (
                        <div key={sa.id} className="bg-card border border-border p-5 rounded-xl space-y-4">
                          <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <div>
                              <h4 className="font-serif font-bold text-sm">{sa.name}</h4>
                              <p className="text-[10px] text-stone-500 font-mono uppercase">{sa.platform}</p>
                            </div>

                            <button
                              onClick={() => toggleSocialActive(sa.id, sa.isActive)}
                              className={`px-3 py-1 rounded text-[10px] font-bold ${
                                sa.isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20' : 'bg-stone-100 text-stone-500'
                              }`}
                            >
                              {sa.isActive ? 'เปิดใช้งานอยู่' : 'ปิดใช้งาน'}
                            </button>
                          </div>

                          <SocialConfigForm 
                            account={sa} 
                            onSave={(newConf) => handleUpdateSocial(sa.id, newConf, sa.isActive)} 
                            saveLoading={saveLoading}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: SYSTEM / CONFIG */}
              {activeTab === 'system' && (
                <div className="bg-card border border-border p-6 rounded-xl space-y-6">
                  <h3 className="font-serif font-bold text-lg">การทำงานและคีย์โมเดลระบบ</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-2">
                        โหมดจำลองระบบ (App Mode)
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input
                            type="radio"
                            name="appMode"
                            value="mock"
                            checked={appMode === 'mock'}
                            onChange={() => {
                              setAppMode('mock');
                              triggerAlert('success', 'เปลี่ยนโหมดเป็นจำลองการทำงาน (Mock Mode) แล้ว (ไม่ต้องใช้ API key จริง)');
                            }}
                            className="text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                          />
                          <span>โหมดจำลอง (Mock Mode - ทดสอบระบบฟรี)</span>
                        </label>
                        
                        <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                          <input
                            type="radio"
                            name="appMode"
                            value="production"
                            checked={appMode === 'production'}
                            onChange={() => {
                              setAppMode('production');
                              triggerAlert('success', 'เปลี่ยนเป็นยิง API จริงแล้ว กรุณาใส่ API Key ให้ถูกต้องในไฟล์ .env');
                            }}
                            className="text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                          />
                          <span>โหมดใช้งานจริง (Production API Mode)</span>
                        </label>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-2">
                        *หมายเหตุ: เพื่อหลีกเลี่ยงข้อขัดข้องและทดสอบ Dashboard ได้ทันที ควรเลือก "โหมดจำลอง" ไว้อ้างอิงการจัดเก็บฐานข้อมูล Supabase และการแสดงผล ส่วนคีย์หลักอื่นๆ ระบบจะดึงค่าจากไฟล์ `.env` ที่อยู่ในโฟลเดอร์เครื่อง
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h4 className="font-serif font-bold text-sm mb-3">คำแนะนำการย้ายฐานข้อมูล (Supabase Integration)</h4>
                      <div className="bg-stone-100 dark:bg-stone-900/50 p-4 rounded-lg text-xs leading-relaxed font-mono">
                        <p className="text-stone-700 dark:text-stone-400 font-sans mb-2">หากต้องการรันคำสั่ง Migration ข้อมูลไปยัง Supabase เมื่อแก้ไข URL ในไฟล์ .env แล้ว ให้รันคำสั่งนี้บนเครื่องคอมพิวเตอร์ของคุณ:</p>
                        <p className="text-indigo-600 dark:text-indigo-400">npx prisma migrate dev --name init</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent to handle JSON config strings in socials settings
interface SocialConfigFormProps {
  account: any;
  onSave: (config: string) => void;
  saveLoading: boolean;
}
function SocialConfigForm({ account, onSave, saveLoading }: SocialConfigFormProps) {
  const [fields, setFields] = useState<any>({});

  useEffect(() => {
    try {
      setFields(JSON.parse(account.config));
    } catch (e) {
      setFields({});
    }
  }, [account]);

  const handleChange = (key: string, value: string) => {
    setFields({ ...fields, [key]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(JSON.stringify(fields));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {account.platform === 'FACEBOOK' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Facebook Page ID</label>
            <input
              type="text"
              value={fields.pageId || ''}
              onChange={(e) => handleChange('pageId', e.target.value)}
              className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
              placeholder="เช่น 1234567890123"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Page Access Token</label>
            <input
              type="password"
              value={fields.accessToken || ''}
              onChange={(e) => handleChange('accessToken', e.target.value)}
              className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
              placeholder="EAAG...."
            />
          </div>
        </div>
      )}

      {account.platform === 'TWITTER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">API Key</label>
            <input
              type="text"
              value={fields.apiKey || ''}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">API Secret</label>
            <input
              type="password"
              value={fields.apiSecret || ''}
              onChange={(e) => handleChange('apiSecret', e.target.value)}
              className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Access Token</label>
            <input
              type="text"
              value={fields.accessToken || ''}
              onChange={(e) => handleChange('accessToken', e.target.value)}
              className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Access Token Secret</label>
            <input
              type="password"
              value={fields.accessTokenSecret || ''}
              onChange={(e) => handleChange('accessTokenSecret', e.target.value)}
              className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
            />
          </div>
        </div>
      )}

      {account.platform === 'INSTAGRAM' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Instagram Business Account ID</label>
            <input
              type="text"
              value={fields.pageId || ''}
              onChange={(e) => handleChange('pageId', e.target.value)}
              className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
              placeholder="เช่น 178414..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Facebook User Access Token</label>
            <input
              type="password"
              value={fields.accessToken || ''}
              onChange={(e) => handleChange('accessToken', e.target.value)}
              className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
              placeholder="EAAG...."
            />
          </div>
        </div>
      )}

      {account.platform === 'GEMINI' && (
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Google Gemini API Key</label>
          <input
            type="password"
            value={fields.apiKey || ''}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none font-mono"
            placeholder="เช่น AIzaSy..."
          />
        </div>
      )}

      {account.platform === 'WEBHOOK' && (
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Make.com/Zapier Webhook URL</label>
          <input
            type="url"
            value={fields.url || ''}
            onChange={(e) => handleChange('url', e.target.value)}
            className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none"
            placeholder="https://hook.us1.make.com/your-webhook"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={saveLoading}
        className="flex items-center space-x-1 border border-border bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-stone-800 transition-colors disabled:opacity-50"
      >
        <Save className="w-3.5 h-3.5" />
        <span>บันทึกการตั้งค่า</span>
      </button>
    </form>
  );
}
