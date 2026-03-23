'use client';

import { useState } from 'react';
import { downloadDocument, type TemplateId, type DocType } from '@/lib/pdf-templates';

interface TemplatePickerModalProps {
  content: string;
  type: DocType;
  company: string;
  position: string;
  onClose: () => void;
}

const TEMPLATES: {
  id: TemplateId;
  name: string;
  description: string;
  preview: React.ReactNode;
}[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless, ATS-safe. Navy accents, clean hierarchy.',
    preview: <ClassicPreview />,
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Bold dark header, gold accents. Makes a statement.',
    preview: <ExecutivePreview />,
  },
  {
    id: 'fresh',
    name: 'Fresh',
    description: 'Modern teal palette. Airy and contemporary.',
    preview: <FreshPreview />,
  },
];

export default function TemplatePickerModal({
  content,
  type,
  company,
  position,
  onClose,
}: TemplatePickerModalProps) {
  const [downloading, setDownloading] = useState<TemplateId | null>(null);

  const handleDownload = async (templateId: TemplateId) => {
    setDownloading(templateId);
    try {
      await downloadDocument({ content, type, templateId, company, position });
    } finally {
      setDownloading(null);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Choose a Template</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {type === 'resume' ? 'Tailored Resume' : 'Cover Letter'} · {company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Template cards */}
        <div className="grid grid-cols-3 gap-4 p-6">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleDownload(t.id)}
              disabled={downloading !== null}
              className="group flex flex-col rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {/* Preview thumbnail */}
              <div className="w-full aspect-[3/4] bg-gray-50 relative overflow-hidden">
                {downloading === t.id ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 scale-100 group-hover:scale-[1.02] transition-transform duration-200">
                    {t.preview}
                  </div>
                )}
              </div>
              {/* Label */}
              <div className="px-3 py-3 text-left border-t group-hover:bg-blue-50 transition-colors">
                <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-gray-400">Click a template to generate and download your PDF instantly.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Preview thumbnails (CSS representations of each template) ────────────────

function ClassicPreview() {
  return (
    <div className="w-full h-full bg-white p-2 flex flex-col gap-1" style={{ fontSize: 0 }}>
      {/* Name */}
      <div className="h-2.5 w-3/5 rounded-sm" style={{ background: '#0f2864' }} />
      {/* Contact */}
      <div className="h-1.5 w-4/5 rounded-sm bg-gray-300 mt-0.5" />
      {/* Heavy rule */}
      <div className="h-0.5 w-full mt-1" style={{ background: '#0f2864' }} />
      {/* Section */}
      <div className="mt-2 h-1.5 w-2/5 rounded-sm" style={{ background: '#0f2864' }} />
      <div className="h-px w-full bg-gray-200 mt-0.5" />
      {/* Entry */}
      <div className="mt-1.5 h-1.5 w-4/5 rounded-sm bg-gray-700" />
      <div className="mt-0.5 h-1 w-3/5 rounded-sm bg-gray-400" />
      {/* Bullets */}
      <div className="mt-1 h-1 w-full rounded-sm bg-gray-300" />
      <div className="mt-0.5 h-1 w-[90%] rounded-sm bg-gray-300" />
      <div className="mt-0.5 h-1 w-[85%] rounded-sm bg-gray-300" />
      {/* Section 2 */}
      <div className="mt-2 h-1.5 w-1/3 rounded-sm" style={{ background: '#0f2864' }} />
      <div className="h-px w-full bg-gray-200 mt-0.5" />
      {/* Skills */}
      <div className="mt-1 h-1 w-full rounded-sm bg-gray-300" />
      <div className="mt-0.5 h-1 w-[90%] rounded-sm bg-gray-300" />
      <div className="mt-0.5 h-1 w-[80%] rounded-sm bg-gray-300" />
      {/* Section 3 */}
      <div className="mt-2 h-1.5 w-2/5 rounded-sm" style={{ background: '#0f2864' }} />
      <div className="h-px w-full bg-gray-200 mt-0.5" />
      <div className="mt-1 h-1 w-4/5 rounded-sm bg-gray-700" />
      <div className="mt-0.5 h-1 w-full rounded-sm bg-gray-300" />
      <div className="mt-0.5 h-1 w-[88%] rounded-sm bg-gray-300" />
    </div>
  );
}

function ExecutivePreview() {
  return (
    <div className="w-full h-full flex flex-col" style={{ fontSize: 0 }}>
      {/* Dark header band */}
      <div className="w-full px-2 pt-2 pb-2 flex flex-col gap-1" style={{ background: '#161b2d' }}>
        <div className="h-2.5 w-3/5 rounded-sm bg-white" />
        <div className="h-1.5 w-4/5 rounded-sm mt-0.5" style={{ background: '#d2af64' }} />
      </div>
      {/* Gold accent stripe */}
      <div className="w-full h-0.5" style={{ background: '#b48c3c' }} />
      {/* Body */}
      <div className="flex-1 bg-white p-2 flex flex-col gap-1">
        {/* Section */}
        <div className="mt-1 h-1.5 w-2/5 rounded-sm" style={{ background: '#161b2d' }} />
        <div className="h-0.5 w-full mt-0.5" style={{ background: '#b48c3c' }} />
        {/* Entry */}
        <div className="mt-1.5 h-1.5 w-4/5 rounded-sm bg-gray-700" />
        <div className="mt-0.5 h-1 w-3/5 rounded-sm bg-gray-400" />
        {/* Bullets with dots */}
        <div className="mt-1 flex gap-1 items-center">
          <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#b48c3c' }} />
          <div className="h-1 flex-1 rounded-sm bg-gray-300" />
        </div>
        <div className="flex gap-1 items-center mt-0.5">
          <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#b48c3c' }} />
          <div className="h-1 w-[85%] rounded-sm bg-gray-300" />
        </div>
        <div className="flex gap-1 items-center mt-0.5">
          <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#b48c3c' }} />
          <div className="h-1 w-[90%] rounded-sm bg-gray-300" />
        </div>
        {/* Section 2 */}
        <div className="mt-2 h-1.5 w-1/3 rounded-sm" style={{ background: '#161b2d' }} />
        <div className="h-0.5 w-full mt-0.5" style={{ background: '#b48c3c' }} />
        <div className="mt-1 h-1 w-full rounded-sm bg-gray-300" />
        <div className="mt-0.5 h-1 w-[88%] rounded-sm bg-gray-300" />
        <div className="mt-0.5 h-1 w-[80%] rounded-sm bg-gray-300" />
      </div>
    </div>
  );
}

function FreshPreview() {
  return (
    <div className="w-full h-full bg-white flex" style={{ fontSize: 0 }}>
      {/* Teal left bar */}
      <div className="w-1 shrink-0 h-full" style={{ background: '#0d9488' }} />
      {/* Content */}
      <div className="flex-1 p-2 flex flex-col gap-1">
        {/* Name */}
        <div className="h-2.5 w-3/5 rounded-sm bg-gray-900 mt-1" />
        {/* Contact teal */}
        <div className="h-1.5 w-4/5 rounded-sm mt-0.5" style={{ background: '#0d9488' }} />
        {/* Light rule */}
        <div className="h-px w-full bg-gray-200 mt-1" />
        {/* Section pill */}
        <div className="mt-2 h-4 w-2/5 rounded" style={{ background: '#ccf0ee' }}>
          <div className="h-full flex items-center px-1">
            <div className="h-1.5 w-3/4 rounded-sm" style={{ background: '#0d9488' }} />
          </div>
        </div>
        {/* Entry */}
        <div className="mt-1.5 h-1.5 w-4/5 rounded-sm bg-gray-800" />
        <div className="mt-0.5 h-1 w-3/5 rounded-sm bg-gray-400" />
        {/* Bullets with teal squares */}
        <div className="mt-1 flex gap-1 items-center">
          <div className="w-1 h-1 shrink-0" style={{ background: '#0d9488' }} />
          <div className="h-1 flex-1 rounded-sm bg-gray-300" />
        </div>
        <div className="flex gap-1 items-center mt-0.5">
          <div className="w-1 h-1 shrink-0" style={{ background: '#0d9488' }} />
          <div className="h-1 w-[85%] rounded-sm bg-gray-300" />
        </div>
        <div className="flex gap-1 items-center mt-0.5">
          <div className="w-1 h-1 shrink-0" style={{ background: '#0d9488' }} />
          <div className="h-1 w-[90%] rounded-sm bg-gray-300" />
        </div>
        {/* Section 2 pill */}
        <div className="mt-2 h-4 w-1/3 rounded" style={{ background: '#ccf0ee' }}>
          <div className="h-full flex items-center px-1">
            <div className="h-1.5 w-3/4 rounded-sm" style={{ background: '#0d9488' }} />
          </div>
        </div>
        <div className="mt-1 h-1 w-full rounded-sm bg-gray-300" />
        <div className="mt-0.5 h-1 w-[88%] rounded-sm bg-gray-300" />
        <div className="mt-0.5 h-1 w-[75%] rounded-sm bg-gray-300" />
      </div>
    </div>
  );
}
