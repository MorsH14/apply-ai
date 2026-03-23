/**
 * PDF Template Engine
 * Three professional templates rendered with jsPDF.
 * Each template handles both resume and cover letter document types.
 */

export type TemplateId = 'classic' | 'executive' | 'fresh';
export type DocType = 'resume' | 'cover';

export interface DownloadOptions {
  content: string;
  type: DocType;
  templateId: TemplateId;
  company: string;
  position: string;
}

type RGB = [number, number, number];

// ─── Section header detection ────────────────────────────────────────────────

const KNOWN_SECTIONS = new Set([
  'PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE', 'PROFILE',
  'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT HISTORY', 'EMPLOYMENT',
  'SKILLS', 'TECHNICAL SKILLS', 'CORE COMPETENCIES', 'KEY SKILLS',
  'EDUCATION', 'ACADEMIC BACKGROUND',
  'CERTIFICATIONS', 'CERTIFICATES', 'LICENSES',
  'PROJECTS', 'NOTABLE PROJECTS', 'KEY PROJECTS',
  'LANGUAGES', 'AWARDS', 'ACHIEVEMENTS', 'ACCOMPLISHMENTS',
  'VOLUNTEER', 'VOLUNTEERING', 'COMMUNITY',
  'INTERESTS', 'HOBBIES', 'REFERENCES',
]);

function isSectionHeader(line: string): boolean {
  const upper = line.trim().toUpperCase();
  if (KNOWN_SECTIONS.has(upper)) return true;
  // All-caps short line (fallback for custom sections)
  return (
    upper === line.trim().toUpperCase() &&
    /^[A-Z][A-Z\s\/&\-]+$/.test(line.trim()) &&
    line.trim().length > 2 &&
    line.trim().length < 45
  );
}

function isEntryLine(line: string): boolean {
  return line.includes(' | ') && !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*');
}

function isBullet(line: string): boolean {
  return /^[•\-\*]\s/.test(line.trim());
}

function isSkillLine(line: string): boolean {
  return /^[A-Za-z][A-Za-z\s&\/\-]+:\s.+/.test(line.trim());
}

// ─── Parse document header (name + contact) ──────────────────────────────────

function parseHeader(content: string): { nameLine: string; contactLine: string; bodyStart: number } {
  const lines = content.split('\n');
  const nonEmpty = lines
    .map((t, i) => ({ t: t.trim(), i }))
    .filter(x => x.t.length > 0);

  const nameLine = nonEmpty[0]?.t ?? '';
  const contactLine = nonEmpty[1]?.t ?? '';
  const bodyStart = (nonEmpty[1]?.i ?? 0) + 1;

  return { nameLine, contactLine, bodyStart };
}

// ─── Shared drawing utilities ─────────────────────────────────────────────────

function makeHelpers(doc: InstanceType<typeof import('jspdf')['jsPDF']>, ML: number, MB: number, PH: number, TW: number) {
  let y = 0;

  const setY = (val: number) => { y = val; };
  const getY = () => y;
  const addY = (delta: number) => { y += delta; };

  const newPage = () => { doc.addPage(); y = 20; };
  const checkY = (needed = 8) => { if (y + needed > PH - MB) newPage(); };

  const drawText = (
    text: string,
    x: number,
    fontSize: number,
    style: 'normal' | 'bold' | 'italic' | 'bolditalic',
    color: RGB,
    maxW: number,
    lineGap = 5.5
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, maxW);
    for (const wl of wrapped) {
      checkY(lineGap);
      doc.text(wl, x, y);
      y += lineGap;
    }
  };

  const drawRule = (color: RGB, thickness = 0.3, xStart?: number, xEnd?: number, PW?: number) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(thickness);
    doc.line(xStart ?? ML, y, xEnd ?? (PW ?? 210) - ML, y);
    y += 3;
  };

  // Right-align text at a given x position
  const drawRight = (text: string, rightX: number, fontSize: number, style: 'normal' | 'bold', color: RGB) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    doc.text(text, rightX, y, { align: 'right' });
  };

  return { setY, getY, addY, newPage, checkY, drawText, drawRule, drawRight };
}

