/**
 * IntelliRank AI — Executive Hiring Report Engine
 *
 * Generates a 7-sheet enterprise workbook from the AI recommendation pipeline.
 * Single source of truth: every value flows through aiEngine.ts + enrichmentEngine.ts.
 * The exported workbook and the recruiter UI are always synchronized.
 */

import type { Candidate } from '../types/api';
import {
  getAIRecommendation,
  getConfidenceLevel,
  getExecutiveSummary,
  type AIRecommendation,
} from '../intellirank/aiEngine';
import { enrichCandidate } from '../intellirank/enrichmentEngine';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ExportInput {
  filteredCandidates: Candidate[];
  allRankings:        Candidate[];
  allHiddenGems:      Candidate[];
  hasActiveFilters:   boolean;
}

export interface ExportResult {
  filename: string;
  count:    number;
}

// ── Color palette (6-char hex, xlsx-js-style) ─────────────────────────────────

const C = {
  // Navies
  navy950: '020617', navy900: '0F172A', navy800: '1E293B',
  navy700: '334155', navy600: '475569', navy500: '64748B',

  // Whites/Lights
  white:   'FFFFFF', slate50: 'F8FAFC', slate100: 'F1F5F9', slate200: 'E2E8F0',

  // Text
  textDark: '0F172A', textMuted: '64748B', textLight: '94A3B8',

  // Row fills
  rowAlt: 'F8FAFC', rowTop5: 'EDFCF4',

  // Tier backgrounds/text
  strongBg: 'ECFDF5',   strongTxt: '065F46',   strongBar: '10B981',
  recBg:    'EFF6FF',   recTxt:    '1D4ED8',   recBar:    '3B82F6',
  conBg:    'FEFCE8',   conTxt:    '854D0E',   conBar:    'F59E0B',
  lowBg:    'F8FAFC',   lowTxt:    '475569',   lowBar:    '94A3B8',
  passBg:   'FEF2F2',   passTxt:   '991B1B',   passBar:   'EF4444',

  // Gem
  gemBg: 'FEF3C7', gemTxt: '92400E', gemBar: 'F59E0B',

  // Score tiers
  s90Bg: 'ECFDF5', s90Txt: '065F46',
  s80Bg: 'EFF6FF', s80Txt: '1D4ED8',
  s70Bg: 'FEFCE8', s70Txt: '854D0E',
  sLoBg: 'FEF2F2', sLoTxt: '991B1B',

  // Availability colors
  availYesBg: 'ECFDF5', availYesTxt: '065F46',
  avail60Bg:  'EFF6FF', avail60Txt:  '1D4ED8',
  avail90Bg:  'FEFCE8', avail90Txt:  '854D0E',
  availNoBg:  'F8FAFC', availNoTxt:  '64748B',

  // Chart empty cells
  chartEmpty: 'E2E8F0',

  // Borders
  borderLight: 'E2E8F0', borderMed: 'CBD5E1',

  // Cover accent
  accent: 'A99CFF',
};

// ── Utility helpers ───────────────────────────────────────────────────────────

const AVAIL_MAP: Record<string, string> = {
  yes: 'Immediate', '60 days': '60-day notice',
  '90 days': '90-day notice', no: 'Not available',
};

function getDim(c: Candidate, name: string): number | string {
  return c.dimension_scores?.find(d => d.dimension === name)?.score ?? '—';
}

