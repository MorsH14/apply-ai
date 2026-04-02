'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import dynamic from 'next/dynamic';
import type { FormEvent } from 'react';
import {
  Briefcase, FileText, Sparkles, Mail, Pencil, Trash2,
  ChevronDown, ChevronUp, Copy, Download, X, LogOut,
  Upload, Plus, Check, AlertCircle, MapPin, DollarSign,
  CalendarDays,
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
    setShowResumePanel(false);
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
  };

  const runAI = async (job: Job, type: 'tailor' | 'cover') => {
    setAiLoading(type);
    setAiOutput(null);
    setAiError(null);
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
              onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
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

        {/* ── Analytics ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3">
          {STATUSES.map(status => (
            <div key={status} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center flex flex-col items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${ANALYTICS_DOT[status]}`} />
              <div className={`text-2xl font-bold tracking-tight ${ANALYTICS_NUM[status]}`}>{counts[status]}</div>
              <div className="text-[11px] text-slate-500 capitalize font-medium">{status}</div>
            </div>
          ))}
        </div>

        {/* ── Resume Panel ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowResumePanel(!showResumePanel)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/60 transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <FileText size={17} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">My Resume</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {myResume
                    ? `${myResume.trim().split(/\s+/).length} words · ${resumeSavedAt ? `Last saved ${resumeSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'}`
                    : 'Not added yet — required for AI tools'}
                </p>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
              {showResumePanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {showResumePanel && (
            <div className="border-t border-slate-100 px-5 py-5 space-y-4">
              <p className="text-sm text-slate-500 leading-relaxed">
                Upload your resume <span className="font-medium text-slate-700">(PDF, DOCX, or TXT)</span> or paste it as plain text. It's stored securely and only used by AI tools.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('resume-file-input')?.click()}
                className={`relative flex flex-col items-center justify-center gap-2.5 border-2 border-dashed rounded-xl px-6 py-8 transition-all cursor-pointer
                  ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/40'}`}
              >
                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleResumeFile(f); e.target.value = ''; }}
                />
                {uploadingResume ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-blue-600 font-medium">Extracting text…</p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                      <Upload size={18} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      {dragOver ? 'Drop to upload' : 'Drag & drop your resume'}
                    </p>
                    <p className="text-xs text-slate-400">or click to browse — PDF, DOCX, TXT</p>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  <AlertCircle size={14} className="shrink-0" />
                  {uploadError}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or paste as text</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <textarea
                value={resumeDraft}
                onChange={e => setResumeDraft(e.target.value)}
                placeholder="Paste your full resume here — work experience, education, skills, achievements…"
                className="w-full h-52 p-4 border border-slate-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50/60 leading-relaxed text-slate-800 placeholder:text-slate-400 transition-colors"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {resumeDraft.trim() ? `${resumeDraft.trim().split(/\s+/).length} words` : 'Empty'}
                  {resumeDraft !== myResume && <span className="ml-2 text-amber-500 font-medium">· Unsaved changes</span>}
                </span>
                <button
                  onClick={handleSaveResume}
                  disabled={resumeSaving || !resumeDraft.trim() || resumeDraft === myResume}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 text-sm font-semibold disabled:opacity-40 transition-colors"
                >
                  {resumeSaving ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
                  ) : (
                    <><Check size={14} />Save Resume</>
                  )}
                </button>
              </div>
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
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors">
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
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => runAI(job, 'tailor')}
                            disabled={!myResume || aiLoading !== null}
                            className="flex items-center justify-center gap-2 flex-1 sm:flex-none bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                          >
                            {aiLoading === 'tailor' ? (
                              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Tailoring…</>
                            ) : (
                              <><FileText size={14} />Tailor My Resume</>
                            )}
                          </button>
                          <button
                            onClick={() => runAI(job, 'cover')}
                            disabled={!myResume || aiLoading !== null}
                            className="flex items-center justify-center gap-2 flex-1 sm:flex-none bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white border border-white/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                          >
                            {aiLoading === 'cover' ? (
                              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Writing…</>
                            ) : (
                              <><Mail size={14} />Write Cover Letter</>
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

                      {/* Output */}
                      {aiOutput && (
                        <div className="m-4 rounded-xl border border-slate-200 overflow-hidden">
                          {/* Output header */}
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
                          {/* Output body */}
                          <pre className="p-4 text-[13px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto bg-white">
                            {aiOutput.content}
                          </pre>
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