// ─── RESUME body renderer (shared logic, per-template styling) ────────────────

interface TemplateStyles {
  sectionHeader: (doc: InstanceType<typeof import('jspdf')['jsPDF']>, text: string, helpers: ReturnType<typeof makeHelpers>, ML: number, TW: number, PW: number) => void;
  entryLine: (doc: InstanceType<typeof import('jspdf')['jsPDF']>, text: string, helpers: ReturnType<typeof makeHelpers>, ML: number, TW: number) => void;
  bullet: (doc: InstanceType<typeof import('jspdf')['jsPDF']>, text: string, helpers: ReturnType<typeof makeHelpers>, ML: number, TW: number) => void;
  skillLine: (doc: InstanceType<typeof import('jspdf')['jsPDF']>, label: string, value: string, helpers: ReturnType<typeof makeHelpers>, ML: number, TW: number) => void;
  bodyText: (doc: InstanceType<typeof import('jspdf')['jsPDF']>, text: string, helpers: ReturnType<typeof makeHelpers>, ML: number, TW: number) => void;
  emptyLine: (helpers: ReturnType<typeof makeHelpers>) => void;
}

function renderResumeBody(
  doc: InstanceType<typeof import('jspdf')['jsPDF']>,
  lines: string[],
  helpers: ReturnType<typeof makeHelpers>,
  styles: TemplateStyles,
  ML: number,
  TW: number,
  PW: number
) {
  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      styles.emptyLine(helpers);
      continue;
    }

    if (isSectionHeader(trimmed)) {
      helpers.addY(3);
      helpers.checkY(12);
      styles.sectionHeader(doc, trimmed.toUpperCase(), helpers, ML, TW, PW);
      continue;
    }

    if (isEntryLine(trimmed)) {
      helpers.checkY(7);
      styles.entryLine(doc, trimmed, helpers, ML, TW);
      continue;
    }

    if (isBullet(trimmed)) {
      styles.bullet(doc, trimmed, helpers, ML, TW);
      continue;
    }

    if (isSkillLine(trimmed)) {
      helpers.checkY(6);
      const colon = trimmed.indexOf(':');
      const label = trimmed.slice(0, colon + 1);
      const value = trimmed.slice(colon + 1).trim();
      styles.skillLine(doc, label, value, helpers, ML, TW);
      continue;
    }

    styles.bodyText(doc, trimmed, helpers, ML, TW);
  }
}

// ─── TEMPLATE 1: Classic ──────────────────────────────────────────────────────
// Timeless navy + white. ATS-optimized. Clean hierarchy.