function pct(n: number, total: number, decimals = 1): string {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(decimals)}%`;
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function nowStr(): string {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

// ── Style factories ───────────────────────────────────────────────────────────

type CellStyle = Record<string, unknown>;
type WS = Record<string, unknown>;

function hdr(bg: string, sz = 11, fg = C.white, bold = true, align: 'left'|'center'|'right' = 'center', wrap = false): CellStyle {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    font: { bold, sz, color: { rgb: fg }, name: 'Calibri' },
    alignment: { horizontal: align, vertical: 'center', wrapText: wrap },
  };
}

function cell(bg: string, fg: string, align: 'left'|'center'|'right' = 'left', bold = false, sz = 10, wrap = false): CellStyle {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    font: { bold, sz, color: { rgb: fg }, name: 'Calibri' },
    alignment: { horizontal: align, vertical: 'top', wrapText: wrap },
    border: { bottom: { style: 'thin', color: { rgb: C.borderLight } } },
  };
}

function sectionHdr(): CellStyle {
  return hdr(C.navy800, 10, C.white, true, 'left');
}

function colHdr(): CellStyle {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: C.navy900 } },
    font: { bold: true, sz: 9, color: { rgb: C.white }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: { bottom: { style: 'medium', color: { rgb: C.navy700 } } },
  };
}

function kpiLabel(bg = C.slate100): CellStyle {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    font: { bold: true, sz: 8, color: { rgb: C.navy600 }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'bottom' },
  };
}

function kpiValue(fg = C.navy900, sz = 22, bg = C.white): CellStyle {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    font: { bold: true, sz, color: { rgb: fg }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { bottom: { style: 'thin', color: { rgb: C.borderLight } } },
  };
}

// ── Cell / merge helpers ──────────────────────────────────────────────────────

function addr(r: number, c: number): string {
  const col = c < 26
    ? String.fromCharCode(65 + c)
    : String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26));
  return `${col}${r + 1}`;
}

function sc(ws: WS, r: number, c: number, v: unknown, s?: CellStyle): void {
  const a = addr(r, c);
  ws[a] = { v, t: typeof v === 'number' ? 'n' : 's', ...(s ? { s } : {}) };
}

function mg(ws: WS, r1: number, c1: number, r2: number, c2: number): void {
  if (r1 === r2 && c1 === c2) return;
  const merges = (ws['!merges'] as Array<{s:{r:number;c:number};e:{r:number;c:number}}>) ?? [];
  merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  ws['!merges'] = merges;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r === r1 && c === c1) continue;
      const a = addr(r, c);
      if (!ws[a]) ws[a] = { v: '', t: 's' };
    }
  }
}

function fillRow(ws: WS, row: number, fromCol: number, toCol: number, style: CellStyle): void {
  for (let c = fromCol; c <= toCol; c++) {
    const a = addr(row, c);
    if (!ws[a]) ws[a] = { v: '', t: 's' };
    (ws[a] as Record<string, unknown>).s = style;
  }
}

function rh(ws: WS, row: number, hpt: number): void {
  const rows = (ws['!rows'] as Array<{hpt?:number}>) ?? [];
  while (rows.length <= row) rows.push({});
  rows[row] = { hpt };
  ws['!rows'] = rows;
}

// ── Color lookup helpers ──────────────────────────────────────────────────────

function recColors(rec: AIRecommendation): { bg: string; txt: string; bar: string } {
  switch (rec) {
    case 'Strong Hire':  return { bg: C.strongBg, txt: C.strongTxt, bar: C.strongBar };
    case 'Recommended':  return { bg: C.recBg,    txt: C.recTxt,   bar: C.recBar };
    case 'Consider':     return { bg: C.conBg,    txt: C.conTxt,   bar: C.conBar };
    case 'Low Priority': return { bg: C.lowBg,    txt: C.lowTxt,   bar: C.lowBar };
    case 'Pass':         return { bg: C.passBg,   txt: C.passTxt,  bar: C.passBar };
  }
}

function scoreColors(score: number): { bg: string; txt: string } {
  if (score >= 90) return { bg: C.s90Bg, txt: C.s90Txt };
  if (score >= 80) return { bg: C.s80Bg, txt: C.s80Txt };
  if (score >= 70) return { bg: C.s70Bg, txt: C.s70Txt };
  return { bg: C.sLoBg, txt: C.sLoTxt };
}

function confColors(conf: number): { bg: string; txt: string; label: string } {
  if (conf >= 80) return { bg: C.strongBg, txt: C.strongTxt, label: 'High' };
  if (conf >= 65) return { bg: C.conBg,    txt: C.conTxt,    label: 'Medium' };
  return { bg: C.passBg, txt: C.passTxt, label: 'Low' };
}

function availColors(av: string|undefined): { bg: string; txt: string } {
  switch (av) {
    case 'yes':      return { bg: C.availYesBg, txt: C.availYesTxt };
    case '60 days':  return { bg: C.avail60Bg,  txt: C.avail60Txt };
    case '90 days':  return { bg: C.avail90Bg,  txt: C.avail90Txt };
    default:         return { bg: C.availNoBg,  txt: C.availNoTxt };
  }
}

// ── Visual horizontal bar chart row ──────────────────────────────────────────

function drawBar(
  ws: WS, row: number,
  labelCol: number, barStart: number, barEnd: number, cntCol: number, pctCol: number,
  label: string, value: number, maxValue: number, total: number,
  barRgb: string, labelBg: string, labelFg: string,
): void {
  const W = barEnd - barStart + 1;
  const filled = maxValue > 0 ? Math.round((value / maxValue) * W) : 0;

  sc(ws, row, labelCol, label, {
    fill: { patternType: 'solid', fgColor: { rgb: labelBg } },
    font: { bold: true, sz: 10, color: { rgb: labelFg }, name: 'Calibri' },
    alignment: { horizontal: 'right', vertical: 'center' },
  });

  for (let c = barStart; c <= barStart + filled - 1; c++) {
    sc(ws, row, c, '', { fill: { patternType: 'solid', fgColor: { rgb: barRgb } }, alignment: { vertical: 'center' } });
  }
  for (let c = barStart + filled; c <= barEnd; c++) {
    sc(ws, row, c, '', { fill: { patternType: 'solid', fgColor: { rgb: C.chartEmpty } }, alignment: { vertical: 'center' } });
  }

  sc(ws, row, cntCol, value, {
    fill: { patternType: 'solid', fgColor: { rgb: C.white } },
    font: { bold: true, sz: 11, color: { rgb: barRgb }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  sc(ws, row, pctCol, pct(value, total), {
    fill: { patternType: 'solid', fgColor: { rgb: C.slate50 } },
    font: { sz: 10, color: { rgb: C.textMuted }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { bottom: { style: 'thin', color: { rgb: C.borderLight } } },
  });
  rh(ws, row, 20);
}

// ── Pool analytics ────────────────────────────────────────────────────────────

function computeAnalytics(all: Candidate[]) {
  const total   = all.length;
  const recs    = all.map(c => getAIRecommendation(c.overall_score));
  const scores  = all.map(c => c.overall_score);
  const confs   = all.map(c => getConfidenceLevel(c));
  const exps    = all.map(c => c.experience ?? 0);
  const sorted  = [...scores].sort((a, b) => a - b);

  const recCount = (r: AIRecommendation) => recs.filter(x => x === r).length;

  const strong   = recCount('Strong Hire');
  const rec      = recCount('Recommended');
  const consider = recCount('Consider');
  const lowPri   = recCount('Low Priority');
  const pass     = recCount('Pass');

  const topScore = Math.max(...scores, 0);
  const topCand  = all.find(c => c.overall_score === topScore);

  return {
    total, strong, rec, consider, lowPri, pass,
    gems:      all.filter(c => !!c.hidden_by).length,
    avgScore:  +avg(scores).toFixed(1),
    topScore:  +topScore.toFixed(1),
    medScore:  +(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(1),
    lowScore:  +(Math.min(...scores, 100)).toFixed(1),
    avgConf:   Math.round(avg(confs)),
    avgExp:    +avg(exps).toFixed(1),
    immediate: all.filter(c => c.availability === 'yes').length,
    topCand,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 1 — Executive Cover Page
// ═════════════════════════════════════════════════════════════════════════════

function buildCoverPage(allCandidates: Candidate[], filteredCount: number, timestamp: string): WS {
  const ws: WS = {};
  const NCOLS  = 11; // A(0)–L(11)

  ws['!cols'] = [
    { wch: 3  },   // A — margin
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },   // B–F
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },   // G–K
    { wch: 3  },   // L — margin
  ];
  ws['!rows'] = [] as Array<{hpt?:number}>;

  const a = computeAnalytics(allCandidates);

  // ── Dark header band (rows 0-7) ───────────────────────────────────
  const darkFill = { fill: { patternType: 'solid', fgColor: { rgb: C.navy950 } } };
  for (let r = 0; r <= 7; r++) fillRow(ws, r, 0, NCOLS, darkFill as CellStyle);
  [8, 8, 8, 44, 8, 30, 22, 8, 18].forEach((h, i) => rh(ws, i, h));

  // Brand
  sc(ws, 3, 1, '◆  IntelliRank AI', {
    fill: { patternType: 'solid', fgColor: { rgb: C.navy950 } },
    font: { bold: true, sz: 24, color: { rgb: C.accent }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  mg(ws, 3, 1, 3, NCOLS - 1);

  // Title
  sc(ws, 5, 1, 'ENTERPRISE HIRING INTELLIGENCE REPORT', {
    fill: { patternType: 'solid', fgColor: { rgb: C.navy950 } },
    font: { bold: true, sz: 18, color: { rgb: C.white }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  mg(ws, 5, 1, 5, NCOLS - 1);

  // Subtitle
  sc(ws, 6, 1, 'AI-Powered Hiring Intelligence Platform  ·  Generated by IntelliRank AI Recommendation Engine', {
    fill: { patternType: 'solid', fgColor: { rgb: C.navy950 } },
    font: { sz: 10, color: { rgb: C.textLight }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  mg(ws, 6, 1, 6, NCOLS - 1);

  // Badges row
  sc(ws, 7, 1, `CONFIDENTIAL  ·  Executive Report  ·  AI Recommendation Engine v1.0`, {
    fill: { patternType: 'solid', fgColor: { rgb: C.navy800 } },
    font: { bold: true, sz: 9, color: { rgb: C.textLight }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  mg(ws, 7, 1, 7, NCOLS - 1);

  // ── Report info row (row 8) ───────────────────────────────────────
  rh(ws, 8, 18);
  sc(ws, 8, 1, 'PREPARED FOR',  kpiLabel(C.slate100));  mg(ws, 8, 1, 8, 3);
  sc(ws, 8, 5, 'GENERATED ON',  kpiLabel(C.slate100));  mg(ws, 8, 5, 8, 7);
  sc(ws, 8, 9, 'VERSION',        kpiLabel(C.slate100)); mg(ws, 8, 9, 8, NCOLS - 1);

  rh(ws, 9, 26);
  sc(ws, 9, 1, 'Recruitment Team', { ...kpiValue(C.navy800, 13, C.white), fill: { patternType: 'solid', fgColor: { rgb: C.slate50 } }, font: { bold: true, sz: 13, color: { rgb: C.navy800 }, name: 'Calibri' } });
  mg(ws, 9, 1, 9, 3);
  sc(ws, 9, 5, timestamp, { ...kpiValue(C.navy800, 11, C.white), fill: { patternType: 'solid', fgColor: { rgb: C.slate50 } }, font: { sz: 11, color: { rgb: C.navy700 }, name: 'Calibri' } });
  mg(ws, 9, 5, 9, 7);
  sc(ws, 9, 9, 'v1.0 — AI Engine', { ...kpiValue(C.navy800, 11, C.white), fill: { patternType: 'solid', fgColor: { rgb: C.slate50 } }, font: { sz: 11, color: { rgb: C.navy700 }, name: 'Calibri' } });
  mg(ws, 9, 9, 9, NCOLS - 1);

  // ── KPI band: row 10 (spacer), row 11 (section hdr) ─────────────
  rh(ws, 10, 10);
  rh(ws, 11, 22);
  sc(ws, 11, 1, '  KEY METRICS AT A GLANCE', sectionHdr()); mg(ws, 11, 1, 11, NCOLS - 1);

  // KPI Row 1 labels (row 12)
  rh(ws, 12, 16);
  const kpi1 = [
    { c: 1, span: 1, label: 'TOTAL CANDIDATES' },
    { c: 3, span: 1, label: 'STRONG HIRE' },
    { c: 5, span: 1, label: 'RECOMMENDED' },
    { c: 7, span: 1, label: 'HIDDEN GEMS' },
    { c: 9, span: 1, label: 'PASS / LOW PRI.' },
  ];
  for (const k of kpi1) {
    sc(ws, 12, k.c, k.label, kpiLabel()); mg(ws, 12, k.c, 12, k.c + k.span);
  }

  // KPI Row 1 values (row 13)
  rh(ws, 13, 52);
  sc(ws, 13, 1, a.total,   kpiValue()); mg(ws, 13, 1, 13, 2);
  sc(ws, 13, 3, a.strong,  kpiValue(C.strongTxt)); mg(ws, 13, 3, 13, 4);
  sc(ws, 13, 5, a.rec,     kpiValue(C.recTxt)); mg(ws, 13, 5, 13, 6);
  sc(ws, 13, 7, a.gems,    kpiValue(C.gemTxt)); mg(ws, 13, 7, 13, 8);
  sc(ws, 13, 9, a.pass + a.lowPri, kpiValue(C.passTxt)); mg(ws, 13, 9, 13, NCOLS - 1);

  // KPI Row 2 labels (row 14)
  rh(ws, 14, 16);
  const kpi2 = [
    { c: 1, label: 'AVG AI SCORE' },
    { c: 3, label: 'TOP AI SCORE' },
    { c: 5, label: 'AVG CONFIDENCE' },
    { c: 7, label: 'TOTAL EVALUATED' },
    { c: 9, label: 'IMMEDIATE JOINERS' },
  ];
  for (const k of kpi2) {
    sc(ws, 14, k.c, k.label, kpiLabel(C.slate100)); mg(ws, 14, k.c, 14, k.c + 1);
  }

  // KPI Row 2 values (row 15)
  rh(ws, 15, 52);
  sc(ws, 15, 1, a.avgScore, kpiValue(C.navy700, 22, C.slate50)); mg(ws, 15, 1, 15, 2);
  sc(ws, 15, 3, a.topScore, kpiValue(C.strongTxt, 22, C.strongBg)); mg(ws, 15, 3, 15, 4);
  sc(ws, 15, 5, `${a.avgConf}%`, kpiValue(C.navy700, 22, C.slate50)); mg(ws, 15, 5, 15, 6);
  sc(ws, 15, 7, a.total, kpiValue(C.navy700, 22, C.slate50)); mg(ws, 15, 7, 15, 8);
  sc(ws, 15, 9, a.immediate, kpiValue(C.strongTxt, 22, C.strongBg)); mg(ws, 15, 9, 15, NCOLS - 1);

  // ── Top Candidate spotlight (row 17-19) ──────────────────────────
  rh(ws, 16, 14);
  rh(ws, 17, 20);
  sc(ws, 17, 1, '  TOP CANDIDATE', sectionHdr()); mg(ws, 17, 1, 17, NCOLS - 1);

  rh(ws, 18, 46);
  const tc    = a.topCand;
  const tcRec = tc ? getAIRecommendation(tc.overall_score) : 'Consider';
  const tcClr = recColors(tcRec);
  const tcVal = tc
    ? `${tc.headline ?? tc.id}  ·  ${tc.overall_score.toFixed(1)} AI Score  ·  ${tcRec}  ·  Rank #${tc.rank}`
    : 'Not available';
  sc(ws, 18, 1, tcVal, {
    fill: { patternType: 'solid', fgColor: { rgb: tcClr.bg } },
    font: { bold: true, sz: 14, color: { rgb: tcClr.txt }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  });
  mg(ws, 18, 1, 18, NCOLS - 1);

  if (tc?.current_company || tc?.location) {
    rh(ws, 19, 20);
    const meta = [tc?.current_company, tc?.location, tc?.experience != null ? `${tc.experience} years experience` : null].filter(Boolean).join('  ·  ');
    sc(ws, 19, 1, meta, {
      fill: { patternType: 'solid', fgColor: { rgb: tcClr.bg } },
      font: { sz: 10, color: { rgb: tcClr.txt }, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center' },
    });
    mg(ws, 19, 1, 19, NCOLS - 1);
  }

  // ── Export scope note (row 20) ─────────────────────────────────────
  rh(ws, 20, 14);
  const scopeNote = filteredCount < allCandidates.length
    ? `This report covers ${filteredCount} candidates matching applied recruiter filters (of ${allCandidates.length} total evaluated)`
    : `This report covers all ${allCandidates.length} candidates evaluated by IntelliRank AI`;
  sc(ws, 20, 1, scopeNote, {
    fill: { patternType: 'solid', fgColor: { rgb: C.slate100 } },
    font: { sz: 9, color: { rgb: C.textMuted }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  mg(ws, 20, 1, 20, NCOLS - 1);

  // ── Dark footer (rows 22-23) ──────────────────────────────────────
  rh(ws, 21, 10);
  rh(ws, 22, 22);
  fillRow(ws, 22, 0, NCOLS, hdr(C.navy900, 9) as CellStyle);
  sc(ws, 22, 1, `IntelliRank AI  ·  Enterprise Hiring Intelligence Report  ·  Confidential  ·  ${timestamp}  ·  AI Engine v1.0`, {
    fill: { patternType: 'solid', fgColor: { rgb: C.navy900 } },
    font: { sz: 9, color: { rgb: C.textLight }, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  mg(ws, 22, 1, 22, NCOLS - 1);
  rh(ws, 23, 10);
  fillRow(ws, 23, 0, NCOLS, hdr(C.navy900) as CellStyle);

  ws['!ref'] = `A1:L24`;
  return ws;
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 2 — Executive Summary
// ═════════════════════════════════════════════════════════════════════════════

function buildExecutiveSummary(allCandidates: Candidate[], timestamp: string): WS {
  const ws: WS = {};
  const NCOLS = 13; // A–N

  ws['!cols'] = Array.from({ length: 14 }, (_, i) =>
    i === 0 || i === 13 ? { wch: 2 } : { wch: 18 });
  ws['!rows'] = [] as Array<{hpt?:number}>;

  const a = computeAnalytics(allCandidates);

  // Title
  rh(ws, 0, 28);
  sc(ws, 0, 1, 'IntelliRank AI  ·  Executive Summary', hdr(C.navy900, 13)); mg(ws, 0, 1, 0, NCOLS - 1);
  rh(ws, 1, 15);
  sc(ws, 1, 1, `${a.total} candidates evaluated  ·  ${timestamp}  ·  Confidential`, hdr(C.navy800, 9, C.textLight));
  mg(ws, 1, 1, 1, NCOLS - 1);

  // ── KPI Block (rows 3-5, 6-8) ──────────────────────────────────────
  rh(ws, 2, 10);
  rh(ws, 3, 20);
  sc(ws, 3, 1, '  RECOMMENDATION OVERVIEW', sectionHdr()); mg(ws, 3, 1, 3, NCOLS - 1);

  // KPI Row 1 (6 KPIs × 2 cols each): rows 4 (labels), 5 (values)
  const kpiRow1 = [
    { label: 'TOTAL CANDIDATES', value: a.total,   fg: C.navy800,  bg: C.slate50   },
    { label: 'STRONG HIRE',      value: a.strong,  fg: C.strongTxt, bg: C.strongBg },
    { label: 'RECOMMENDED',      value: a.rec,     fg: C.recTxt,   bg: C.recBg     },
    { label: 'CONSIDER',         value: a.consider,fg: C.conTxt,   bg: C.conBg     },
    { label: 'PASS',             value: a.pass + a.lowPri, fg: C.passTxt, bg: C.passBg },
    { label: 'HIDDEN GEMS',      value: a.gems,    fg: C.gemTxt,   bg: C.gemBg     },
  ];
  rh(ws, 4, 15); rh(ws, 5, 48);
  kpiRow1.forEach((k, i) => {
    const col = 1 + i * 2;
    sc(ws, 4, col, k.label, kpiLabel(k.bg)); mg(ws, 4, col, 4, col + 1);
    sc(ws, 5, col, k.value, kpiValue(k.fg, 20, k.bg)); mg(ws, 5, col, 5, col + 1);
  });

  // KPI Row 2 (6 more KPIs): rows 6 (labels), 7 (values)
  rh(ws, 6, 15); rh(ws, 7, 48);
  const kpiRow2 = [
    { label: 'AVG AI SCORE',    value: a.avgScore,     fg: C.navy800,  bg: C.slate50  },
    { label: 'HIGHEST SCORE',   value: a.topScore,     fg: C.strongTxt, bg: C.strongBg},
    { label: 'MEDIAN SCORE',    value: a.medScore,     fg: C.navy800,  bg: C.slate50  },
    { label: 'AVG CONFIDENCE',  value: `${a.avgConf}%`, fg: C.navy800, bg: C.slate50  },
    { label: 'IMMEDIATE AVAIL.',value: a.immediate,    fg: C.strongTxt, bg: C.strongBg},
    { label: 'AVG EXPERIENCE',  value: `${a.avgExp}y`, fg: C.navy800,  bg: C.slate50  },
  ];
  kpiRow2.forEach((k, i) => {
    const col = 1 + i * 2;
    sc(ws, 6, col, k.label, kpiLabel()); mg(ws, 6, col, 6, col + 1);
    sc(ws, 7, col, k.value, kpiValue(k.fg, 20, k.bg)); mg(ws, 7, col, 7, col + 1);
  });

  // ── Hiring Funnel (rows 9-20) ────────────────────────────────────
  rh(ws, 8, 10);
  rh(ws, 9, 20);
  sc(ws, 9, 1, '  HIRING PIPELINE', sectionHdr()); mg(ws, 9, 1, 9, NCOLS - 1);
  rh(ws, 10, 14);
  sc(ws, 10, 1, 'Stage', colHdr()); mg(ws, 10, 1, 10, 3);
  sc(ws, 10, 4, 'Visual Distribution (proportional to total pool)', colHdr()); mg(ws, 10, 4, 10, 10);
  sc(ws, 10, 11, 'Count', colHdr()); mg(ws, 10, 11, 10, 11);
  sc(ws, 10, 12, '% of Pool', colHdr()); mg(ws, 10, 12, 10, NCOLS - 1);

  const funnelStages = [
    { label: 'All Candidates', value: a.total, bg: C.navy700, txt: C.white, bar: C.navy700 },
    { label: 'Consider & Above', value: a.strong + a.rec + a.consider, bg: C.conBg, txt: C.conTxt, bar: C.conBar },
    { label: 'Recommended & Above', value: a.strong + a.rec, bg: C.recBg, txt: C.recTxt, bar: C.recBar },
    { label: 'Strong Hire', value: a.strong, bg: C.strongBg, txt: C.strongTxt, bar: C.strongBar },
  ];
  const maxVal = a.total;

  funnelStages.forEach((stage, i) => {
    const row = 11 + i * 2;
    rh(ws, row, 24);
    const W = 7; // bar cols 4-10
    const filled = maxVal > 0 ? Math.round((stage.value / maxVal) * W) : 0;
    const offset = Math.floor((W - filled) / 2); // center the bar
    sc(ws, row, 1, stage.label, { fill: { patternType: 'solid', fgColor: { rgb: stage.bg } }, font: { bold: true, sz: 11, color: { rgb: stage.txt }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } });
    mg(ws, row, 1, row, 3);
    for (let c = 4; c <= 10; c++) {
      const inBar = c >= 4 + offset && c < 4 + offset + filled;
      sc(ws, row, c, '', { fill: { patternType: 'solid', fgColor: { rgb: inBar ? stage.bar : C.chartEmpty } } });
    }
    sc(ws, row, 11, stage.value, { fill: { patternType: 'solid', fgColor: { rgb: stage.bg } }, font: { bold: true, sz: 12, color: { rgb: stage.txt }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } });
    sc(ws, row, 12, pct(stage.value, a.total), { fill: { patternType: 'solid', fgColor: { rgb: C.slate50 } }, font: { sz: 10, color: { rgb: C.textMuted }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } });
    mg(ws, row, 12, row, NCOLS - 1);

    // Arrow row between stages
    if (i < funnelStages.length - 1) {
      rh(ws, row + 1, 14);
      fillRow(ws, row + 1, 1, NCOLS - 1, { fill: { patternType: 'solid', fgColor: { rgb: C.white } } } as CellStyle);
      sc(ws, row + 1, 7, '▼', { fill: { patternType: 'solid', fgColor: { rgb: C.white } }, font: { sz: 10, color: { rgb: C.textLight }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } });
    }
  });

  // ── Executive Observations (rows 20+) ───────────────────────────
  const obsStart = 20;
  rh(ws, obsStart, 10);
  rh(ws, obsStart + 1, 20);
  sc(ws, obsStart + 1, 1, '  EXECUTIVE OBSERVATIONS', sectionHdr()); mg(ws, obsStart + 1, 1, obsStart + 1, NCOLS - 1);

  const observations = [
    a.strong >= 5
      ? `AI identified ${a.strong} exceptional candidate${a.strong > 1 ? 's' : ''} with Strong Hire recommendation — suitable for immediate offer.`
      : `${a.strong > 0 ? `AI identified ${a.strong} candidate${a.strong > 1 ? 's' : ''} with Strong Hire status.` : 'No Strong Hire candidates in current pool.'}`,
    `Average AI confidence of ${a.avgConf}% indicates ${a.avgConf >= 80 ? 'high-quality signal' : a.avgConf >= 65 ? 'reliable' : 'moderate-quality'} candidate assessment across the pool.`,
    a.immediate > 0
      ? `${a.immediate} candidate${a.immediate > 1 ? 's are' : ' is'} available for immediate joining, reducing hiring timeline risk significantly.`
      : 'No immediately available candidates. Factor notice periods into hiring timeline planning.',
    a.gems > 0
      ? `${a.gems} Hidden Gem${a.gems > 1 ? 's' : ''} identified by AI — non-obvious candidates with strong potential requiring recruiter attention.`
      : 'No Hidden Gems identified in current pool.',
    `Candidate pool spans ${a.avgExp.toFixed(0)}+ years average experience with top score of ${a.topScore} and median of ${a.medScore}.`,
  ];

  observations.forEach((obs, i) => {
    const r = obsStart + 2 + i;
    rh(ws, r, 26);
    const bg = i % 2 === 0 ? C.white : C.slate50;
    sc(ws, r, 1, `${i + 1}.  ${obs}`, {
      fill: { patternType: 'solid', fgColor: { rgb: bg } },
      font: { sz: 11, color: { rgb: C.navy800 }, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: { bottom: { style: 'thin', color: { rgb: C.borderLight } } },
    });
    mg(ws, r, 1, r, NCOLS - 1);
  });

  const lastRow = obsStart + 2 + observations.length + 1;
  ws['!ref'] = `A1:N${lastRow}`;
  return ws;
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 3 — AI Ranked Candidates (with enrichment)
// ═════════════════════════════════════════════════════════════════════════════

const S3_COLS = [
  { wch: 7  }, // A: Rank
  { wch: 26 }, // B: Candidate
  { wch: 20 }, // C: Company
  { wch: 14 }, // D: Career Level
  { wch: 16 }, // E: Location
  { wch: 11 }, // F: Experience
  { wch: 11 }, // G: AI Score
  { wch: 10 }, // H: Skill Fit
  { wch: 12 }, // I: Recruitability
  { wch: 10 }, // J: Education
  { wch: 10 }, // K: Potential
  { wch: 14 }, // L: Confidence
  { wch: 15 }, // M: Availability
  { wch: 18 }, // N: AI Recommendation
  { wch: 18 }, // O: Interview Priority
  { wch: 12 }, // P: Hidden Gem
  { wch: 14 }, // Q: Hiring Risk
  { wch: 14 }, // R: Tech. Depth
  { wch: 26 }, // S: Strength Summary
  { wch: 56 }, // T: Executive Summary
  { wch: 16 }, // U: Recruiter Decision (blank)
  { wch: 18 }, // V: Interview Status (blank)
];

const S3_HDRS = [
  'Rank', 'Candidate', 'Company', 'Career Level', 'Location', 'Experience',
  'AI Score', 'Skill Fit', 'Recruitability', 'Education', 'Potential',
  'Confidence', 'Availability', 'AI Recommendation', 'Interview Priority',
  'Hidden Gem', 'Hiring Risk', 'Technical Depth', 'Strength Summary',
  'Executive Summary', 'Recruiter Decision', 'Interview Status',
];

function buildRankedCandidates(candidates: Candidate[]): WS {
  const ws: WS = {};
  ws['!cols']  = S3_COLS;
  ws['!rows']  = [] as Array<{hpt?:number}>;
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  ws['!autofilter'] = { ref: `A1:V1` };

  // Header row
  rh(ws, 0, 30);
  S3_HDRS.forEach((h, c) => sc(ws, 0, c, h, colHdr()));

  candidates.forEach((c, i) => {
    const rowIdx = i + 1;
    const isTop5 = c.rank <= 5;
    const isGem  = !!c.hidden_by;
    const rec    = getAIRecommendation(c.overall_score);
    const conf   = getConfidenceLevel(c);
    const rcl    = recColors(rec);
    const scl    = scoreColors(c.overall_score);
    const ccl    = confColors(conf);
    const acl    = availColors(c.availability);
    const enrich = enrichCandidate(c);
    const summary = getExecutiveSummary(c);
    const baseBg  = isTop5 ? C.rowTop5 : i % 2 === 0 ? C.white : C.rowAlt;
    const baseTxt = C.textDark;

    function b(align: 'left'|'center'|'right' = 'left', bold = false, sz = 10, wrap = false): CellStyle {
      return cell(baseBg, baseTxt, align, bold, sz, wrap);
    }

    const exp = c.experience != null ? `${c.experience} yrs` : '—';
    const sf  = getDim(c, 'Skill Fit');
    const rt  = c.recruitability?.score ?? getDim(c, 'Recruitability');
    const edu = getDim(c, 'Education');
    const pot = c.potential_score != null ? +c.potential_score.toFixed(0) : getDim(c, 'Potential');

    sc(ws, rowIdx, 0,  c.rank,                          { ...b('center', true), font: { bold: true, sz: 10, color: { rgb: C.textMuted }, name: 'Calibri' } });
    sc(ws, rowIdx, 1,  c.headline ?? c.id,              b('left', false, 10));
    sc(ws, rowIdx, 2,  c.current_company ?? '—',        b('left', false, 10));
    sc(ws, rowIdx, 3,  enrich.careerLevel,              b('center'));
    sc(ws, rowIdx, 4,  c.location ?? '—',               b('left', false, 10));
    sc(ws, rowIdx, 5,  exp,                             b('center'));
    sc(ws, rowIdx, 6,  +c.overall_score.toFixed(1),     cell(scl.bg, scl.txt, 'center', true, 11));
    sc(ws, rowIdx, 7,  sf,                              b('center'));
    sc(ws, rowIdx, 8,  rt,                              b('center'));
    sc(ws, rowIdx, 9,  edu,                             b('center'));
    sc(ws, rowIdx, 10, pot,                             b('center'));
    sc(ws, rowIdx, 11, `${conf}% — ${ccl.label}`,       cell(ccl.bg, ccl.txt, 'center', true));
    sc(ws, rowIdx, 12, c.availability ? (AVAIL_MAP[c.availability] ?? c.availability) : '—', cell(acl.bg, acl.txt, 'center', false));
    sc(ws, rowIdx, 13, rec,                             cell(rcl.bg, rcl.txt, 'center', true));
    sc(ws, rowIdx, 14, enrich.interviewPriority,        cell(isTop5 ? C.strongBg : baseBg, isTop5 ? C.strongTxt : baseTxt, 'left'));
    sc(ws, rowIdx, 15, isGem ? '◆  Yes' : '—',         isGem ? cell(C.gemBg, C.gemTxt, 'center', true) : b('center'));
    sc(ws, rowIdx, 16, enrich.hiringRisk,              b('center'));
    sc(ws, rowIdx, 17, enrich.technicalDepth,          b('center'));
    sc(ws, rowIdx, 18, enrich.strengthSummary,         b('left', false, 10, true));
    sc(ws, rowIdx, 19, summary,                        b('left', false, 10, true));
    sc(ws, rowIdx, 20, '',                             b('left'));
    sc(ws, rowIdx, 21, '',                             b('center'));

    const lines = Math.max(2, Math.ceil(summary.length / 68));
    rh(ws, rowIdx, Math.max(26, lines * 13));
  });

  ws['!ref'] = `A1:V${candidates.length + 1}`;
  return ws;
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 4 — AI Analytics Dashboard (visual charts)
// ═════════════════════════════════════════════════════════════════════════════

function buildAnalyticsDashboard(allRankings: Candidate[], allHiddenGems: Candidate[]): WS {
  const ws: WS = {};
  // A=label(22), B-M=chart(5 each=60), N=count(9), O=pct(9)
  ws['!cols'] = [
    { wch: 22 },
    ...Array.from({ length: 12 }, () => ({ wch: 5 })),
    { wch: 9 }, { wch: 9 },
  ];
  ws['!rows'] = [] as Array<{hpt?:number}>;

  const all   = [...allRankings, ...allHiddenGems];
  const total = all.length;
  const recs  = all.map(c => getAIRecommendation(c.overall_score));

  // Title row
  rh(ws, 0, 28); sc(ws, 0, 0, 'IntelliRank AI  ·  AI Analytics Dashboard', hdr(C.navy900, 13)); mg(ws, 0, 0, 0, 14);
  rh(ws, 1, 15); sc(ws, 1, 0, `Visual analytics for ${total} candidates evaluated`, hdr(C.navy800, 9, C.textLight)); mg(ws, 1, 0, 1, 14);

  let row = 2;

  function sectionTitle(title: string) {
    rh(ws, row, 10); row++;
    rh(ws, row, 22);
    sc(ws, row, 0, `  ${title}`, sectionHdr()); mg(ws, row, 0, row, 14);
    row++;
    rh(ws, row, 16);
    sc(ws, row, 0,  'Category',   colHdr());
    sc(ws, row, 1,  'Visual Distribution (each cell ≈ 8% of max)', colHdr()); mg(ws, row, 1, row, 12);
    sc(ws, row, 13, 'Count',      colHdr());
    sc(ws, row, 14, '% of Total', colHdr());
    row++;
  }

  // ── Recommendation Distribution ────────────────────────────────
  sectionTitle('RECOMMENDATION DISTRIBUTION');
  const recData = [
    { label: 'Strong Hire',  count: recs.filter(r => r === 'Strong Hire').length,  bar: C.strongBar, bg: C.strongBg, txt: C.strongTxt },
    { label: 'Recommended',  count: recs.filter(r => r === 'Recommended').length,  bar: C.recBar,    bg: C.recBg,    txt: C.recTxt    },
    { label: 'Consider',     count: recs.filter(r => r === 'Consider').length,     bar: C.conBar,    bg: C.conBg,    txt: C.conTxt    },
    { label: 'Low Priority', count: recs.filter(r => r === 'Low Priority').length, bar: C.lowBar,    bg: C.lowBg,    txt: C.lowTxt    },
    { label: 'Pass',         count: recs.filter(r => r === 'Pass').length,         bar: C.passBar,   bg: C.passBg,   txt: C.passTxt   },
  ];
  const maxRec = Math.max(...recData.map(d => d.count), 1);
  for (const d of recData) {
    drawBar(ws, row, 0, 1, 12, 13, 14, d.label, d.count, maxRec, total, d.bar, d.bg, d.txt);
    row++;
  }

  // ── Score Distribution ─────────────────────────────────────────
  sectionTitle('AI SCORE DISTRIBUTION');
  const scoreDist = [
    { label: '90–100 (Elite)',    count: all.filter(c => c.overall_score >= 90).length,                             bar: C.strongBar, bg: C.strongBg, txt: C.strongTxt },
    { label: '80–89 (Strong)',    count: all.filter(c => c.overall_score >= 80 && c.overall_score < 90).length,     bar: C.recBar,    bg: C.recBg,    txt: C.recTxt    },
    { label: '70–79 (Good)',      count: all.filter(c => c.overall_score >= 70 && c.overall_score < 80).length,     bar: C.conBar,    bg: C.conBg,    txt: C.conTxt    },
    { label: '55–69 (Marginal)',  count: all.filter(c => c.overall_score >= 55 && c.overall_score < 70).length,     bar: C.lowBar,    bg: C.lowBg,    txt: C.lowTxt    },
    { label: 'Below 55 (Weak)',   count: all.filter(c => c.overall_score < 55).length,                              bar: C.passBar,   bg: C.passBg,   txt: C.passTxt   },
  ];
  const maxScore = Math.max(...scoreDist.map(d => d.count), 1);
  for (const d of scoreDist) {
    drawBar(ws, row, 0, 1, 12, 13, 14, d.label, d.count, maxScore, total, d.bar, d.bg, d.txt);
    row++;
  }

  // ── Availability Distribution ─────────────────────────────────
  sectionTitle('AVAILABILITY BREAKDOWN');
  const availDist = [
    { label: 'Immediate',      count: all.filter(c => c.availability === 'yes').length,       bar: C.strongBar, bg: C.availYesBg, txt: C.availYesTxt },
    { label: '60-day notice',  count: all.filter(c => c.availability === '60 days').length,   bar: C.recBar,    bg: C.avail60Bg,  txt: C.avail60Txt  },
    { label: '90-day notice',  count: all.filter(c => c.availability === '90 days').length,   bar: C.conBar,    bg: C.avail90Bg,  txt: C.avail90Txt  },
    { label: 'Not available',  count: all.filter(c => c.availability === 'no').length,        bar: C.lowBar,    bg: C.availNoBg,  txt: C.availNoTxt  },
    { label: 'Not specified',  count: all.filter(c => !c.availability).length,                bar: C.lowBar,    bg: C.availNoBg,  txt: C.availNoTxt  },
  ].filter(d => d.count > 0);
  const maxAvail = Math.max(...availDist.map(d => d.count), 1);
  for (const d of availDist) {
    drawBar(ws, row, 0, 1, 12, 13, 14, d.label, d.count, maxAvail, total, d.bar, d.bg, d.txt);
    row++;
  }

  // ── Experience Distribution ───────────────────────────────────
  sectionTitle('EXPERIENCE DISTRIBUTION');
  const expDist = [
    { label: '0–2 years (Junior)',   count: all.filter(c => (c.experience ?? 0) <= 2).length },
    { label: '3–5 years (Mid)',      count: all.filter(c => { const e = c.experience ?? 0; return e >= 3 && e <= 5; }).length },
    { label: '6–10 years (Senior)',  count: all.filter(c => { const e = c.experience ?? 0; return e >= 6 && e <= 10; }).length },
    { label: '10+ years (Lead+)',    count: all.filter(c => (c.experience ?? 0) > 10).length },
  ].filter(d => d.count > 0);
  const maxExp = Math.max(...expDist.map(d => d.count), 1);
  for (const d of expDist) {
    drawBar(ws, row, 0, 1, 12, 13, 14, d.label, d.count, maxExp, total, C.recBar, C.recBg, C.recTxt);
    row++;
  }

  // ── Confidence Distribution ───────────────────────────────────
  sectionTitle('CONFIDENCE DISTRIBUTION');
  const confs = all.map(c => getConfidenceLevel(c));
  const confDist = [
    { label: 'High Confidence (80%+)',   count: confs.filter(c => c >= 80).length, bar: C.strongBar, bg: C.strongBg, txt: C.strongTxt },
    { label: 'Medium Confidence (65–79%)',count: confs.filter(c => c >= 65 && c < 80).length, bar: C.conBar, bg: C.conBg, txt: C.conTxt },
    { label: 'Low Confidence (<65%)',     count: confs.filter(c => c < 65).length,  bar: C.passBar,   bg: C.passBg,   txt: C.passTxt   },
  ];
  const maxConf = Math.max(...confDist.map(d => d.count), 1);
  for (const d of confDist) {
    drawBar(ws, row, 0, 1, 12, 13, 14, d.label, d.count, maxConf, total, d.bar, d.bg, d.txt);
    row++;
  }

  // ── Hidden Gems Analysis ──────────────────────────────────────
  if (allHiddenGems.length > 0) {
    rh(ws, row, 10); row++;
    rh(ws, row, 22);
    sc(ws, row, 0, '  HIDDEN GEMS ANALYSIS', sectionHdr()); mg(ws, row, 0, row, 14); row++;

    rh(ws, row, 16);
    ['Rank','Candidate','Company','AI Score','Recommendation','Hidden By','Tech Depth'].forEach((h, c) => sc(ws, row, c, h, colHdr()));
    row++;

    allHiddenGems.slice(0, 8).forEach((g, i) => {
      const enrich = enrichCandidate(g);
      const rec    = getAIRecommendation(g.overall_score);
      const rcl    = recColors(rec);
      const bg     = i % 2 === 0 ? C.gemBg : 'FFF8DC';
      rh(ws, row, 20);
      sc(ws, row, 0, g.rank, cell(bg, C.gemTxt, 'center', true));
      sc(ws, row, 1, g.headline ?? g.id, cell(bg, C.gemTxt, 'left'));
      sc(ws, row, 2, g.current_company ?? '—', cell(bg, C.gemTxt));
      sc(ws, row, 3, +g.overall_score.toFixed(1), cell(C.gemBg, C.gemTxt, 'center', true));
      sc(ws, row, 4, rec, cell(rcl.bg, rcl.txt, 'center', true));
      sc(ws, row, 5, g.hidden_by ?? '—', cell(bg, C.gemTxt));
      sc(ws, row, 6, enrich.technicalDepth, cell(bg, C.gemTxt, 'center'));
      row++;
    });
  }

  ws['!ref'] = `A1:O${row + 1}`;
  return ws;
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 5 — Candidate Comparison Matrix (Top 10)
// ═════════════════════════════════════════════════════════════════════════════

function buildComparisonMatrix(allRankings: Candidate[], allHiddenGems: Candidate[]): WS {
  const ws: WS = {};
  ws['!cols'] = [
    { wch: 26 }, // A: Candidate
    { wch: 12 }, // B: AI Score
    { wch: 11 }, // C: Skill Fit
    { wch: 12 }, // D: Experience
    { wch: 14 }, // E: Recruitability
    { wch: 12 }, // F: Education
    { wch: 12 }, // G: Potential
    { wch: 14 }, // H: Availability
    { wch: 12 }, // I: Confidence
    { wch: 18 }, // J: AI Recommendation
    { wch: 14 }, // K: Career Level
    { wch: 18 }, // L: Interview Priority
    { wch: 16 }, // M: Recruiter Decision
  ];
  ws['!rows']  = [] as Array<{hpt?:number}>;
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  // Title
  rh(ws, 0, 26); sc(ws, 0, 0, 'IntelliRank AI  ·  Candidate Comparison Matrix  ·  Top 10', hdr(C.navy900, 12)); mg(ws, 0, 0, 0, 12);
  rh(ws, 1, 14); sc(ws, 1, 0, 'Best value in each column is highlighted. Use this to directly compare top candidates.', hdr(C.navy800, 9, C.textLight)); mg(ws, 1, 0, 1, 12);

  // Column headers
  rh(ws, 2, 26);
  const hdrs = ['Candidate','AI Score','Skill Fit','Experience','Recruitability','Education','Potential','Availability','Confidence','AI Recommendation','Career Level','Interview Priority','Recruiter Decision'];
  hdrs.forEach((h, c) => sc(ws, 2, c, h, colHdr()));

  const top10 = [...allRankings, ...allHiddenGems]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);

  // Find column maxima for highlighting
  const numericCols: Record<number, number> = {
    1: Math.max(...top10.map(c => c.overall_score)),
    2: Math.max(...top10.map(c => (getDim(c, 'Skill Fit') as number) || 0)),
    3: Math.max(...top10.map(c => c.experience ?? 0)),
    4: Math.max(...top10.map(c => (c.recruitability?.score ?? (getDim(c, 'Recruitability') as number) ?? 0))),
    5: Math.max(...top10.map(c => (getDim(c, 'Education') as number) || 0)),
    6: Math.max(...top10.map(c => c.potential_score ?? 0)),
    8: Math.max(...top10.map(c => getConfidenceLevel(c))),
  };

  top10.forEach((c, i) => {
    const rowIdx = 3 + i;
    const isTop3  = i < 3;
    const isTop5  = i < 5;
    const enrich  = enrichCandidate(c);
    const rec     = getAIRecommendation(c.overall_score);
    const rcl     = recColors(rec);
    const conf    = getConfidenceLevel(c);
    const ccl     = confColors(conf);
    const acl     = availColors(c.availability);
    const baseBg  = isTop3 ? C.strongBg : isTop5 ? C.rowTop5 : i % 2 === 0 ? C.white : C.rowAlt;

    function isBest(col: number, val: number): boolean {
      return numericCols[col] !== undefined && Math.abs(val - numericCols[col]) < 0.01;
    }

    const sf  = (getDim(c, 'Skill Fit')  as number) || 0;
    const edu = (getDim(c, 'Education')  as number) || 0;
    const rt  = c.recruitability?.score ?? (getDim(c, 'Recruitability') as number) ?? 0;
    const pot = c.potential_score ?? 0;

    function maybeBest(col: number, val: number, bg: string, txt: string): CellStyle {
      return isBest(col, val)
        ? { fill: { patternType: 'solid', fgColor: { rgb: C.strongBg } }, font: { bold: true, sz: 11, color: { rgb: C.strongTxt }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: C.borderLight } } } }
        : cell(bg, txt, 'center', false, 10);
    }

    rh(ws, rowIdx, 24);
    sc(ws, rowIdx, 0,  c.headline ?? c.id,              cell(baseBg, C.textDark, 'left', isTop5));
    sc(ws, rowIdx, 1,  +c.overall_score.toFixed(1),     maybeBest(1, c.overall_score,  baseBg, C.textDark));
    sc(ws, rowIdx, 2,  sf || '—',                       maybeBest(2, sf,               baseBg, C.textDark));
    sc(ws, rowIdx, 3,  c.experience ?? '—',             maybeBest(3, c.experience ?? 0,baseBg, C.textDark));
    sc(ws, rowIdx, 4,  typeof rt === 'number' ? +rt.toFixed(0) : rt, maybeBest(4, typeof rt === 'number' ? rt : 0, baseBg, C.textDark));
    sc(ws, rowIdx, 5,  edu || '—',                      maybeBest(5, edu,              baseBg, C.textDark));
    sc(ws, rowIdx, 6,  pot ? +pot.toFixed(0) : '—',    maybeBest(6, pot,              baseBg, C.textDark));
    sc(ws, rowIdx, 7,  c.availability ? (AVAIL_MAP[c.availability] ?? c.availability) : '—', cell(acl.bg, acl.txt, 'center'));
    sc(ws, rowIdx, 8,  `${conf}%`,                      maybeBest(8, conf,             ccl.bg, ccl.txt));
    sc(ws, rowIdx, 9,  rec,                             cell(rcl.bg, rcl.txt, 'center', true));
    sc(ws, rowIdx, 10, enrich.careerLevel,              cell(baseBg, C.textDark, 'center'));
    sc(ws, rowIdx, 11, enrich.interviewPriority,        cell(isTop5 ? C.strongBg : baseBg, isTop5 ? C.strongTxt : C.textDark, 'left'));
    sc(ws, rowIdx, 12, '',                              cell(baseBg, C.textDark));
  });

  ws['!ref'] = `A1:M${3 + top10.length}`;
  return ws;
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 6 — Skill Intelligence
// ═════════════════════════════════════════════════════════════════════════════

function buildSkillIntelligence(allCandidates: Candidate[]): WS {
  const ws: WS = {};
  ws['!cols'] = [
    { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 24 },
  ];
  ws['!rows'] = [] as Array<{hpt?:number}>;

  rh(ws, 0, 26); sc(ws, 0, 0, 'IntelliRank AI  ·  Skill Intelligence Report', hdr(C.navy900, 13)); mg(ws, 0, 0, 0, 5);
  rh(ws, 1, 15); sc(ws, 1, 0, 'Dimension-level intelligence derived from AI scoring pipeline', hdr(C.navy800, 9, C.textLight)); mg(ws, 1, 0, 1, 5);

  const DIMS = ['Skill Fit', 'Career Intel', 'Recruitability', 'Education', 'Potential'];
  const _total = allCandidates.length; void _total;

  // ── Dimension Performance Analysis ───────────────────────────
  rh(ws, 2, 10);
  rh(ws, 3, 20);
  sc(ws, 3, 0, '  DIMENSION PERFORMANCE ANALYSIS', sectionHdr()); mg(ws, 3, 0, 3, 5);

  rh(ws, 4, 18);
  ['Dimension', 'Avg Score', 'Top (85+)', '% Top', 'Below 65', 'Assessment'].forEach((h, c) => sc(ws, 4, c, h, colHdr()));

  DIMS.forEach((dim, i) => {
    const scores = allCandidates
      .map(c => {
        const ds = c.dimension_scores?.find(d => d.dimension === dim);
        return ds?.score ?? (dim === 'Potential' ? c.potential_score : undefined);
      })
      .filter((s): s is number => s !== undefined);

    if (scores.length === 0) return;

    const avgS    = avg(scores);
    const topPerf = scores.filter(s => s >= 85).length;
    const below65 = scores.filter(s => s < 65).length;
    const rowIdx  = 5 + i;
    const bg      = i % 2 === 0 ? C.white : C.rowAlt;
    const clr     = scoreColors(avgS);

    const assessment = avgS >= 82 ? `Strong across the pool — ${dim} is a hiring strength`
      : avgS >= 72 ? `Good coverage — most candidates meet target threshold`
      : avgS >= 62 ? `Mixed signals — selective filtering recommended`
      : `Below-average — ${dim} requires close recruiter evaluation`;

    rh(ws, rowIdx, 22);
    sc(ws, rowIdx, 0, dim, cell(bg, C.textDark, 'left', true));
    sc(ws, rowIdx, 1, +avgS.toFixed(1), cell(clr.bg, clr.txt, 'center', true, 11));
    sc(ws, rowIdx, 2, topPerf, cell(C.strongBg, C.strongTxt, 'center', true));
    sc(ws, rowIdx, 3, pct(topPerf, scores.length), cell(bg, C.textMuted, 'center'));
    sc(ws, rowIdx, 4, below65, below65 > 5 ? cell(C.passBg, C.passTxt, 'center', true) : cell(bg, C.textMuted, 'center'));
    sc(ws, rowIdx, 5, assessment, cell(bg, C.textDark, 'left', false, 10, true));
  });

  // ── Strong Hire Dimension Patterns ─────────────────────────
  const obsRow = 11;
  rh(ws, obsRow, 10);
  rh(ws, obsRow + 1, 20);
  sc(ws, obsRow + 1, 0, '  STRONG HIRE DIMENSION PATTERNS', sectionHdr()); mg(ws, obsRow + 1, 0, obsRow + 1, 5);

  rh(ws, obsRow + 2, 16);
  ['Dimension', 'Strong Hire Avg', 'Overall Avg', 'Advantage', 'Signal Strength', 'Recruiter Insight'].forEach((h, c) => sc(ws, obsRow + 2, c, h, colHdr()));

  const strongCands = allCandidates.filter(c => getAIRecommendation(c.overall_score) === 'Strong Hire');

  DIMS.forEach((dim, i) => {
    const getScore = (c: Candidate) => c.dimension_scores?.find(d => d.dimension === dim)?.score
      ?? (dim === 'Potential' ? c.potential_score : undefined);

    const allScores    = allCandidates.map(getScore).filter((s): s is number => s !== undefined);
    const strongScores = strongCands.map(getScore).filter((s): s is number => s !== undefined);

    if (allScores.length === 0) return;

    const allAvg    = avg(allScores);
    const strongAvg = strongScores.length > 0 ? avg(strongScores) : 0;
    const diff      = strongAvg - allAvg;
    const rowIdx    = obsRow + 3 + i;
    const bg        = i % 2 === 0 ? C.white : C.rowAlt;
    const isStrong  = diff > 8;

    const insight = isStrong
      ? `High ${dim} is a strong predictor of Strong Hire — prioritise in screening`
      : diff > 3
      ? `${dim} contributes meaningfully to Strong Hire classification`
      : `${dim} shows minimal differentiation between Strong Hire and overall pool`;

    rh(ws, rowIdx, 26);
    sc(ws, rowIdx, 0, dim, cell(bg, C.textDark, 'left', true));
    sc(ws, rowIdx, 1, strongAvg > 0 ? +strongAvg.toFixed(1) : '—', cell(C.strongBg, C.strongTxt, 'center', true));
    sc(ws, rowIdx, 2, +allAvg.toFixed(1), cell(bg, C.textMuted, 'center'));
    sc(ws, rowIdx, 3, strongAvg > 0 ? `+${diff.toFixed(1)}` : '—', isStrong ? cell(C.strongBg, C.strongTxt, 'center', true) : cell(bg, C.textMuted, 'center'));
    sc(ws, rowIdx, 4, isStrong ? 'High' : diff > 3 ? 'Medium' : 'Low', isStrong ? cell(C.strongBg, C.strongTxt, 'center', true) : cell(bg, C.textMuted, 'center'));
    sc(ws, rowIdx, 5, insight, cell(bg, C.textDark, 'left', false, 10, true));
  });

  // ── Hiring Recommendations ───────────────────────────────────
  const recRow = obsRow + 3 + DIMS.length + 2;
  rh(ws, recRow, 20);
  sc(ws, recRow, 0, '  AI HIRING RECOMMENDATIONS', sectionHdr()); mg(ws, recRow, 0, recRow, 5);

  const hiringRecs = [
    'Focus initial outreach on all Strong Hire candidates before considering Recommended tier.',
    'Validate Hidden Gem candidates with a technical screening call — AI confidence is high despite non-obvious profile.',
    'Candidates with Skill Fit scores above 85 demonstrate strongest technical alignment with role requirements.',
    'Prioritise immediately available candidates to compress time-to-hire — particularly for senior roles.',
    'Education dimension scores below 65 may indicate non-traditional pathways — assess holistically.',
  ];

  hiringRecs.forEach((rec, i) => {
    const r   = recRow + 1 + i;
    const bg  = i % 2 === 0 ? C.white : C.slate50;
    rh(ws, r, 28);
    sc(ws, r, 0, `${i + 1}.  ${rec}`, {
      fill: { patternType: 'solid', fgColor: { rgb: bg } },
      font: { sz: 11, color: { rgb: C.navy800 }, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: { bottom: { style: 'thin', color: { rgb: C.borderLight } } },
    });
    mg(ws, r, 0, r, 5);
  });

  const lastRow = recRow + 1 + hiringRecs.length + 1;
  ws['!ref'] = `A1:F${lastRow}`;
  return ws;
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 7 — Recruiter Notes
// ═════════════════════════════════════════════════════════════════════════════

function buildRecruiterNotes(candidates: Candidate[]): WS {
  const ws: WS = {};
  ws['!cols'] = [
    { wch: 8  }, // Rank
    { wch: 26 }, // Candidate
    { wch: 20 }, // Company
    { wch: 12 }, // AI Score
    { wch: 18 }, // Recommendation
    { wch: 18 }, // Interview Priority
    { wch: 36 }, // Recruiter Notes
    { wch: 18 }, // Interview Round
    { wch: 20 }, // Interview Status
    { wch: 18 }, // Panel Feedback
    { wch: 20 }, // Salary Negotiation
    { wch: 18 }, // Offer Status
    { wch: 16 }, // Joining Date
    { wch: 16 }, // Final Decision
    { wch: 28 }, // Action Items
  ];
  ws['!rows']  = [] as Array<{hpt?:number}>;
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];

  rh(ws, 0, 26); sc(ws, 0, 0, 'IntelliRank AI  ·  Recruiter Notes & Tracking', hdr(C.navy900, 12)); mg(ws, 0, 0, 0, 14);
  rh(ws, 1, 15); sc(ws, 1, 0, 'Editable recruiter tracking sheet. All AI recommendation columns are pre-populated. Add notes in the blue columns.', hdr(C.navy800, 9, C.textLight)); mg(ws, 1, 0, 1, 14);

  const hdrs = ['Rank','Candidate','Company','AI Score','AI Recommendation','Interview Priority','Recruiter Notes','Interview Round','Interview Status','Panel Feedback','Salary Negotiation','Offer Status','Joining Date','Final Decision','Action Items'];
  rh(ws, 2, 26);
  hdrs.forEach((h, c) => {
    const isEditable = c >= 6;
    sc(ws, 2, c, h, isEditable
      ? { fill: { patternType: 'solid', fgColor: { rgb: C.recBg } }, font: { bold: true, sz: 9, color: { rgb: C.recTxt }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { bottom: { style: 'medium', color: { rgb: C.recBar } } } }
      : colHdr()
    );
  });

  candidates.forEach((c, i) => {
    const rowIdx = 3 + i;
    const rec    = getAIRecommendation(c.overall_score);
    const rcl    = recColors(rec);
    const enrich = enrichCandidate(c);
    const bg     = i % 2 === 0 ? C.white : C.rowAlt;
    const editBg = i % 2 === 0 ? 'F0F7FF' : 'E8F2FF';

    rh(ws, rowIdx, 22);
    sc(ws, rowIdx, 0,  c.rank,                          cell(bg, C.textMuted, 'center', true));
    sc(ws, rowIdx, 1,  c.headline ?? c.id,              cell(bg, C.textDark, 'left'));
    sc(ws, rowIdx, 2,  c.current_company ?? '—',        cell(bg, C.textMuted));
    sc(ws, rowIdx, 3,  +c.overall_score.toFixed(1),     cell(scoreColors(c.overall_score).bg, scoreColors(c.overall_score).txt, 'center', true));
    sc(ws, rowIdx, 4,  rec,                             cell(rcl.bg, rcl.txt, 'center', true));
    sc(ws, rowIdx, 5,  enrich.interviewPriority,        cell(rcl.bg, rcl.txt, 'left'));
    // Editable columns
    for (let col = 6; col <= 14; col++) {
      sc(ws, rowIdx, col, '', cell(editBg, C.textDark));
    }
  });

  ws['!autofilter'] = { ref: `A3:O3` };
  ws['!ref'] = `A1:O${3 + candidates.length}`;
  return ws;
}

// ═════════════════════════════════════════════════════════════════════════════
// Main entry point
// ═════════════════════════════════════════════════════════════════════════════

export async function exportCandidateReport(input: ExportInput): Promise<ExportResult> {
  const { filteredCandidates, allRankings, allHiddenGems, hasActiveFilters } = input;

  if (filteredCandidates.length === 0) {
    throw new Error('No candidates to export. Adjust filters and try again.');
  }

  const XLSXStyle = (await import('xlsx-js-style')).default as typeof import('xlsx-js-style');

  const timestamp        = nowStr();
  const reportCandidates = [...filteredCandidates].sort((a, b) => a.rank - b.rank);
  const allCandidates    = [...allRankings, ...allHiddenGems];
  const filteredCount    = reportCandidates.length;

  void hasActiveFilters;

  const ws1 = buildCoverPage(allCandidates, filteredCount, timestamp);
  const ws2 = buildExecutiveSummary(allCandidates, timestamp);
  const ws3 = buildRankedCandidates(reportCandidates);
  const ws4 = buildAnalyticsDashboard(allRankings, allHiddenGems);
  const ws5 = buildComparisonMatrix(allRankings, allHiddenGems);
  const ws6 = buildSkillIntelligence(allCandidates);
  const ws7 = buildRecruiterNotes(reportCandidates);

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws1 as import('xlsx-js-style').WorkSheet, 'Cover Page');
  XLSXStyle.utils.book_append_sheet(wb, ws2 as import('xlsx-js-style').WorkSheet, 'Executive Summary');
  XLSXStyle.utils.book_append_sheet(wb, ws3 as import('xlsx-js-style').WorkSheet, 'AI Ranked Candidates');
  XLSXStyle.utils.book_append_sheet(wb, ws4 as import('xlsx-js-style').WorkSheet, 'AI Analytics Dashboard');
  XLSXStyle.utils.book_append_sheet(wb, ws5 as import('xlsx-js-style').WorkSheet, 'Comparison Matrix');
  XLSXStyle.utils.book_append_sheet(wb, ws6 as import('xlsx-js-style').WorkSheet, 'Skill Intelligence');
  XLSXStyle.utils.book_append_sheet(wb, ws7 as import('xlsx-js-style').WorkSheet, 'Recruiter Notes');

  const filename = 'IntelliRank_AI_Executive_Hiring_Report.xlsx';
  XLSXStyle.writeFile(wb, filename);

  return { filename, count: reportCandidates.length };
}
