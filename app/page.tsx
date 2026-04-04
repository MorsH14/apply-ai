'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Sparkles, FileText, Target, Brain, Mail, BarChart3,
  ArrowRight, Check, ChevronRight, Briefcase, Zap,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'ATS Score Analysis',
    desc: 'Know exactly how your resume scores before you hit apply. Get a breakdown by section — keywords, experience, summary, format — with a letter grade and specific fixes.',
  },
  {
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Auto-Fix to 90%+',
    desc: "One click rewrites your resume to target 90%+ ATS compatibility. Every missing keyword is integrated naturally. Every weak bullet is strengthened with real impact.",
  },
  {
    icon: FileText,
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'AI Resume Tailoring',
    desc: 'Paste a job description and get a resume tuned for that exact role in seconds. Mirrors the JD language, hits the keywords, and reads like a human wrote it.',
  },
  {
    icon: Mail,
    color: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    title: 'Cover Letters That Get Replies',
    desc: 'Compelling, personalised cover letters generated in seconds. No clichés, no fluff — just specific, confident writing that hiring managers actually read.',
  },
  {
    icon: Brain,
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Interview Prep',
    desc: 'Get 8 tailored interview questions based on the job description and your resume. Each with coaching notes that reference your specific background — not generic advice.',
  },
  {
    icon: BarChart3,
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    title: 'Application Pipeline',
    desc: 'Track every application — saved, applied, interview, offer, rejected — in one clean dashboard. Import job listings from any URL with a single click.',
  },
];

const STEPS = [
  { n: '01', title: 'Upload your resume', desc: 'Drop a PDF, DOCX, or paste text. Genova reads it once and uses it across every feature.' },
  { n: '02', title: 'Import any job listing', desc: 'Paste a URL from LinkedIn, Greenhouse, Ashby, Workday, or anywhere. Genova extracts the details automatically.' },
  { n: '03', title: 'Let the AI do the work', desc: 'Score your resume, fix it to 90%+, tailor it, write the cover letter, and prep for the interview — in under a minute.' },
];

const TESTIMONIALS = [
  { quote: "I went from a 54% ATS score to 91% in one click. Got a callback the same week.", name: "Sofia R.", role: "Product Manager" },
  { quote: "The cover letters don't sound AI-generated at all. I've gotten replies on every one I've sent.", name: "James K.", role: "Software Engineer" },
  { quote: "Finally, a job tracker that actually helps instead of just storing data.", name: "Amara D.", role: "UX Designer" },
];

const STATS = [
  { value: '91%', label: 'Average ATS score after boost' },
  { value: '3×', label: 'More callbacks reported' },
  { value: '60s', label: 'To tailor a resume end-to-end' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              G
            </div>
            <span className="text-[17px] font-black tracking-tight text-slate-900">Genova</span>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:from-blue-700 hover:to-violet-700 transition-all shadow-sm shadow-blue-500/20"
              >
                Go to Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:from-blue-700 hover:to-violet-700 transition-all shadow-sm shadow-blue-500/20"
                >
                  Get Started Free <ArrowRight size={13} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-slate-950">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 left-1/2 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/2" />
        </div>

        <div className="relative max-w-4xl mx-auto px-5 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <Zap size={12} className="text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">AI-powered job search — built for 2025</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05] mb-6">
            Apply smarter.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Land faster.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            Genova turns your resume into a targeted weapon. Score your ATS compatibility, auto-fix it to 90%+, tailor it for any role, write the cover letter, and prep for the interview — all in under a minute.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link
              href="/login"
              className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-8 py-3.5 rounded-2xl text-base font-bold hover:from-blue-600 hover:to-violet-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Start for free
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 bg-white/5 border border-white/15 text-white px-8 py-3.5 rounded-2xl text-base font-bold hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
            {STATS.map(s => (
              <div key={s.value} className="text-center">
                <div className="text-3xl font-black text-white">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* App mockup */}
        <div className="relative max-w-4xl mx-auto px-5 mt-20">
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl shadow-black/50">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white/5 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-rose-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              <div className="flex-1 mx-3 bg-white/5 rounded-md h-5 flex items-center justify-center">
                <span className="text-[10px] text-slate-500">app.genova.ai/dashboard</span>
              </div>
            </div>

            {/* Mock UI */}
            <div className="p-5 space-y-3">
              {/* Pipeline */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Application Pipeline</span>
                  <span className="text-[11px] text-slate-500">12 total</span>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[['3','Saved','text-sky-400'],['5','Applied','text-amber-400'],['2','Interview','text-violet-400'],['1','Offer','text-emerald-400'],['1','Rejected','text-rose-400']].map(([n, l, c]) => (
                    <div key={l} className="text-center">
                      <div className={`text-lg font-black ${c}`}>{n}</div>
                      <div className="text-[9px] text-slate-500 font-semibold">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {[['bg-sky-500',25],['bg-amber-500',42],['bg-violet-500',17],['bg-emerald-500',8],['bg-rose-500',8]].map(([c, w], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/5 rounded-full">
                        <div className={`h-full rounded-full ${c}`} style={{ width: `${w}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Job cards */}
              {[
                { title: 'Senior Software Engineer', company: 'Stripe', status: 'Interview', statusCls: 'bg-violet-500/20 text-violet-300', score: 94, scoreCls: 'text-emerald-400' },
                { title: 'Full Stack Developer', company: 'The Flex', status: 'Applied', statusCls: 'bg-amber-500/20 text-amber-300', score: 78, scoreCls: 'text-blue-400' },
              ].map(job => (
                <div key={job.title} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">{job.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{job.company}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Target size={10} className={job.scoreCls} />
                      <span className={`text-xs font-bold ${job.scoreCls}`}>{job.score}%</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${job.statusCls}`}>{job.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-slate-100 rounded-full px-4 py-1.5 mb-5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Everything you need</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Your unfair advantage<br />
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">in every application</span>
            </h2>
            <p className="text-lg text-slate-500 mt-4 max-w-xl mx-auto">
              Six AI-powered tools working together so every application you send is your best possible shot.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="group rounded-2xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all">
                <div className={`w-11 h-11 rounded-2xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon size={20} className={f.iconColor} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">From resume to offer.<br />Faster than you think.</h2>
            <p className="text-lg text-slate-500 mt-4">Three steps. Under a minute. Dramatically better results.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-slate-200 -translate-x-6 z-0" />
                )}
                <div className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-black mb-4 shadow-sm shadow-blue-500/20">
                    {step.n}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Real people. Real results.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-3.5 h-3.5 rounded-sm bg-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">"{t.quote}"</p>
                <div>
                  <div className="text-sm font-bold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-400 font-medium">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-5">
              Your next job is one{' '}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">better resume</span>{' '}
              away.
            </h2>
            <p className="text-lg text-slate-400 mb-10">
              Join thousands of job seekers using Genova to land roles faster. Free to start, no credit card needed.
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white px-10 py-4 rounded-2xl text-base font-bold hover:from-blue-600 hover:to-violet-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Create your free account
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <p className="text-sm text-slate-600 mt-4">Free forever · No credit card · Takes 30 seconds</p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-xs">
              G
            </div>
            <span className="text-sm font-bold text-white">Genova</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium">Sign In</Link>
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium">Create Account</Link>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Genova. Built for serious job seekers.</p>
        </div>
      </footer>

    </div>
  );
}
