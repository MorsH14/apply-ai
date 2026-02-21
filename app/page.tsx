'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

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

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'] as const;

const STATUS_STYLE: Record<string, string> = {
  saved:     'bg-blue-100 text-blue-800',
  applied:   'bg-amber-100 text-amber-800',
  interview: 'bg-purple-100 text-purple-800',
  offer:     'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
};

const ANALYTICS_STYLE: Record<string, string> = {
  saved:     'bg-blue-50 border-blue-200 text-blue-700',
  applied:   'bg-amber-50 border-amber-200 text-amber-700',
  interview: 'bg-purple-50 border-purple-200 text-purple-700',
  offer:     'bg-green-50 border-green-200 text-green-700',
  rejected:  'bg-red-50 border-red-200 text-red-700',
};

const EMPTY_FORM: FormState = {
  company: '', position: '', status: 'saved',
  location: '', salary: '', jobDescription: '', notes: '',
};

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

  const [aiOpenId, setAiOpenId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<'tailor' | 'cover' | null>(null);
  const [aiOutput, setAiOutput] = useState<AiOutput | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load jobs
  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then(setJobs);
  }, []);

  // Load resume from account
  useEffect(() => {
    fetch('/api/resume')
      .then(r => r.json())
      .then(data => {
        if (data.resume) { setMyResume(data.resume); setResumeDraft(data.resume); }
      });
  }, []);

  // Analytics counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = jobs.filter(j => j.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // --- Resume ---
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
  };

  // --- Add ---
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

  // --- Edit ---
  const startEdit = (job: Job) => {
    setEditingId(job._id);
    setEditState({
      company: job.company,
      position: job.position,
      status: job.status,
      location: job.location || '',
      salary: job.salary || '',
      jobDescription: job.jobDescription || '',
      notes: job.notes || '',
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

  // --- Delete ---
  const deleteJob = async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    if (res.ok) setJobs(jobs.filter(j => j._id !== id));
  };

  const deleteAll = async () => {
    if (!confirm('Delete all jobs? This cannot be undone.')) return;
    await fetch('/api/jobs', { method: 'DELETE' });
    setJobs([]);
  };

  // --- AI ---
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
      body: JSON.stringify({
        jobDescription: job.jobDescription,
        resume: myResume,
        company: job.company,
        position: job.position,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setAiError(data.error || 'Something went wrong');
    } else {
      setAiOutput({ type, content: data.result });
    }
    setAiLoading(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPDF = async (content: string, type: 'tailor' | 'cover', company: string, position: string) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 6.5;
    let y = margin;

    // Title
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    const title = type === 'tailor'
      ? `Tailored Resume — ${position} at ${company}`
      : `Cover Letter — ${position} at ${company}`;
    const titleLines = doc.splitTextToSize(title, maxWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * lineHeight + 4;

    // Divider
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += lineHeight;

    // Body
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    for (const line of content.split('\n')) {
      const wrapped = doc.splitTextToSize(line || ' ', maxWidth);
      for (const wl of wrapped) {
        if (y > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(wl, margin, y);
        y += lineHeight;
      }
    }

    const slug = company.toLowerCase().replace(/\s+/g, '-');
    doc.save(type === 'tailor' ? `resume-${slug}.pdf` : `cover-letter-${slug}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Job Command Center</h1>
            <p className="text-gray-500 mt-1 text-sm">{jobs.length} application{jobs.length !== 1 ? 's' : ''} tracked</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {session?.user?.name && (
              <span className="hidden sm:block text-sm text-gray-500">
                👤 {session.user.name}
              </span>
            )}
            <button
              onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              + Add Job
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Analytics Bar */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
          {STATUSES.map(status => (
            <div key={status} className={`border rounded-lg p-2 sm:p-3 text-center ${ANALYTICS_STYLE[status]}`}>
              <div className="text-xl sm:text-2xl font-bold">{counts[status]}</div>
              <div className="text-xs capitalize font-medium mt-0.5">{status}</div>
            </div>
          ))}
        </div>

        {/* My Resume Panel */}
        <div className="mb-6 border rounded-xl bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setShowResumePanel(!showResumePanel)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-base">
                📄
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">My Resume</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {myResume
                    ? `${myResume.trim().split(/\s+/).length} words · ${resumeSavedAt ? `Saved ${resumeSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'}`
                    : 'Not added yet — required for AI tools'}
                </p>
              </div>
            </div>
            <span className="text-gray-400 text-xs font-medium">{showResumePanel ? '▲ Collapse' : '▼ Edit'}</span>
          </button>

          {showResumePanel && (
            <div className="border-t px-5 py-5">
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Paste your master resume below. It is stored securely with your account and is only used when you click <strong>Tailor My Resume</strong> or <strong>Write Cover Letter</strong> on a job.
              </p>
              <textarea
                value={resumeDraft}
                onChange={e => setResumeDraft(e.target.value)}
                placeholder="Paste your full resume here — work experience, education, skills, achievements..."
                className="w-full h-64 p-4 border border-gray-200 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 leading-relaxed"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {resumeDraft.trim() ? `${resumeDraft.trim().split(/\s+/).length} words` : 'Empty'}
                  {resumeDraft !== myResume && <span className="ml-2 text-amber-500">· Unsaved changes</span>}
                </span>
                <button
                  onClick={handleSaveResume}
                  disabled={resumeSaving || !resumeDraft.trim() || resumeDraft === myResume}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  {resumeSaving ? 'Saving...' : 'Save Resume'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Job Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-6 p-4 sm:p-6 border rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Add New Job</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                placeholder="Company *" required value={addState.company}
                onChange={e => setAddState({ ...addState, company: e.target.value })}
                className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                placeholder="Position *" required value={addState.position}
                onChange={e => setAddState({ ...addState, position: e.target.value })}
                className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                placeholder="Location" value={addState.location}
                onChange={e => setAddState({ ...addState, location: e.target.value })}
                className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                placeholder="Salary / Range" value={addState.salary}
                onChange={e => setAddState({ ...addState, salary: e.target.value })}
                className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <textarea
              placeholder="Job Description — paste here to unlock AI tailoring"
              value={addState.jobDescription}
              onChange={e => setAddState({ ...addState, jobDescription: e.target.value })}
              className="w-full p-2 border rounded mb-3 h-28 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <textarea
              placeholder="Notes (optional)"
              value={addState.notes}
              onChange={e => setAddState({ ...addState, notes: e.target.value })}
              className="w-full p-2 border rounded mb-4 h-16 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 text-sm font-medium">
                Add Job
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded hover:bg-gray-200 text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Job List */}
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job._id} className="border rounded-lg bg-white shadow-sm overflow-hidden">

              {editingId === job._id ? (
                /* ── Edit Mode ── */
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <input
                      value={editState.company} placeholder="Company"
                      onChange={e => setEditState({ ...editState, company: e.target.value })}
                      className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <input
                      value={editState.position} placeholder="Position"
                      onChange={e => setEditState({ ...editState, position: e.target.value })}
                      className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <input
                      value={editState.location} placeholder="Location"
                      onChange={e => setEditState({ ...editState, location: e.target.value })}
                      className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <input
                      value={editState.salary} placeholder="Salary / Range"
                      onChange={e => setEditState({ ...editState, salary: e.target.value })}
                      className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <select
                    value={editState.status}
                    onChange={e => setEditState({ ...editState, status: e.target.value })}
                    className="w-full p-2 border rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <textarea
                    value={editState.jobDescription} placeholder="Job Description"
                    onChange={e => setEditState({ ...editState, jobDescription: e.target.value })}
                    className="w-full p-2 border rounded mb-3 h-28 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <textarea
                    value={editState.notes} placeholder="Notes"
                    onChange={e => setEditState({ ...editState, notes: e.target.value })}
                    className="w-full p-2 border rounded mb-4 h-16 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(job._id)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-sm">
                      Cancel
                    </button>
                  </div>
                </div>

              ) : (
                /* ── View Mode ── */
                <div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">{job.position}</h3>
                        <p className="text-gray-600 font-medium">{job.company}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                          {job.location && <span>📍 {job.location}</span>}
                          {job.salary && <span>💰 {job.salary}</span>}
                          <span className="text-gray-400">
                            Added {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_STYLE[job.status] || 'bg-gray-100 text-gray-700'}`}>
                        {job.status}
                      </span>
                    </div>

                    {job.notes && (
                      <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-md p-3 border border-gray-100">
                        {job.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <button
                        onClick={() => startEdit(job)}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteJob(job._id)}
                        className="bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 text-sm"
                      >
                        Delete
                      </button>
                      {job.jobDescription && (
                        <button
                          onClick={() => openAiPanel(job._id)}
                          className="sm:ml-auto bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 text-sm font-medium"
                        >
                          ✨ AI Tools {aiOpenId === job._id ? '▲' : '▼'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI Panel */}
                  {aiOpenId === job._id && (
                    <div className="border-t bg-purple-50 p-4 sm:p-5">
                      {!myResume ? (
                        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                          ⚠️ Add your resume in the "My Resume" section above to use AI tools.
                        </p>
                      ) : null}

                      <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <button
                          onClick={() => runAI(job, 'tailor')}
                          disabled={!myResume || aiLoading !== null}
                          className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-40 text-sm font-medium"
                        >
                          {aiLoading === 'tailor' ? '⏳ Tailoring...' : '📝 Tailor My Resume'}
                        </button>
                        <button
                          onClick={() => runAI(job, 'cover')}
                          disabled={!myResume || aiLoading !== null}
                          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-40 text-sm font-medium"
                        >
                          {aiLoading === 'cover' ? '⏳ Writing...' : '✉️ Write Cover Letter'}
                        </button>
                      </div>

                      {aiError && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                          ❌ {aiError}
                        </p>
                      )}

                      {aiOutput && (
                        <div className="bg-white border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                            <h4 className="font-semibold text-sm text-gray-700">
                              {aiOutput.type === 'tailor' ? '📝 Tailored Resume' : '✉️ Cover Letter'}
                            </h4>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => copyToClipboard(aiOutput.content)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {copied ? '✓ Copied!' : 'Copy'}
                              </button>
                              <button
                                onClick={() => downloadPDF(aiOutput.content, aiOutput.type, job.company, job.position)}
                                className="text-xs bg-gray-800 text-white px-2.5 py-1 rounded hover:bg-gray-900 font-medium"
                              >
                                ↓ Download PDF
                              </button>
                              <button
                                onClick={() => setAiOutput(null)}
                                className="text-gray-400 hover:text-gray-700 text-lg leading-none font-medium ml-1"
                                aria-label="Close"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <pre className="p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                            {aiOutput.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {jobs.length === 0 && !showAddForm && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-4">📋</p>
              <p className="text-lg font-medium">No jobs tracked yet</p>
              <p className="text-sm mt-1">Click "+ Add Job" to get started</p>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        {jobs.length > 0 && (
          <div className="mt-10 pt-6 border-t text-center">
            <button onClick={deleteAll} className="text-red-400 hover:text-red-600 text-sm">
              Delete all jobs
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
