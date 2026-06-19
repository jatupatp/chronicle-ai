'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  RefreshCw, Check, AlertCircle, Share2, Trash2, Edit, Save, 
  ArrowLeft, ImageIcon, Sparkles, ExternalLink, Send, Newspaper
} from 'lucide-react';

function DraftsRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectId = searchParams.get('id');

  const [drafts, setDrafts] = useState<any[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [socials, setSocials] = useState<any[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  // Editor states
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(false);
  const [selectedImageStyle, setSelectedImageStyle] = useState('');
  const [previewTab, setPreviewTab] = useState<'facebook' | 'twitter'>('facebook');

  const fetchData = async () => {
    try {
      const dRes = await fetch('/api/drafts');
      const draftsData = await dRes.json();
      setDrafts(draftsData);

      const pRes = await fetch('/api/personas');
      const personasData = await pRes.json();
      setPersonas(personasData);

      const sRes = await fetch('/api/settings/social');
      const socialsData = await sRes.json();
      const activeSocials = socialsData.filter((s: any) => s.isActive);
      setSocials(activeSocials);
      setSelectedPlatforms(activeSocials.map((s: any) => s.id));

      if (draftsData.length > 0) {
        let draftToSelect = draftsData[0];
        if (selectId) {
          const matched = draftsData.find((d: any) => d.id === selectId);
          if (matched) draftToSelect = matched;
        }
        selectDraft(draftToSelect);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectId]);

  const selectDraft = (draft: any) => {
    setSelectedDraft(draft);
    setEditTitle(draft.title);
    setEditContent(draft.content);
    setEditPrompt(draft.imagePrompt || '');
    setSelectedPersonaId(draft.personaId || '');
    setStatusMessage({ type: '', text: '' });
  };

  const saveDraftText = async () => {
    if (!selectedDraft) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedDraft.id,
          title: editTitle,
          content: editContent,
          imagePrompt: editPrompt,
          personaId: selectedPersonaId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'บันทึกบทร่างข้อความสำเร็จ!' });
        // Update list
        setDrafts(drafts.map(d => d.id === selectedDraft.id ? data : d));
        setSelectedDraft(data);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'เกิดข้อผิดพลาดในการบันทึก' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'การเชื่อมต่อผิดพลาด' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
    }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm('คุณแน่ใจว่าต้องการลบบทร่างข่าวนี้ใช่หรือไม่?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/drafts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = drafts.filter(d => d.id !== id);
        setDrafts(remaining);
        if (remaining.length > 0) {
          selectDraft(remaining[0]);
        } else {
          setSelectedDraft(null);
        }
      }
    } catch (e) {
      console.error('Delete error', e);
    } finally {
      setActionLoading(false);
    }
  };

  const regenerateText = async () => {
    if (!selectedDraft) return;
    setActionLoading(true);
    setStatusMessage({ type: 'info', text: 'กำลังเขียนบทความใหม่ด้วย AI...' });
    try {
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: selectedDraft.id,
          personaId: selectedPersonaId,
          regenerateText: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditTitle(data.draft.title);
        setEditContent(data.draft.content);
        setEditPrompt(data.draft.imagePrompt || '');
        setSelectedDraft(data.draft);
        setDrafts(drafts.map(d => d.id === selectedDraft.id ? data.draft : d));
        setStatusMessage({ type: 'success', text: 'เรียบเรียงเนื้อหาใหม่สำเร็จ!' });
      } else {
        setStatusMessage({ type: 'error', text: data.error });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเจเนอเรตเนื้อหา' });
    } finally {
      setActionLoading(false);
    }
  };

  const regenerateImage = async () => {
    if (!selectedDraft) return;
    setActionLoading(true);
    setStatusMessage({ type: 'info', text: 'กำลังสร้างรูปภาพใหม่ด้วย Imagen 3...' });
    try {
      const styleSuffix = selectedImageStyle ? `, ${selectedImageStyle}` : '';
      const finalPrompt = editPrompt + styleSuffix;

      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: selectedDraft.id,
          customImagePrompt: finalPrompt,
          regenerateImage: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDraft(data.draft);
        setDrafts(drafts.map(d => d.id === selectedDraft.id ? data.draft : d));
        setStatusMessage({ type: 'success', text: 'เจเนอเรตรูปภาพใหม่สำเร็จ!' });
      } else {
        setStatusMessage({ type: 'error', text: data.error });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเจเนอเรตรูปภาพ' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedDraft) return;
    if (selectedPlatforms.length === 0) {
      alert('กรุณาเลือกช่องทางโซเชียลมีเดียอย่างน้อย 1 ช่องทาง');
      return;
    }
    
    // Auto-save changes first
    await saveDraftText();

    setPublishLoading(true);
    setStatusMessage({ type: 'info', text: 'กำลังโพสลงโซเชียลมีเดียที่เลือก...' });

    try {
      const res = await fetch('/api/drafts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: selectedDraft.id,
          platformIds: selectedPlatforms
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'โพสเนื้อหาลงช่องทางโซเชียลมีเดียเสร็จสิ้น!' });
        // Update list status to POSTED
        fetchData();
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: `การโพสขัดข้องบางช่องทาง: ${data.results.map((r: any) => `${r.platform}: ${r.status}`).join(', ')}` 
        });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการส่งข้อมูลโพส' });
    } finally {
      setPublishLoading(false);
    }
  };

  const togglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handleCopyText = () => {
    const textToCopy = `${editTitle}\n\n${editContent}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!selectedDraft?.imageUrl) return;
    const link = document.createElement('a');
    
    const imageUrlToDownload = selectedDraft.imageUrl.startsWith('data:')
      ? selectedDraft.imageUrl
      : `/api/og?title=${encodeURIComponent(editTitle || selectedDraft.title)}&imageUrl=${encodeURIComponent(selectedDraft.imageUrl)}`;

    link.href = imageUrlToDownload;
    link.download = `chronicle-news-${selectedDraft.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel: Draft List */}
      <div className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="font-serif font-bold text-lg">ห้องร่างบทความ ({drafts.length})</h2>
          <p className="text-xs text-stone-500">เลือกบทร่างข่าวเพื่อเขียนแต่งหรือสั่งโพส</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-10 flex-1">
            <RefreshCw className="w-5 h-5 text-stone-400 animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="p-6 text-center text-sm text-stone-500">
            ยังไม่มีบทร่างข่าวสาร
          </div>
        ) : (
          <div className="divide-y divide-border">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => selectDraft(draft)}
                className={`w-full text-left p-4 text-xs transition-colors hover:bg-stone-50 dark:hover:bg-stone-900 ${
                  selectedDraft?.id === draft.id ? 'bg-stone-100 dark:bg-stone-900 border-l-4 border-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-border px-1.5 py-0.5 rounded">
                    {draft.originalSource || 'RSS'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                    draft.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' :
                    draft.status === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300' :
                    'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
                  }`}>
                    {draft.status === 'POSTED' ? 'โพสแล้ว' : draft.status === 'FAILED' ? 'ล้มเหลว' : 'ร่าง'}
                  </span>
                </div>
                <h4 className="font-serif font-bold text-sm leading-snug line-clamp-2 mb-1">
                  {draft.title}
                </h4>
                <p className="text-stone-500 line-clamp-1 mb-2">{draft.content}</p>
                <span className="text-[10px] text-stone-400">
                  {new Date(draft.createdAt).toLocaleDateString('th-TH')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right panel: Editor Workspace */}
      <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
        {selectedDraft ? (
          <div className="p-8 max-w-4xl mx-auto w-full space-y-6 pb-20">
            {/* Status alerts */}
            {statusMessage.text && (
              <div className={`p-4 rounded-lg text-sm flex items-center space-x-2 ${
                statusMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300' :
                statusMessage.type === 'info' ? 'bg-indigo-50 border border-indigo-100 text-indigo-800 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-300 animate-pulse' :
                'bg-red-50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-300'
              }`}>
                {statusMessage.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-4">
              <div>
                <span className="text-xs text-stone-500">บทร่าง ID: {selectedDraft.id}</span>
                <h3 className="font-serif font-bold text-xl mt-0.5">สตูดิโอแต่งข่าวและส่งโพส</h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={saveDraftText}
                  disabled={actionLoading}
                  className="flex items-center space-x-1 border border-border bg-card px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกร่าง</span>
                </button>
                
                <button
                  onClick={() => deleteDraft(selectedDraft.id)}
                  disabled={actionLoading}
                  className="flex items-center space-x-1 border border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400 bg-card px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบร่างนี้</span>
                </button>
              </div>
            </div>

            {/* Main Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Form: Text Inputs */}
              <div className="md:col-span-2 space-y-4">
                {selectedDraft.curatorReason && (
                  <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-xl flex items-start space-x-3 shadow-xs">
                    <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
                        เหตุผลของบรรณาธิการ AI (AI Editorial Reason)
                      </h4>
                      <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-sans font-medium">
                        {selectedDraft.curatorReason}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                    หัวข้อข่าว (Headline)
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-card border border-border px-4 py-2.5 rounded-lg text-sm font-serif font-bold focus:outline-none focus:border-stone-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                      เนื้อหาข่าวสาร (Rewritten Content)
                    </label>
                    <div className="text-[10px] text-stone-500 font-medium">
                      จำนวนอักษร: {editContent.length} | จำนวนคำ: {editContent.trim().split(/\s+/).filter(Boolean).length}
                    </div>
                  </div>
                  <textarea
                    rows={10}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-card border border-border p-4 rounded-lg text-sm leading-relaxed focus:outline-none focus:border-stone-500 font-sans"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleCopyText}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        copied 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300' 
                          : 'bg-card border-border hover:bg-stone-50 dark:hover:bg-stone-900'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${copied ? 'block' : 'hidden'}`} />
                      <Share2 className={`w-3.5 h-3.5 ${copied ? 'hidden' : 'block'}`} />
                      <span>{copied ? 'คัดลอกบทความสำเร็จ!' : 'คัดลอกบทความด่วน (Copy)'}</span>
                    </button>
                  </div>
                </div>

                {selectedDraft.originalUrl && (
                  <div className="text-xs text-stone-500 bg-stone-100 dark:bg-stone-900/50 p-3 rounded-lg flex items-center justify-between">
                    <span className="truncate mr-4">ข่าวต้นฉบับ: {selectedDraft.originalTitle}</span>
                    <a 
                      href={selectedDraft.originalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-accent hover:underline flex items-center space-x-0.5 shrink-0"
                    >
                      <span>เปิดเว็บข่าว</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Social Media Post Previews */}
                <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <h4 className="font-serif font-bold text-sm">มุมมองโพสจำลอง (Social Media Live Previews)</h4>
                    <div className="flex bg-stone-100 dark:bg-stone-900 p-0.5 rounded-lg border border-border">
                      <button
                        onClick={() => setPreviewTab('facebook')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                          previewTab === 'facebook' ? 'bg-background shadow-xs text-accent' : 'text-stone-500'
                        }`}
                      >
                        Facebook
                      </button>
                      <button
                        onClick={() => setPreviewTab('twitter')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                          previewTab === 'twitter' ? 'bg-background shadow-xs text-accent' : 'text-stone-500'
                        }`}
                      >
                        X / Twitter
                      </button>
                    </div>
                  </div>

                  {/* Facebook Post Preview */}
                  {previewTab === 'facebook' && (
                    <div className="bg-white text-stone-900 border border-stone-200 rounded-xl overflow-hidden max-w-lg mx-auto font-sans shadow-xs">
                      <div className="p-3 flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-serif font-bold text-sm shrink-0">
                          C
                        </div>
                        <div>
                          <div className="font-bold text-xs hover:underline cursor-pointer">เพจของคุณ</div>
                          <div className="text-[10px] text-stone-500 flex items-center space-x-1">
                            <span>เมื่อสักครู่</span>
                            <span>·</span>
                            <span>🌐</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-3 pb-3 text-xs leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold block mb-1.5">{editTitle}</span>
                        {editContent}
                      </div>

                      {selectedDraft.imageUrl && (
                        <div className="border-y border-stone-200 overflow-hidden bg-stone-50">
                          <img
                            src={selectedDraft.imageUrl.startsWith('data:')
                              ? selectedDraft.imageUrl
                              : `/api/og?title=${encodeURIComponent(editTitle || selectedDraft.title)}&imageUrl=${encodeURIComponent(selectedDraft.imageUrl)}`
                            }
                            alt="FB Post Preview"
                            className="w-full h-auto object-cover max-h-72"
                          />
                        </div>
                      )}

                      <div className="px-4 py-2 flex items-center justify-between text-[11px] text-stone-500 font-semibold border-t border-stone-100 bg-stone-50">
                        <span>👍 ถูกใจ</span>
                        <span>💬 แสดงความคิดเห็น</span>
                        <span>↪️ แชร์</span>
                      </div>
                    </div>
                  )}

                  {/* X/Twitter Post Preview */}
                  {previewTab === 'twitter' && (
                    <div className="bg-[#15202b] text-white border border-stone-800 rounded-xl p-4 max-w-lg mx-auto font-sans shadow-xs">
                      <div className="flex items-start space-x-3">
                        <div className="w-9 h-9 rounded-full bg-stone-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          C
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="font-bold text-xs text-white hover:underline cursor-pointer">คุณ</span>
                            <span className="text-stone-500 text-[10px] truncate">@your_page</span>
                            <span className="text-stone-500 text-[10px]">· 1m</span>
                          </div>

                          <div className="mt-1 text-xs text-stone-100 leading-relaxed whitespace-pre-wrap break-words">
                            <span className="font-bold block mb-1">{editTitle}</span>
                            {editContent}
                          </div>

                          {editTitle.length + editContent.length > 280 && (
                            <div className="mt-2 text-[9px] text-red-400 font-bold bg-red-950/20 border border-red-900/50 p-2 rounded-lg flex items-center space-x-1 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>เนื้อหารวมหัวข้อ ({editTitle.length + editContent.length}) เกินขีดจำกัด 280 อักษรของ X!</span>
                            </div>
                          )}

                          {selectedDraft.imageUrl && (
                            <div className="mt-3 border border-stone-850 rounded-xl overflow-hidden bg-stone-900 max-h-60 flex items-center justify-center">
                              <img
                                src={selectedDraft.imageUrl.startsWith('data:')
                                  ? selectedDraft.imageUrl
                                  : `/api/og?title=${encodeURIComponent(editTitle || selectedDraft.title)}&imageUrl=${encodeURIComponent(selectedDraft.imageUrl)}`
                                }
                                alt="X Post Preview"
                                className="w-full h-auto object-cover max-h-60"
                              />
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between text-stone-500 text-[10px] max-w-xs">
                            <span>💬 0</span>
                            <span>🔁 0</span>
                            <span>❤️ 0</span>
                            <span>📊 0</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Form: Image Generation, Persona & Publishing panel */}
              <div className="space-y-6">
                {/* Persona Selection */}
                <div className="bg-card border border-border p-4 rounded-xl">
                  <h4 className="font-serif font-bold text-sm mb-3">บุคลิกการเขียน (Writing Persona)</h4>
                  <select
                    value={selectedPersonaId}
                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                    className="w-full bg-background border border-border p-2 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="">-- เลือกบุคลิกการเขียน --</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={regenerateText}
                    disabled={actionLoading || !selectedPersonaId}
                    className="w-full mt-3 flex items-center justify-center space-x-2 border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 transition-colors py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ขอให้ AI เรียบเรียงใหม่</span>
                  </button>
                </div>

                {/* Image Panel */}
                <div className="bg-card border border-border p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-sm">รูปภาพประกอบ (Imagen 3)</h4>
                    {selectedDraft.imageUrl && (
                      <button
                        onClick={handleDownloadImage}
                        className="text-[10px] text-accent hover:underline font-semibold flex items-center space-x-0.5"
                      >
                        <span>ดาวน์โหลดรูป</span>
                      </button>
                    )}
                  </div>
                  
                  {selectedDraft.imageUrl ? (
                    <div className="rounded-lg overflow-hidden border border-border aspect-video bg-stone-50 relative group">
                      <img 
                        src={selectedDraft.imageUrl.startsWith('data:')
                          ? selectedDraft.imageUrl
                          : `/api/og?title=${encodeURIComponent(editTitle || selectedDraft.title)}&imageUrl=${encodeURIComponent(selectedDraft.imageUrl)}`
                        } 
                        alt="AI generated" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border aspect-video bg-stone-50/50 flex flex-col items-center justify-center text-stone-400 text-xs">
                      <ImageIcon className="w-8 h-8 mb-1.5" />
                      <span>ยังไม่มีรูปภาพข่าว</span>
                    </div>
                  )}

                  {/* Image Style Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                      เลือกสไตล์รูปภาพประกอบ
                    </label>
                    <select
                      value={selectedImageStyle}
                      onChange={(e) => setSelectedImageStyle(e.target.value)}
                      className="w-full bg-background border border-border p-2 rounded-lg text-xs focus:outline-none"
                    >
                      <option value="">-- ไม่กำหนดสไตล์เสริม (Default) --</option>
                      <option value="premium news editorial photojournalism, realistic photography, sharp focus, 8k resolution, detailed">ภาพถ่ายข่าวจริง (Photojournalism)</option>
                      <option value="clean digital illustration, modern flat vector art design style, colorful, minimalist, SVG style">ภาพดิจิตอลกราฟิก (Flat Vector)</option>
                      <option value="neon cyberpunk style, dark night background, glowing cyan and magenta lights, high contrast, futuristic tech">ภาพแนวอนาคต (Neon Cyberpunk)</option>
                      <option value="modern 3D product render, blender render style, smooth shadows, tech gadget studio lighting, pastel background">ภาพเรนเดอร์ 3D (3D Tech Render)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                      คำสั่งเจนรูป (Image Generation Prompt)
                    </label>
                    <textarea
                      rows={3}
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="w-full bg-background border border-border p-2 rounded-lg text-xs focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    onClick={regenerateImage}
                    disabled={actionLoading || !editPrompt}
                    className="w-full flex items-center justify-center space-x-2 border border-border bg-background py-2 rounded-lg text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>เจนรูปใหม่ด้วย Prompt นี้</span>
                  </button>
                </div>

                {/* Posting Panel */}
                <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                  <h4 className="font-serif font-bold text-base">เผยแพร่ข่าวออกโซเชียล</h4>
                  
                  {socials.length === 0 ? (
                    <p className="text-xs text-stone-500 text-center py-2">
                      ไม่มีช่องทางแอกทีฟในระบบ กรุณาไปตั้งค่าที่เมนู "ตั้งค่าระบบ"
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {socials.map((sa) => (
                        <label 
                          key={sa.id} 
                          className="flex items-center space-x-3 text-xs font-medium cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPlatforms.includes(sa.id)}
                            onChange={() => togglePlatform(sa.id)}
                            className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <p>{sa.name}</p>
                            <p className="text-[10px] text-stone-500 font-mono uppercase">{sa.platform}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handlePublish}
                    disabled={publishLoading || socials.length === 0}
                    className="w-full flex items-center justify-center space-x-2 bg-stone-950 text-stone-50 dark:bg-stone-50 dark:text-stone-950 py-3 rounded-xl text-sm font-semibold hover:bg-stone-850 dark:hover:bg-stone-100 transition-colors disabled:opacity-50"
                  >
                    {publishLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{publishLoading ? 'กำลังส่งโพส...' : 'อนุมัติข่าวและโพสทันที'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center text-stone-500">
            <Newspaper className="w-10 h-10 text-stone-300 mb-2" />
            <h3 className="font-serif font-bold text-lg">ยินดีต้อนรับสู่ห้องร่างบทความ</h3>
            <p className="text-sm text-stone-400 mt-1 max-w-md">
              กรุณาเลือกข่าวสารดึงจากทางซ้าย เพื่อทำการเรียบเรียงภาษาไทยด้วย AI หรือแก้ไขบทความ เจนภาพใหม่ หรือนำส่งโพสออกหน้าสื่อโซเชียลมีเดีย
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DraftsRoom() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-20 bg-background">
        <RefreshCw className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    }>
      <DraftsRoomContent />
    </Suspense>
  );
}