function renderClassic(
  doc: InstanceType<typeof import('jspdf')['jsPDF']>,
  content: string,
  type: DocType,
  company: string
) {
  const ML = 18, MR = 18, MT = 22, MB = 18;
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const TW = PW - ML - MR;

  const NAVY:  RGB = [15, 40, 100];
  const GRAY:  RGB = [110, 110, 115];
  const DARK:  RGB = [28, 28, 35];
  const RULE:  RGB = [200, 210, 230];
  const WHITE: RGB = [255, 255, 255];

  const helpers = makeHelpers(doc, ML, MB, PH, TW);
  helpers.setY(MT);

  const { nameLine, contactLine, bodyStart } = parseHeader(content);
  const bodyLines = content.split('\n').slice(bodyStart);

  if (type === 'resume') {
    // Name
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(nameLine || 'Your Name', ML, helpers.getY());
    helpers.addY(9);

    // Contact
    if (contactLine) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(doc.splitTextToSize(contactLine, TW), ML, helpers.getY());
      helpers.addY(5.5);
    }

    // Heavy rule
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(1);
    doc.line(ML, helpers.getY(), PW - MR, helpers.getY());
    helpers.addY(7);

    const styles: TemplateStyles = {
      sectionHeader(d, text, h, ml, tw, pw) {
        d.setFontSize(9.5);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...NAVY);
        d.text(text, ml, h.getY());
        h.addY(4.5);
        h.drawRule(RULE, 0.35, ml, pw - ml, pw);
      },
      entryLine(d, text, h, ml, tw) {
        const parts = text.split(' | ');
        d.setFontSize(10);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...DARK);
        const firstW = d.getTextWidth(parts[0]);
        d.text(parts[0], ml, h.getY());
        if (parts.length > 1) {
          d.setFont('helvetica', 'normal');
          d.setTextColor(...GRAY);
          const rest = '  |  ' + parts.slice(1).join('  |  ');
          d.text(rest, ml + firstW, h.getY());
        }
        h.addY(5.5);
      },
      bullet(d, text, h, ml, tw) {
        const clean = '•  ' + text.replace(/^[•\-\*]\s*/, '');
        d.setFontSize(9.5);
        d.setFont('helvetica', 'normal');
        d.setTextColor(...DARK);
        const wrapped = d.splitTextToSize(clean, tw - 4);
        for (const wl of wrapped) {
          h.checkY(5.5);
          d.text(wl, ml + 3, h.getY());
          h.addY(5.2);
        }
      },
      skillLine(d, label, value, h, ml, tw) {
        d.setFontSize(9.5);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...DARK);
        const lw = d.getTextWidth(label + ' ');
        d.text(label, ml, h.getY());
        d.setFont('helvetica', 'normal');
        d.setTextColor(...GRAY);
        const wrapped = d.splitTextToSize(value, tw - lw);
        d.text(wrapped[0] ?? '', ml + lw, h.getY());
        h.addY(5);
        for (let i = 1; i < wrapped.length; i++) {
          h.checkY(5);
          d.text(wrapped[i], ml, h.getY());
          h.addY(5);
        }
      },
      bodyText(d, text, h, ml, tw) {
        d.setFontSize(9.5);
        d.setFont('helvetica', 'normal');
        d.setTextColor(...DARK);
        const wrapped = d.splitTextToSize(text, tw);
        for (const wl of wrapped) {
          h.checkY(5.5);
          d.text(wl, ml, h.getY());
          h.addY(5.3);
        }
      },
      emptyLine(h) { h.addY(2.5); },
    };

    renderResumeBody(doc, bodyLines, helpers, styles, ML, TW, PW);

  } else {
    // Cover letter – Classic
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(nameLine || 'Your Name', ML, helpers.getY());
    helpers.addY(8);

    if (contactLine) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY);
      doc.text(doc.splitTextToSize(contactLine, TW), ML, helpers.getY());
      helpers.addY(5);
    }

    doc.setDrawColor(...NAVY);
    doc.setLineWidth(1);
    doc.line(ML, helpers.getY(), PW - MR, helpers.getY());
    helpers.addY(10);

    renderCoverBody(doc, bodyLines, helpers, { navy: NAVY, gray: GRAY, dark: DARK }, ML, TW, company);
  }

  addPageNumbers(doc, GRAY, PH, PW);
}

// ─── TEMPLATE 2: Executive ────────────────────────────────────────────────────
// Dark header band, gold accent, sophisticated and bold.

