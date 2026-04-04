'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import dynamic from 'next/dynamic';
import type { FormEvent } from 'react';
import {
  Briefcase, FileText, Sparkles, Mail, Pencil, Trash2,
  ChevronDown, ChevronUp, Copy, Download, X, LogOut,
  Upload, Plus, Check, AlertCircle, MapPin, DollarSign,
  CalendarDays, Link2, Brain, Target,
} from 'lucide-react';

const TemplatePickerModal = dynamic(() => import('@/components/TemplatePickerModal'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type Job = {
  _id: string;
  company: string;
  position: string;
  status: string;
  location?: string;
  salary?: string;
  jobDescription?: string;
  notes?: string;
  createdAt: string;
};

type FormState = {
  company: string;
  position: string;
  status: string;
  location: string;
  salary: string;
  jobDescription: string;
  notes: string;
};

type AiOutput = { type: 'tailor' | 'cover'; content: string };
type DocType = 'resume' | 'cover';

type TemplateModalState = {
  content: string;
  type: DocType;
  company: string;
  position: string;
} | null;

type AtsSection = { score: number; issue: string | null; fix: string | null };
type AtsScoreResult = {
  score: number;
  grade: string;
  verdict: string;
  ready_to_apply: boolean;
  sections: { keywords: AtsSection; experience: AtsSection; summary: AtsSection; format: AtsSection };
  critical_missing: string[];
  matched: string[];
  top_fix: string;
};
type PrepQuestion = { question: string; type: string; guidance: string };
type PrepResult = { questions: PrepQuestion[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'] as const;

const STATUS_BADGE: Record<string, string> = {
  saved:     'bg-sky-50 text-sky-700 border border-sky-200',
  applied:   'bg-amber-50 text-amber-700 border border-amber-200',
  interview: 'bg-violet-50 text-violet-700 border border-violet-200',
  offer:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected:  'bg-rose-50 text-rose-600 border border-rose-200',
};

const ANALYTICS_NUM: Record<string, string> = {
  saved:     'text-sky-600',
  applied:   'text-amber-500',
  interview: 'text-violet-600',
  offer:     'text-emerald-600',
  rejected:  'text-rose-500',
};

const ANALYTICS_BAR: Record<string, string> = {
  saved:     'bg-sky-400',
  applied:   'bg-amber-400',
  interview: 'bg-violet-400',
  offer:     'bg-emerald-400',
  rejected:  'bg-rose-400',
};

const ANALYTICS_DOT: Record<string, string> = {
  saved:     'bg-sky-400',
  applied:   'bg-amber-400',
  interview: 'bg-violet-400',
  offer:     'bg-emerald-400',
  rejected:  'bg-rose-400',
};

const EMPTY_FORM: FormState = {
  company: '', position: '', status: 'saved',
  location: '', salary: '', jobDescription: '', notes: '',
};

// ─── Shared input / label styles ──────────────────────────────────────────────

const INPUT = 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors';
const LABEL = 'block text-xs font-medium text-slate-600 mb-1.5';

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addState, setAddState] = useState<FormState>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FormState>(EMPTY_FORM);

  const [myResume, setMyResume] = useState('');
  const [resumeDraft, setResumeDraft] = useState('');
  const [resumeSaving, setResumeSaving] = useState(false);
  const [resumeSavedAt, setResumeSavedAt] = useState<Date | null>(null);
  const [showResumePanel, setShowResumePanel] = useState(false);
  const [resumeMode, setResumeMode] = useState<'view' | 'edit'>('view');
  const [resumeTab, setResumeTab] = useState<'upload' | 'paste'>('upload');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [aiOpenId, setAiOpenId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<'tailor' | 'cover' | null>(null);
  const [aiOutput, setAiOutput] = useState<AiOutput | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [templateModal, setTemplateModal] = useState<TemplateModalState>(null);

  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [atsLoading, setAtsLoading] = useState(false);
  const [atsScore, setAtsScore] = useState<AtsScoreResult | null>(null);
  const [atsBoostLoading, setAtsBoostLoading] = useState(false);
  const [atsBoostResult, setAtsBoostResult] = useState<string | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepResult, setPrepResult] = useState<PrepResult | null>(null);

  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then(setJobs);
  }, []);

  useEffect(() => {
    fetch('/api/resume')
      .then(r => r.json())
      .then(data => {
        if (data.resume) { setMyResume(data.resume); setResumeDraft(data.resume); }
      });
  }, []);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = jobs.filter(j => j.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveResume = async () => {
    setResumeSaving(true);
    await fetch('/api/resume', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: resumeDraft }),
    });
    setMyResume(resumeDraft);
    setResumeSavedAt(new Date());
    setResumeSaving(false);
    setResumeMode('view');
    showToast('Resume saved successfully');
  };

  const handleResumeFile = async (file: File) => {
    setUploadError(null);
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadError('Unsupported file. Please upload a PDF, DOCX, or TXT file.');
      return;
    }
    setUploadingResume(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/resume/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error || 'Upload failed.'); return; }
      setResumeDraft(data.text);
      setUploadedFileName(file.name);
    } catch {
      setUploadError('Network error — please try again.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleResumeFile(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addState),
    });
    const newJob = await res.json();
    setJobs([newJob, ...jobs]);
    setAddState(EMPTY_FORM);
    setShowAddForm(false);
  };

  const startEdit = (job: Job) => {
    setEditingId(job._id);
    setEditState({
      company: job.company, position: job.position, status: job.status,
      location: job.location || '', salary: job.salary || '',
      jobDescription: job.jobDescription || '', notes: job.notes || '',
    });
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editState),
    });
    if (res.ok) {
      const updated = await res.json();
      setJobs(jobs.map(j => j._id === id ? updated : j));
      setEditingId(null);
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Remove this job from your tracker?')) return;
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    if (res.ok) setJobs(jobs.filter(j => j._id !== id));
  };

  const deleteAll = async () => {
    if (!confirm('Delete all jobs? This cannot be undone.')) return;
    await fetch('/api/jobs', { method: 'DELETE' });
    setJobs([]);
  };

  const openAiPanel = (jobId: string) => {
    const newId = aiOpenId === jobId ? null : jobId;
    setAiOpenId(newId);
    setAiOutput(null);
    setAiError(null);
    setAtsScore(null);
    setAtsBoostResult(null);
    setPrepResult(null);
  };

  const runAI = async (job: Job, type: 'tailor' | 'cover') => {
    setAiLoading(type);
    setAiOutput(null);
    setAiError(null);
    setAtsScore(null);
    setAtsBoostResult(null);
    setPrepResult(null);
    const endpoint = type === 'tailor' ? '/api/ai/tailor' : '/api/ai/cover-letter';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: job.jobDescription, resume: myResume, company: job.company, position: job.position }),
    });
    const data = await res.json();
    if (!res.ok) setAiError(data.error || 'Something went wrong');
    else setAiOutput({ type, content: data.result });
    setAiLoading(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openTemplatePicker = (content: string, type: 'tailor' | 'cover', company: string, position: string) => {
    setTemplateModal({ content, type: type === 'tailor' ? 'resume' : 'cover', company, position });
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImportLoading(true);
    setImportError(null);
    try {
      const res = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setImportError(data.error || 'Import failed'); return; }
      setAddState(prev => ({
        ...prev,
        company: data.company || prev.company,
        position: data.position || prev.position,
        location: data.location || prev.location,
        salary: data.salary || prev.salary,
        jobDescription: data.jobDescription || prev.jobDescription,
      }));
      setImportUrl('');
      showToast('Job imported — review and save');
    } catch {
      setImportError('Network error — please try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const runATS = async (job: Job) => {
    if (!myResume || !job.jobDescription) return;
    setAtsLoading(true);
    setAiOutput(null);
    setAiError(null);
    setPrepResult(null);
    setAtsScore(null);
    setAtsBoostResult(null);
    try {
      const res = await fetch('/api/ai/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: job.jobDescription, resume: myResume }),
      });
      const data = await res.json();
      if (!res.ok) setAiError(data.error || 'ATS analysis failed');
      else setAtsScore(data);
    } catch {
      setAiError('Network error — please try again.');
    } finally {
      setAtsLoading(false);
    }
  };

  const runAtsBoost = async (job: Job) => {
    if (!myResume || !job.jobDescription) return;
    setAtsBoostLoading(true);
    setAtsBoostResult(null);
    try {
      const res = await fetch('/api/ai/ats-boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: job.jobDescription,
          resume: myResume,
          company: job.company,
          position: job.position,
          atsAnalysis: atsScore,
        }),
      });
      const data = await res.json();
      if (!res.ok) setAiError(data.error || 'Boost failed');
      else setAtsBoostResult(data.result);
    } catch {
      setAiError('Network error — please try again.');
    } finally {
      setAtsBoostLoading(false);
    }
  };

  const runInterviewPrep = async (job: Job) => {
    setPrepLoading(true);
    setAiOutput(null);
    setAiError(null);
    setAtsScore(null);
    setAtsBoostResult(null);
    setPrepResult(null);
    try {
      const res = await fetch('/api/ai/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: job.jobDescription,
          resume: myResume,
          company: job.company,
          position: job.position,
        }),
      });
      const data = await res.json();
      if (!res.ok) setAiError(data.error || 'Something went wrong');
      else setPrepResult(data);
    } catch {
      setAiError('Network error — please try again.');
    } finally {
      setPrepLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Template picker modal */}
      {templateModal && (
        <TemplatePickerModal
          content={templateModal.content}
          type={templateModal.type}
          company={templateModal.company}
          position={templateModal.position}
          onClose={() => setTemplateModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl border border-white/10 animate-fade-in">
          <Check size={14} className="text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              G
            </div>
            <div className="leading-none">
              <span className="text-[15px] font-bold text-slate-900 tracking-tight">Genova</span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-2">
                {jobs.length} application{jobs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {session?.user?.name && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 pl-2 pr-3 py-1.5 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {session.user.name[0].toUpperCase()}
                </div>
                <span className="font-medium">{session.user.name}</span>
              </div>
            )}
            <button
              onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); setImportUrl(''); setImportError(null); }}
              className="flex items-center gap-1.5 bg-linear-to-r from-blue-600 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-violet-700 transition-all shadow-sm shadow-blue-500/20"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add Job
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Page body ──────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Pipeline Analytics ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Application Pipeline</h2>
            <span className="text-xs text-slate-400 font-medium">{jobs.length} total</span>
          </div>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {STATUSES.map(status => (
              <div key={status} className="text-center">
                <div className={`text-xl font-black tracking-tight ${ANALYTICS_NUM[status]}`}>{counts[status]}</div>
                <div className="text-[10px] text-slate-400 capitalize font-semibold mt-0.5">{status}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {STATUSES.map(status => {
              const pct = jobs.length > 0 ? (counts[status] / jobs.length) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ANALYTICS_DOT[status]}`} />
                  <div className="w-14 text-[11px] font-semibold text-slate-500 capitalize">{status}</div>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${ANALYTICS_BAR[status]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-7 text-right text-[11px] font-bold text-slate-400">
                    {pct > 0 ? `${Math.round(pct)}%` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Resume Panel ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => {
              const next = !showResumePanel;
              setShowResumePanel(next);
              if (next) {
                setResumeMode(myResume ? 'view' : 'edit');
                setResumeTab('upload');
                setUploadedFileName('');
                setUploadError(null);
              }
            }}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/60 transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${myResume ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                <FileText size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 text-sm">My Resume</p>
                  {myResume ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                      <Check size={9} strokeWidth={3} />Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md">
                      Required for AI
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {myResume
                    ? `${myResume.trim().split(/\s+/).length} words${resumeSavedAt ? ` · Saved ${resumeSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
                    : 'Add your resume to unlock all AI features'}
                </p>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
              {showResumePanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {showResumePanel && (
            <div className="border-t border-slate-100">

              {/* ── View mode: resume is saved and no pending edits ── */}
              {resumeMode === 'view' && myResume ? (
                <div className="p-5 space-y-4">

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const wc = myResume.trim().split(/\s+/).length;
                      const quality = wc < 150 ? { label: 'Too short', cls: 'bg-amber-50 text-amber-700 border-amber-200' } : wc < 350 ? { label: 'Good', cls: 'bg-blue-50 text-blue-700 border-blue-200' } : { label: 'Strong', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                      return (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg">
                            <FileText size={12} />{wc} words
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-3 py-1.5 rounded-lg ${quality.cls}`}>
                            {quality.label}
                          </span>
                          {uploadedFileName && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg truncate max-w-[180px]">
                              <Check size={11} className="text-emerald-500 shrink-0" />{uploadedFileName}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Preview card */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Resume Preview</span>
                      <span className="text-[11px] text-slate-400">First 400 characters</span>
                    </div>
                    <div className="px-4 py-3.5 bg-white">
                      <p className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap line-clamp-5">
                        {myResume.slice(0, 400)}{myResume.length > 400 ? '…' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setResumeMode('edit'); setResumeTab('upload'); setUploadedFileName(''); setUploadError(null); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors"
                    >
                      <Upload size={13} />Replace File
                    </button>
                    <button
                      onClick={() => { setResumeMode('edit'); setResumeTab('paste'); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors"
                    >
                      <Pencil size={13} />Edit Text
                    </button>
                  </div>
                </div>

              ) : (
                /* ── Edit mode: upload or paste ── */
                <div className="p-5 space-y-4">

                  {/* Tab switcher */}
                  <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
                    <button
                      onClick={() => setResumeTab('upload')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${resumeTab === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Upload size={13} />Upload File
                    </button>
                    <button
                      onClick={() => setResumeTab('paste')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${resumeTab === 'paste' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Pencil size={13} />Paste Text
                    </button>
                  </div>

                  {resumeTab === 'upload' ? (
                    <div className="space-y-3">

                      {/* Drop zone */}
                      <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('resume-file-input')?.click()}
                        className={`relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl px-6 py-12 cursor-pointer transition-all ${
                          dragOver
                            ? 'border-blue-400 bg-blue-50/70 scale-[1.01]'
                            : uploadedFileName
                              ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                              : 'border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <input
                          id="resume-file-input"
                          type="file"
                          accept=".pdf,.docx,.txt"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleResumeFile(f); e.target.value = ''; }}
                        />

                        {uploadingResume ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                              <div className="w-6 h-6 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold text-blue-700">Extracting text…</p>
                              <p className="text-xs text-blue-500 mt-0.5">Reading your resume</p>
                            </div>
                          </div>
                        ) : uploadedFileName ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                              <Check size={26} className="text-emerald-600" strokeWidth={2.5} />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold text-emerald-700">{uploadedFileName}</p>
                              <p className="text-xs text-emerald-600 mt-0.5">{resumeDraft.trim().split(/\s+/).length} words extracted · click to replace</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                              <Upload size={24} className="text-white" />
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-sm font-bold text-slate-800">
                                {dragOver ? 'Drop it here' : 'Drag & drop your resume'}
                              </p>
                              <p className="text-xs text-slate-400">or click to browse your files</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {['PDF', 'DOCX', 'TXT'].map(fmt => (
                                <span key={fmt} className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm tracking-wide">
                                  {fmt}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {uploadError && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                          <AlertCircle size={14} className="shrink-0" />
                          {uploadError}
                        </div>
                      )}
                    </div>

                  ) : (
                    /* Paste tab */
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Paste your full resume — name, contact info, work experience, education, and skills.
                      </p>
                      <textarea
                        value={resumeDraft}
                        onChange={e => setResumeDraft(e.target.value)}
                        placeholder={'John Smith\njohn@email.com | +1 555 000 0000\n\nEXPERIENCE\nCompany Name | Role | 2022–Present\n• Achievement with measurable impact…'}
                        className="w-full h-64 p-4 border border-slate-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50/60 leading-relaxed text-slate-800 placeholder:text-slate-400 transition-colors"
                      />
                    </div>
                  )}

                  {/* Word count + save row — show when there's content to save */}
                  {resumeDraft.trim() && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const wc = resumeDraft.trim().split(/\s+/).length;
                          const quality = wc < 150 ? { label: 'Too short — add more detail', cls: 'text-amber-600 bg-amber-50 border-amber-200' } : wc < 350 ? { label: `${wc} words — good`, cls: 'text-blue-600 bg-blue-50 border-blue-200' } : { label: `${wc} words — strong`, cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
                          return <span className={`text-[11px] font-semibold border px-2 py-1 rounded-lg ${quality.cls}`}>{quality.label}</span>;
                        })()}
                        {resumeDraft !== myResume && (
                          <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">Unsaved</span>
                        )}
                      </div>
                      <button
                        onClick={handleSaveResume}
                        disabled={resumeSaving || !resumeDraft.trim() || resumeDraft === myResume}
                        className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-violet-600 text-white px-5 py-2 rounded-xl hover:from-blue-700 hover:to-violet-700 text-sm font-semibold disabled:opacity-40 transition-all shadow-sm shadow-blue-500/20"
                      >
                        {resumeSaving
                          ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
                          : <><Check size={14} />Save Resume</>
                        }
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Add Job Form ──────────────────────────────────────────── */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Briefcase size={14} />
                </div>
                <h2 className="font-semibold text-slate-900 text-sm">Add New Job</h2>
              </div>
              <button onClick={() => setShowAddForm(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">

              {/* ── URL Import ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={LABEL + ' mb-0'}>Import from job listing URL</label>
                  <span className="text-[11px] text-slate-400">Works with LinkedIn, Indeed, Greenhouse, Lever, Workday, Zoho & more</span>
                </div>

                {/* How-to hint */}
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
                  <Link2 size={13} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Open the job listing in your browser → copy the URL from the address bar → paste it below. Make sure it's the page for a <span className="font-semibold">specific job</span>, not a search results page.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://www.linkedin.com/jobs/view/… or any job listing URL"
                    value={importUrl}
                    onChange={e => { setImportUrl(e.target.value); setImportError(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleImport(); } }}
                    className={INPUT}
                  />
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!importUrl.trim() || importLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors shrink-0"
                  >
                    {importLoading ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Importing…</>
                    ) : (
                      <><Link2 size={13} />Import</>
                    )}
                  </button>
                </div>

                {importError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    <AlertCircle size={14} className="shrink-0" />
                    {importError}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or fill in manually</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Company <span className="text-rose-400">*</span></label>
                  <input placeholder="e.g. Stripe" required value={addState.company}
                    onChange={e => setAddState({ ...addState, company: e.target.value })}
                    className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Position <span className="text-rose-400">*</span></label>
                  <input placeholder="e.g. Senior Engineer" required value={addState.position}
                    onChange={e => setAddState({ ...addState, position: e.target.value })}
                    className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Location</label>
                  <input placeholder="e.g. Remote / New York" value={addState.location}
                    onChange={e => setAddState({ ...addState, location: e.target.value })}
                    className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Salary / Range</label>
                  <input placeholder="e.g. $120k – $150k" value={addState.salary}
                    onChange={e => setAddState({ ...addState, salary: e.target.value })}
                    className={INPUT} />
                </div>
              </div>
              <div>
                <label className={LABEL}>
                  Job Description
                  <span className="ml-1.5 text-slate-400 font-normal">— paste here to unlock AI tailoring</span>
                </label>
                <textarea
                  placeholder="Paste the full job description…"
                  value={addState.jobDescription}
                  onChange={e => setAddState({ ...addState, jobDescription: e.target.value })}
                  className={`${INPUT} h-28 resize-none`}
                />
              </div>
              <div>
                <label className={LABEL}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  placeholder="Referral contact, interview notes, deadlines…"
                  value={addState.notes}
                  onChange={e => setAddState({ ...addState, notes: e.target.value })}
                  className={`${INPUT} h-16 resize-none`}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-violet-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-violet-700 text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
                  <Plus size={14} strokeWidth={2.5} />Add Job
                </button>
                <button type="button" onClick={() => { setShowAddForm(false); setImportUrl(''); setImportError(null); }} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Job List ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md">

              {editingId === job._id ? (
                /* ── Edit Mode ── */
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Pencil size={13} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Editing</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Company</label>
                      <input value={editState.company} placeholder="Company" onChange={e => setEditState({ ...editState, company: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Position</label>
                      <input value={editState.position} placeholder="Position" onChange={e => setEditState({ ...editState, position: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Location</label>
                      <input value={editState.location} placeholder="Location" onChange={e => setEditState({ ...editState, location: e.target.value })} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Salary / Range</label>
                      <input value={editState.salary} placeholder="Salary" onChange={e => setEditState({ ...editState, salary: e.target.value })} className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Status</label>
                    <select
                      value={editState.status}
                      onChange={e => setEditState({ ...editState, status: e.target.value })}
                      className={INPUT}
                    >
                      {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Job Description</label>
                    <textarea value={editState.jobDescription} placeholder="Job Description" onChange={e => setEditState({ ...editState, jobDescription: e.target.value })} className={`${INPUT} h-28 resize-none`} />
                  </div>
                  <div>
                    <label className={LABEL}>Notes</label>
                    <textarea value={editState.notes} placeholder="Notes" onChange={e => setEditState({ ...editState, notes: e.target.value })} className={`${INPUT} h-16 resize-none`} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveEdit(job._id)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 text-sm font-semibold transition-colors">
                      <Check size={14} />Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>

              ) : (
                /* ── View Mode ── */
                <>
                  <div className="p-5">
                    {/* Top row: info + badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[15px] text-slate-900 leading-snug truncate">{job.position}</h3>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">{job.company}</p>

                        {/* Meta chips */}
                        {(job.location || job.salary) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                            {job.location && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                <MapPin size={10} strokeWidth={2} />{job.location}
                              </span>
                            )}
                            {job.salary && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                <DollarSign size={10} strokeWidth={2} />{job.salary}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                              <CalendarDays size={10} strokeWidth={2} />
                              {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>

                      <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize ${STATUS_BADGE[job.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {job.status}
                      </span>
                    </div>

                    {/* Notes */}
                    {job.notes && (
                      <p className="mt-3.5 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed">
                        {job.notes}
                      </p>
                    )}

                    {/* Action row */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => startEdit(job)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-medium transition-colors"
                      >
                        <Pencil size={12} />Edit
                      </button>
                      <button
                        onClick={() => deleteJob(job._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50 text-xs font-medium transition-colors"
                      >
                        <Trash2 size={12} />Delete
                      </button>

                      {job.jobDescription && (
                        <button
                          onClick={() => openAiPanel(job._id)}
                          className={`ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            aiOpenId === job._id
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-linear-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-sm shadow-violet-500/20'
                          }`}
                        >
                          <Sparkles size={12} />
                          AI Tools
                          {aiOpenId === job._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── AI Panel ── */}
                  {aiOpenId === job._id && (
                    <div className="border-t border-slate-100">
                      {/* Dark toolbar */}
                      <div className="bg-slate-900 px-5 py-4">
                        {!myResume && (
                          <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3.5 py-2.5 mb-4">
                            <AlertCircle size={13} className="shrink-0" />
                            Add your resume above to unlock AI tools.
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                          <button
                            onClick={() => runAI(job, 'tailor')}
                            disabled={!myResume || aiLoading !== null || prepLoading}
                            className="flex items-center justify-center gap-2 flex-1 sm:flex-none bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                          >
                            {aiLoading === 'tailor' ? (
                              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Tailoring…</>
                            ) : (
                              <><FileText size={14} />Tailor Resume</>
                            )}
                          </button>
                          <button
                            onClick={() => runAI(job, 'cover')}
                            disabled={!myResume || aiLoading !== null || prepLoading}
                            className="flex items-center justify-center gap-2 flex-1 sm:flex-none bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                          >
                            {aiLoading === 'cover' ? (
                              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Writing…</>
                            ) : (
                              <><Mail size={14} />Cover Letter</>
                            )}
                          </button>
                          <button
                            onClick={() => runATS(job)}
                            disabled={!myResume || aiLoading !== null || prepLoading || atsLoading || atsBoostLoading}
                            className="flex items-center justify-center gap-2 flex-1 sm:flex-none bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                          >
                            {atsLoading
                              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analysing…</>
                              : <><Target size={14} />ATS Score</>
                            }
                          </button>
                          <button
                            onClick={() => runInterviewPrep(job)}
                            disabled={!myResume || aiLoading !== null || prepLoading}
                            className="flex items-center justify-center gap-2 flex-1 sm:flex-none bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                          >
                            {prepLoading ? (
                              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Prepping…</>
                            ) : (
                              <><Brain size={14} />Interview Prep</>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Error */}
                      {aiError && (
                        <div className="flex items-center gap-2 mx-5 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                          <AlertCircle size={14} className="shrink-0" />
                          {aiError}
                        </div>
                      )}

                      {/* Tailor / Cover Letter output */}
                      {aiOutput && (
                        <div className="m-4 rounded-xl border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              {aiOutput.type === 'tailor'
                                ? <FileText size={14} className="text-violet-600" />
                                : <Mail size={14} className="text-indigo-600" />
                              }
                              <span className="text-sm font-semibold text-slate-800">
                                {aiOutput.type === 'tailor' ? 'Tailored Resume' : 'Cover Letter'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => copyToClipboard(aiOutput.content)}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg font-medium transition-colors hover:border-slate-300"
                              >
                                {copied ? <><Check size={11} className="text-emerald-500" />Copied</> : <><Copy size={11} />Copy</>}
                              </button>
                              <button
                                onClick={() => openTemplatePicker(aiOutput.content, aiOutput.type, job.company, job.position)}
                                className="flex items-center gap-1.5 text-xs text-white bg-slate-800 hover:bg-slate-900 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                              >
                                <Download size={11} />Download PDF
                              </button>
                              <button
                                onClick={() => setAiOutput(null)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                          <pre className="p-4 text-[13px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto bg-white">
                            {aiOutput.content}
                          </pre>
                        </div>
                      )}

                      {/* ATS Score output */}
                      {atsScore && (() => {
                        const s = atsScore;
                        const scoreColor = s.score >= 90 ? 'text-emerald-600' : s.score >= 72 ? 'text-blue-600' : s.score >= 55 ? 'text-amber-500' : 'text-rose-500';
                        const barColor = s.score >= 90 ? 'bg-emerald-500' : s.score >= 72 ? 'bg-blue-500' : s.score >= 55 ? 'bg-amber-400' : 'bg-rose-400';
                        const gradeStyle: Record<string, string> = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-blue-100 text-blue-700', C: 'bg-amber-100 text-amber-700', D: 'bg-orange-100 text-orange-700', F: 'bg-rose-100 text-rose-700' };
                        const sectionMax: Record<string, number> = { keywords: 35, experience: 30, summary: 20, format: 15 };
                        return (
                          <div className="m-4 rounded-2xl border border-slate-200 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <Target size={14} className="text-blue-600" />
                                <span className="text-sm font-bold text-slate-800">ATS Score Analysis</span>
                              </div>
                              <button onClick={() => { setAtsScore(null); setAtsBoostResult(null); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={14} />
                              </button>
                            </div>

                            <div className="p-4 space-y-5 bg-white">
                              {/* Score hero */}
                              <div className="flex items-center gap-4">
                                <div className="flex items-baseline gap-0.5">
                                  <span className={`text-5xl font-black tabular-nums ${scoreColor}`}>{s.score}</span>
                                  <span className={`text-xl font-bold ${scoreColor}`}>%</span>
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${gradeStyle[s.grade] ?? 'bg-slate-100 text-slate-600'}`}>Grade {s.grade}</span>
                                    <span className={`text-xs font-bold ${s.ready_to_apply ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {s.ready_to_apply ? '✓ Ready to apply' : '⚠ Needs work'}
                                    </span>
                                  </div>
                                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${s.score}%` }} />
                                  </div>
                                </div>
                              </div>

                              {/* Verdict */}
                              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 leading-relaxed">{s.verdict}</p>

                              {/* Section breakdown */}
                              <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Section Breakdown</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {(Object.entries(s.sections) as [string, AtsSection][]).map(([key, sec]) => {
                                    const max = sectionMax[key] ?? 25;
                                    const pct = Math.round((sec.score / max) * 100);
                                    const cls = pct >= 80 ? 'bg-emerald-50 border-emerald-200' : pct >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';
                                    const numCls = pct >= 80 ? 'text-emerald-700' : pct >= 60 ? 'text-amber-600' : 'text-rose-600';
                                    return (
                                      <div key={key} className={`rounded-xl p-3 border ${cls}`}>
                                        <div className={`text-lg font-black ${numCls}`}>{pct}%</div>
                                        <div className="text-[11px] font-bold text-slate-600 capitalize mb-1.5">{key}</div>
                                        {sec.issue && <div className="text-[10px] text-slate-500 leading-tight">{sec.issue}</div>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Top fix */}
                              {s.top_fix && (
                                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-0.5">Top Fix</p>
                                    <p className="text-xs text-amber-700 leading-relaxed">{s.top_fix}</p>
                                  </div>
                                </div>
                              )}

                              {/* Keywords */}
                              {s.critical_missing.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Critical Missing Keywords</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {s.critical_missing.map(w => (
                                      <span key={w} className="text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-lg">{w}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {s.matched.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Matched Keywords</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {s.matched.map(w => (
                                      <span key={w} className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">{w}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Auto-fix CTA */}
                              <button
                                onClick={() => runAtsBoost(job)}
                                disabled={atsBoostLoading}
                                className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-violet-500/20"
                              >
                                {atsBoostLoading
                                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Optimising resume…</>
                                  : <><Sparkles size={15} />Auto-Fix to 90%+ — Rewrite My Resume</>
                                }
                              </button>

                              {/* Boosted resume output */}
                              {atsBoostResult && (
                                <div className="rounded-xl border border-violet-200 overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border-b border-violet-200">
                                    <div className="flex items-center gap-2">
                                      <Sparkles size={13} className="text-violet-600" />
                                      <span className="text-sm font-bold text-violet-900">Optimised Resume — Target 90%+</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => copyToClipboard(atsBoostResult)}
                                        className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 bg-white border border-violet-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                                      >
                                        {copied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy</>}
                                      </button>
                                      <button
                                        onClick={() => openTemplatePicker(atsBoostResult, 'tailor', job.company, job.position)}
                                        className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                                      >
                                        <Download size={11} />PDF
                                      </button>
                                    </div>
                                  </div>
                                  <pre className="p-4 text-[13px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto bg-white">
                                    {atsBoostResult}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Interview Prep output */}
                      {prepResult && (
                        <div className="m-4 rounded-xl border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <Brain size={14} className="text-violet-600" />
                              <span className="text-sm font-semibold text-slate-800">Interview Prep</span>
                              <span className="text-xs text-slate-400 font-normal">— {prepResult.questions?.length ?? 0} questions</span>
                            </div>
                            <button onClick={() => setPrepResult(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="divide-y divide-slate-100 bg-white max-h-[520px] overflow-y-auto">
                            {prepResult.questions?.map((q, i) => (
                              <div key={i} className="p-4 space-y-2">
                                <div className="flex items-start gap-2.5">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-semibold text-slate-900 leading-snug">{q.question}</p>
                                    </div>
                                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded mb-1.5 ${
                                      q.type === 'behavioral' ? 'bg-blue-50 text-blue-600' :
                                      q.type === 'technical' ? 'bg-emerald-50 text-emerald-700' :
                                      'bg-amber-50 text-amber-700'
                                    }`}>{q.type}</span>
                                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-2.5 border border-slate-100">{q.guidance}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Empty state */}
          {jobs.length === 0 && !showAddForm && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-5">
                <Briefcase size={28} className="text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-700">No jobs tracked yet</p>
              <p className="text-sm text-slate-400 mt-1.5 mb-6">Start building your pipeline by adding your first job.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-violet-700 transition-all shadow-sm shadow-blue-500/20"
              >
                <Plus size={15} strokeWidth={2.5} />Add your first job
              </button>
            </div>
          )}
        </div>

        {/* ── Danger zone ──────────────────────────────────────────── */}
        {jobs.length > 0 && (
          <div className="pt-6 pb-2 flex justify-center border-t border-slate-200">
            <button
              onClick={deleteAll}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
            >
              <Trash2 size={12} />Delete all jobs
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
