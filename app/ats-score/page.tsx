'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Target, Sparkles, AlertCircle, Check, ArrowLeft, FileText,
  Download, Copy, RotateCcw, Upload,
} from 'lucide-react';

const TemplatePickerModal = dynamic(() => import('@/components/TemplatePickerModal'), { ssr: false });

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

type TemplateModalState = { content: string; type: 'resume' | 'cover'; company: string; position: string } | null;

const gradeStyle: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-rose-100 text-rose-700',
};
const sectionMax: Record<string, number> = { keywords: 35, experience: 30, summary: 20, format: 15 };

function scoreColor(n: number) { return n >= 90 ? 'text-emerald-600' : n >= 72 ? 'text-blue-600' : n >= 55 ? 'text-amber-500' : 'text-rose-500'; }
function barColor(n: number) { return n >= 90 ? 'bg-emerald-500' : n >= 72 ? 'bg-blue-500' : n >= 55 ? 'bg-amber-400' : 'bg-rose-400'; }

const INPUT = 'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors';

export default function AtsScorePage() {
  const { data: session } = useSession();

  const [myResume, setMyResume] = useState('');
  const [jobDescription, setJD] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');

  const [atsScore, setAtsScore] = useState<AtsScoreResult | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);

  const [boostResult, setBoostResult] = useState<string | null>(null);
  const [boostLoading, setBoostLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateModal, setTemplateModal] = useState<TemplateModalState>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/resume')
      .then(r => r.json())
      .then(data => { if (data.resume) setMyResume(data.resume); });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const runScore = async (resumeOverride?: string) => {
    const resumeToUse = resumeOverride ?? myResume;
    if (!resumeToUse || !jobDescription) return;
    setAtsLoading(true);
    setAtsError(null);
    setAtsScore(null);
    setBoostResult(null);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, resume: resumeToUse }),
      });
      const data = await res.json();
      if (!res.ok) setAtsError(data.error || 'Analysis failed');
      else setAtsScore(data);
    } catch {
      setAtsError('Network error — please try again.');
    } finally {
      setAtsLoading(false);
    }
  };

  const runBoost = async () => {
    if (!myResume || !jobDescription) return;
    setBoostLoading(true);
    setBoostResult(null);
    setAtsError(null);
    try {
      const res = await fetch('/api/ai/ats-boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, resume: myResume, company, position, atsAnalysis: atsScore }),
      });
      const data = await res.json();
      if (!res.ok) setAtsError(data.error || 'Boost failed');
      else setBoostResult(data.result);
    } catch {
      setAtsError('Network error — please try again.');
    } finally {
      setBoostLoading(false);
    }
  };

  const saveAsResume = async () => {
    if (!boostResult) return;
    setSaving(true);
    await fetch('/api/resume', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: boostResult }),
    });
    setMyResume(boostResult);
    setSaved(true);
    setSaving(false);
    showToast('Resume replaced with optimised version');
  };

  const rescoreWithNew = async () => {
    if (!boostResult) return;
    const boosted = boostResult;
    setBoostResult(null);
    setSaved(false);
    await runScore(boosted);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {templateModal && (
        <TemplatePickerModal
          content={templateModal.content}
          type={templateModal.type}
          company={templateModal.company}
          position={templateModal.position}
          onClose={() => setTemplateModal(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl border border-white/10">
          <Check size={14} className="text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors">
              <ArrowLeft size={15} />Dashboard
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Target size={14} className="text-blue-600" />
              </div>
              <span className="font-semibold text-slate-900 text-sm">ATS Score Checker</span>
            </div>
          </div>
          {session?.user?.name && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold">
                {session.user.name[0].toUpperCase()}
              </div>
              <span className="font-medium">{session.user.name}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── Left: Inputs ── */}
          <div className="space-y-5">

            {/* Step 1: Resume */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
                <span className="font-semibold text-slate-900 text-sm">Your Resume</span>
                {myResume ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                    <Check size={9} strokeWidth={3} />Loaded
                  </span>
                ) : (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md">
                    Required
                  </span>
                )}
              </div>
              <div className="p-5">
                {myResume ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 max-h-28 overflow-y-auto">
                      <p className="text-xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">
                        {myResume.slice(0, 500)}{myResume.length > 500 ? '…' : ''}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {myResume.trim().split(/\s+/).length} words ·{' '}
                      <Link href="/dashboard" className="text-blue-500 hover:underline">Replace in Dashboard</Link>
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <FileText size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">No resume saved yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">Upload your resume in the Dashboard first</p>
                    </div>
                    <Link href="/dashboard" className="text-sm font-semibold text-blue-600 hover:underline">
                      Go to Dashboard →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Job Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
                <span className="font-semibold text-slate-900 text-sm">Job Details</span>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Position <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer"
                      value={position}
                      onChange={e => setPosition(e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Company <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Stripe"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className={INPUT}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Job Description <span className="text-rose-400">*</span></label>
                  <textarea
                    value={jobDescription}
                    onChange={e => setJD(e.target.value)}
                    placeholder="Paste the full job description here…"
                    rows={8}
                    className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors resize-none"
                  />
                </div>

                {atsError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    <AlertCircle size={14} className="shrink-0" />
                    {atsError}
                  </div>
                )}

                <button
                  onClick={() => runScore()}
                  disabled={!myResume || !jobDescription || atsLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white py-3 rounded-xl text-sm font-bold hover:from-blue-700 hover:to-violet-700 disabled:opacity-40 transition-all shadow-sm shadow-blue-500/20"
                >
                  {atsLoading
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Analysing…</>
                    : <><Target size={15} />Check ATS Score</>
                  }
                </button>
                {!myResume && (
                  <p className="text-xs text-amber-600 text-center">Add your resume in the Dashboard to get started</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Results ── */}
          <div className="space-y-5">

            {/* Placeholder */}
            {!atsScore && !atsLoading && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <Target size={24} className="text-blue-500" />
                </div>
                <p className="text-base font-semibold text-slate-700">Your score will appear here</p>
                <p className="text-sm text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                  Paste a job description and click "Check ATS Score" to see how your resume performs.
                </p>
              </div>
            )}

            {/* Score result */}
            {atsScore && (() => {
              const s = atsScore;
              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Score hero */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-5 mb-4">
                      <div className="flex items-baseline gap-0.5">
                        <span className={`text-6xl font-black tabular-nums ${scoreColor(s.score)}`}>{s.score}</span>
                        <span className={`text-2xl font-bold ${scoreColor(s.score)}`}>%</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold px-3 py-1 rounded-lg ${gradeStyle[s.grade] ?? 'bg-slate-100 text-slate-600'}`}>
                            Grade {s.grade}
                          </span>
                          <span className={`text-sm font-semibold ${s.ready_to_apply ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {s.ready_to_apply ? '✓ Ready to apply' : '⚠ Needs work'}
                          </span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${barColor(s.score)}`} style={{ width: `${s.score}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      {s.verdict}
                    </p>
                  </div>

                  {/* Section breakdown */}
                  <div className="p-5 space-y-4 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Section Breakdown</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(Object.entries(s.sections) as [string, AtsSection][]).map(([key, sec]) => {
                        const max = sectionMax[key] ?? 25;
                        const pct = Math.round((sec.score / max) * 100);
                        const cls = pct >= 80 ? 'bg-emerald-50 border-emerald-200' : pct >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';
                        const numCls = pct >= 80 ? 'text-emerald-700' : pct >= 60 ? 'text-amber-600' : 'text-rose-600';
                        return (
                          <div key={key} className={`rounded-xl p-3.5 border ${cls}`}>
                            <div className={`text-2xl font-black ${numCls}`}>{pct}%</div>
                            <div className="text-xs font-bold text-slate-600 capitalize mt-0.5 mb-1">{key}</div>
                            {sec.issue && <div className="text-[11px] text-slate-500 leading-tight">{sec.issue}</div>}
                            {sec.fix && <div className="text-[11px] text-blue-600 leading-tight mt-1">{sec.fix}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top fix */}
                  {s.top_fix && (
                    <div className="px-5 py-4 border-b border-slate-100">
                      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-0.5">Top Fix</p>
                          <p className="text-xs text-amber-700 leading-relaxed">{s.top_fix}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  <div className="p-5 space-y-4 border-b border-slate-100">
                    {s.critical_missing.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Missing Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.critical_missing.map(w => (
                            <span key={w} className="text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-lg">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.matched.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Matched Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.matched.map(w => (
                            <span key={w} className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Boost CTA */}
                  <div className="p-5">
                    <button
                      onClick={runBoost}
                      disabled={boostLoading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-violet-500/20"
                    >
                      {boostLoading
                        ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Rewriting resume…</>
                        : <><Sparkles size={15} />Auto-Fix to 95%+ — Rewrite Resume</>
                      }
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Boost result */}
            {boostResult && (
              <div className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-violet-50 border-b border-violet-200">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-600" />
                    <span className="text-sm font-bold text-violet-900">Optimised Resume</span>
                    <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-md">Target 95%+</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copy(boostResult)}
                      className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 bg-white border border-violet-200 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                    >
                      {copied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy</>}
                    </button>
                    <button
                      onClick={() => setTemplateModal({ content: boostResult, type: 'resume', company, position })}
                      className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                    >
                      <Download size={11} />PDF
                    </button>
                  </div>
                </div>

                <pre className="p-5 text-[13px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto bg-white">
                  {boostResult}
                </pre>

                {/* Save + Re-score */}
                <div className="px-5 py-4 border-t border-violet-100 bg-violet-50/50 space-y-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Replace your saved resume with this optimised version, then re-score to confirm the improvement.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={saveAsResume}
                      disabled={saving || saved}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        saved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 shadow-sm shadow-blue-500/20'
                      }`}
                    >
                      {saving
                        ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
                        : saved
                          ? <><Check size={14} />Saved as My Resume</>
                          : <><FileText size={14} />Save as My Resume</>
                      }
                    </button>
                    {saved && (
                      <button
                        onClick={rescoreWithNew}
                        disabled={atsLoading}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors shrink-0"
                      >
                        <RotateCcw size={13} />Re-score
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