function renderExecutive(
  doc: InstanceType<typeof import('jspdf')['jsPDF']>,
  content: string,
  type: DocType,
  company: string
) {
  const ML = 18, MR = 18, MB = 18;
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const TW = PW - ML - MR;

  const CHARCOAL: RGB = [22, 27, 45];
  const GOLD:     RGB = [180, 140, 60];
  const LGOLD:    RGB = [210, 175, 100];
  const GRAY:     RGB = [105, 105, 112];
  const DARK:     RGB = [30, 30, 40];
  const LGRAY:    RGB = [180, 180, 185];
  const WHITE:    RGB = [255, 255, 255];

  // Header band height
  const BAND_H = 38;

  const helpers = makeHelpers(doc, ML, MB, PH, TW);
  helpers.setY(0);

  const { nameLine, contactLine, bodyStart } = parseHeader(content);
  const bodyLines = content.split('\n').slice(bodyStart);

  // Draw charcoal header band
  doc.setFillColor(...CHARCOAL);
  doc.rect(0, 0, PW, BAND_H, 'F');

  // Gold accent stripe at bottom of band
  doc.setFillColor(...GOLD);
  doc.rect(0, BAND_H, PW, 1.2, 'F');

  if (type === 'resume') {
    // Name in band
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(nameLine || 'Your Name', ML, 21);

    // Contact in band
    if (contactLine) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...LGOLD);
      doc.text(doc.splitTextToSize(contactLine, TW), ML, 30);
    }

    helpers.setY(BAND_H + 12);

    const styles: TemplateStyles = {
      sectionHeader(d, text, h, ml, tw, pw) {
        d.setFontSize(9);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...CHARCOAL);
        d.text(text, ml, h.getY());
        h.addY(4);
        // Gold underline
        d.setDrawColor(...GOLD);
        d.setLineWidth(0.6);
        d.line(ml, h.getY() - 0.5, pw - ml, h.getY() - 0.5);
        h.addY(3);
      },
      entryLine(d, text, h, ml, tw) {
        const parts = text.split(' | ');
        d.setFontSize(10);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...DARK);
        const firstW = d.getTextWidth(parts[0]);
        d.text(parts[0], ml, h.getY());
        if (parts.length > 1) {
          d.setFont('helvetica', 'normal');
          d.setTextColor(...GRAY);
          d.text('  ·  ' + parts.slice(1).join('  ·  '), ml + firstW, h.getY());
        }
        h.addY(5.5);
      },
      bullet(d, text, h, ml, tw) {
        const clean = text.replace(/^[•\-\*]\s*/, '');
        d.setFontSize(9.5);
        d.setFont('helvetica', 'normal');
        d.setTextColor(...DARK);
        // Gold bullet dot
        d.setFillColor(...GOLD);
        d.circle(ml + 1.5, h.getY() - 1.8, 0.9, 'F');
        const wrapped = d.splitTextToSize(clean, tw - 5);
        for (let i = 0; i < wrapped.length; i++) {
          h.checkY(5.5);
          d.text(wrapped[i], ml + 4.5, h.getY());
          if (i < wrapped.length - 1) h.addY(5.2);
        }
        h.addY(5.2);
      },
      skillLine(d, label, value, h, ml, tw) {
        d.setFontSize(9.5);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...CHARCOAL);
        const lw = d.getTextWidth(label + ' ');
        d.text(label, ml, h.getY());
        d.setFont('helvetica', 'normal');
        d.setTextColor(...GRAY);
        const wrapped = d.splitTextToSize(value, tw - lw);
        d.text(wrapped[0] ?? '', ml + lw, h.getY());
        h.addY(5);
        for (let i = 1; i < wrapped.length; i++) {
          h.checkY(5);
          d.text(wrapped[i], ml, h.getY());
          h.addY(5);
        }
      },
      bodyText(d, text, h, ml, tw) {
        d.setFontSize(9.5);
        d.setFont('helvetica', 'normal');
        d.setTextColor(...DARK);
        const wrapped = d.splitTextToSize(text, tw);
        for (const wl of wrapped) {
          h.checkY(5.5);
          d.text(wl, ml, h.getY());
          h.addY(5.3);
        }
      },
      emptyLine(h) { h.addY(2.5); },
    };

    renderResumeBody(doc, bodyLines, helpers, styles, ML, TW, PW);

  } else {
    // Cover letter – Executive
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(nameLine || 'Your Name', ML, 21);

    if (contactLine) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...LGOLD);
      doc.text(doc.splitTextToSize(contactLine, TW), ML, 30);
    }

    helpers.setY(BAND_H + 12);
    renderCoverBody(doc, bodyLines, helpers, { navy: CHARCOAL, gray: GRAY, dark: DARK }, ML, TW, company);
  }

  // Footer band
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Thin bottom accent
    doc.setFillColor(...CHARCOAL);
    doc.rect(0, PH - 8, PW, 8, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...LGRAY);
    if (totalPages > 1) {
      doc.text(`${p} / ${totalPages}`, PW / 2, PH - 3, { align: 'center' });
    }
  }
}

// ─── TEMPLATE 3: Fresh ────────────────────────────────────────────────────────
// Teal accents, modern typography, generous whitespace.

function renderFresh(
  doc: InstanceType<typeof import('jspdf')['jsPDF']>,
  content: string,
  type: DocType,
  company: string
) {
  const ML = 20, MR = 20, MT = 24, MB = 18;
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const TW = PW - ML - MR;

  const TEAL:  RGB = [13, 148, 136];
  const LTEAL: RGB = [204, 240, 238];
  const DARK:  RGB = [15, 23, 42];
  const GRAY:  RGB = [100, 116, 139];
  const LGRAY: RGB = [203, 213, 225];
  const WHITE: RGB = [255, 255, 255];

  const helpers = makeHelpers(doc, ML, MB, PH, TW);
  helpers.setY(MT);

  const { nameLine, contactLine, bodyStart } = parseHeader(content);
  const bodyLines = content.split('\n').slice(bodyStart);

  if (type === 'resume') {
    // Left teal accent bar
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, 4, PH, 'F');

    // Name
    doc.setFontSize(23);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(nameLine || 'Your Name', ML, helpers.getY());
    helpers.addY(9);

    // Contact with teal color
    if (contactLine) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEAL);
      doc.text(doc.splitTextToSize(contactLine, TW), ML, helpers.getY());
      helpers.addY(5.5);
    }

    // Light rule
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.4);
    doc.line(ML, helpers.getY(), PW - MR, helpers.getY());
    helpers.addY(8);

    const styles: TemplateStyles = {
      sectionHeader(d, text, h, ml, tw, pw) {
        // Teal pill label
        d.setFillColor(...LTEAL);
        d.roundedRect(ml - 1, h.getY() - 5.5, tw + 2, 7.5, 1, 1, 'F');
        d.setFontSize(8.5);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...TEAL);
        d.text(text, ml + 1, h.getY());
        h.addY(8);
      },
      entryLine(d, text, h, ml, tw) {
        const parts = text.split(' | ');
        d.setFontSize(10);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...DARK);
        const firstW = d.getTextWidth(parts[0]);
        d.text(parts[0], ml, h.getY());
        if (parts.length > 1) {
          d.setFont('helvetica', 'normal');
          d.setTextColor(...GRAY);
          d.text('  |  ' + parts.slice(1).join('  |  '), ml + firstW, h.getY());
        }
        h.addY(5.5);
      },
      bullet(d, text, h, ml, tw) {
        const clean = text.replace(/^[•\-\*]\s*/, '');
        d.setFontSize(9.5);
        d.setFont('helvetica', 'normal');
        d.setTextColor(...DARK);
        // Teal square bullet
        d.setFillColor(...TEAL);
        d.rect(ml + 1, h.getY() - 2.5, 1.5, 1.5, 'F');
        const wrapped = d.splitTextToSize(clean, tw - 5);
        for (let i = 0; i < wrapped.length; i++) {
          h.checkY(5.5);
          d.text(wrapped[i], ml + 5, h.getY());
          if (i < wrapped.length - 1) h.addY(5.2);
        }
        h.addY(5.2);
      },
      skillLine(d, label, value, h, ml, tw) {
        d.setFontSize(9.5);
        d.setFont('helvetica', 'bold');
        d.setTextColor(...TEAL);
        const lw = d.getTextWidth(label + ' ');
        d.text(label, ml, h.getY());
        d.setFont('helvetica', 'normal');
        d.setTextColor(...DARK);
        const wrapped = d.splitTextToSize(value, tw - lw);
        d.text(wrapped[0] ?? '', ml + lw, h.getY());
        h.addY(5);
        for (let i = 1; i < wrapped.length; i++) {
          h.checkY(5);
          d.text(wrapped[i], ml, h.getY());
          h.addY(5);
        }
      },
      bodyText(d, text, h, ml, tw) {
        d.setFontSize(9.5);
        d.setFont('helvetica', 'normal');
        d.setTextColor(...DARK);
        const wrapped = d.splitTextToSize(text, tw);
        for (const wl of wrapped) {
          h.checkY(5.5);
          d.text(wl, ml, h.getY());
          h.addY(5.5);
        }
      },
      emptyLine(h) { h.addY(3); },
    };

    renderResumeBody(doc, bodyLines, helpers, styles, ML, TW, PW);

  } else {
    // Cover letter – Fresh
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, 4, PH, 'F');

    doc.setFontSize(21);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(nameLine || 'Your Name', ML, helpers.getY());
    helpers.addY(8);

    if (contactLine) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEAL);
      doc.text(doc.splitTextToSize(contactLine, TW), ML, helpers.getY());
      helpers.addY(5);
    }

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.4);
    doc.line(ML, helpers.getY(), PW - MR, helpers.getY());
    helpers.addY(10);

    renderCoverBody(doc, bodyLines, helpers, { navy: DARK, gray: GRAY, dark: DARK }, ML, TW, company);
  }

  addPageNumbers(doc, GRAY, PH, PW);
}

// ─── Cover letter body renderer (shared across templates) ─────────────────────

function renderCoverBody(
  doc: InstanceType<typeof import('jspdf')['jsPDF']>,
  lines: string[],
  helpers: ReturnType<typeof makeHelpers>,
  colors: { navy: RGB; gray: RGB; dark: RGB },
  ML: number,
  TW: number,
  company: string
) {
  const { navy, gray, dark } = colors;

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) { helpers.addY(4); continue; }

    // Date line
    if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/.test(trimmed)) {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gray);
      doc.text(trimmed, ML, helpers.getY());
      helpers.addY(6);
      continue;
    }

    // Greeting
    if (trimmed.startsWith('Dear ')) {
      helpers.checkY(7);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...dark);
      doc.text(trimmed, ML, helpers.getY());
      helpers.addY(7);
      continue;
    }

    // Sign-off
    if (/^(Sincerely|Best regards|Warm regards|Kind regards|Regards|Yours sincerely),?$/.test(trimmed)) {
      helpers.addY(4);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...dark);
      doc.text(trimmed, ML, helpers.getY());
      helpers.addY(6);
      continue;
    }

    // Recipient info (company name, Hiring Manager)
    if (trimmed === company || /^Hiring Manager/.test(trimmed) || /^Recruitment/.test(trimmed)) {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gray);
      doc.text(trimmed, ML, helpers.getY());
      helpers.addY(5.5);
      continue;
    }

    // Body paragraph
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...dark);
    const wrapped = doc.splitTextToSize(trimmed, TW);
    for (const wl of wrapped) {
      helpers.checkY(6.5);
      doc.text(wl, ML, helpers.getY());
      helpers.addY(6.5);
    }
  }
}

// ─── Page numbers ─────────────────────────────────────────────────────────────

function addPageNumbers(
  doc: InstanceType<typeof import('jspdf')['jsPDF']>,
  color: RGB,
  PH: number,
  PW: number
) {
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (totalPages > 1) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...color);
      doc.text(`${p} of ${totalPages}`, PW / 2, PH - 6, { align: 'center' });
    }
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function downloadDocument(opts: DownloadOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  switch (opts.templateId) {
    case 'classic':
      renderClassic(doc, opts.content, opts.type, opts.company);
      break;
    case 'executive':
      renderExecutive(doc, opts.content, opts.type, opts.company);
      break;
    case 'fresh':
      renderFresh(doc, opts.content, opts.type, opts.company);
      break;
  }

  const slug = opts.company.toLowerCase().replace(/\s+/g, '-');
  const label = opts.type === 'resume' ? 'resume' : 'cover-letter';
  doc.save(`${label}-${slug}.pdf`);
}
