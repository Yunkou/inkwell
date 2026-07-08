#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { renderMermaidSVG } from 'beautiful-mermaid';

// ===== CLI Parsing =====
const inputPath = process.argv[2];
const outputPath = process.argv[3] || '/tmp/report.html';

if (!inputPath) {
  console.error('Usage: node generate-report.mjs <input-json-path> [output-html-path]');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(inputPath, 'utf-8'));
} catch (err) {
  console.error('Failed to read or parse input JSON:', err.message);
  process.exit(1);
}

// Validate required fields
const required = ['meta', 'conclusions', 'chapters'];
for (const field of required) {
  if (!data[field]) {
    console.error(`Missing required field: ${field}`);
    process.exit(1);
  }
}

console.log(`Loaded report: "${data.meta?.title || 'Untitled'}"`);
console.log(`Chapters: ${data.chapters.length}, Conclusions: ${data.conclusions.length}`);

// ===== Kami Theme =====
// NOTE: Must match CSS :root variables in buildHtml() below.
const KAMI_THEME = {
  bg: '#f5f4ed',
  fg: '#141413',
  line: '#504e49',
  accent: '#1B365D',
  muted: '#6b6a64',
  surface: '#faf9f5',
  border: '#e8e6dc',
};

// ===== Diagram Rendering =====
function sanitizeSvg(svg) {
  return svg
    .replace(/@import\s+(?:url\([^)]+\)|"[^"]*"|'[^']*')\s*;?/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
}

function renderDiagram(code) {
  try {
    const svg = renderMermaidSVG(code, { ...KAMI_THEME, transparent: true });
    return { success: true, svg: sanitizeSvg(svg) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Pre-render all diagrams
const diagramResults = new Map();

if (data.overview_diagram) {
  const result = renderDiagram(data.overview_diagram);
  diagramResults.set('overview', result);
  if (!result.success) {
    console.warn(`  ⚠ Diagram "overview" failed: ${result.error}`);
  }
}

for (let ci = 0; ci < data.chapters.length; ci++) {
  const chapter = data.chapters[ci];
  if (chapter.diagrams) {
    for (let di = 0; di < chapter.diagrams.length; di++) {
      const key = `ch${ci}-d${di}`;
      const result = renderDiagram(chapter.diagrams[di]);
      diagramResults.set(key, result);
      if (!result.success) {
        console.warn(`  ⚠ Diagram "${key}" failed: ${result.error}`);
      }
    }
  }
}

console.log(`Rendered ${diagramResults.size} diagrams`);

// ===== Utility Functions =====
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hasCJK(text) {
  return /[一-鿿㐀-䶿　-〿＀-￯가-힯぀-ゟ゠-ヿ]/.test(text || '');
}

function renderMarkdown(text) {
  return text
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('### ')) return `<h3>${escapeHtml(block.slice(4))}</h3>`;
      if (block.startsWith('## ')) return `<h2>${escapeHtml(block.slice(3))}</h2>`;
      if (block.startsWith('# ')) return `<h1>${escapeHtml(block.slice(2))}</h1>`;
      if (block.startsWith('- ')) {
        return '<ul>' + block.split('\n').map(line =>
          line.startsWith('- ') ? `<li>${renderInline(line.slice(2))}</li>` : ''
        ).join('') + '</ul>';
      }
      if (block.startsWith('> ')) {
        return `<blockquote class="bq">${escapeHtml(block.slice(2).replace(/\n> /g, '<br>'))}</blockquote>`;
      }
      if (block.startsWith('| ')) {
        return renderTable(block);
      }
      return `<p>${renderInline(block)}</p>`;
    })
    .join('\n');
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`(.+?)`/g, '<code class="ic">$1</code>');
  return html;
}

function renderTable(block) {
  const lines = block.split('\n').filter(l => l.startsWith('|'));
  if (lines.length < 2) return `<p>${escapeHtml(block)}</p>`;
  const parseRow = (l) => l.split('|').slice(1, -1).map(c => c.trim());
  const header = parseRow(lines[0]);
  const body = lines.slice(2);
  const isHeader = !lines[1] || lines[1].includes('---');
  let html = '<table class="data-table"><thead><tr>';
  for (const h of header) {
    html += `<th>${renderInline(h)}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (const row of body) {
    const cells = parseRow(row);
    html += '<tr>';
    for (const c of cells) {
      html += `<td>${renderInline(c)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

// ===== Section Builder Functions =====
function buildCover(meta) {
  const tagsHtml = meta.tags?.length
    ? `<div class="cover-tags">${meta.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';
  return `
<header class="cover">
  <div class="cover-eyebrow">Research Report</div>
  ${tagsHtml}
  <h1>${escapeHtml(meta.title || 'Report')}</h1>
  <p class="summary">${escapeHtml(meta.summary || '')}</p>
  <p class="meta">${escapeHtml(meta.date || '')}</p>
</header>`;
}

function buildConclusions(conclusions, overviewDiagram) {
  const items = conclusions.map(c => `
  <div class="conclusion-item">
    <div class="conclusion-num"></div>
    <div class="conclusion-body">
      <h3>${escapeHtml(c.point)}</h3>
      <p>${escapeHtml(c.detail || '')}</p>
    </div>
  </div>`).join('\n');

  const diagram = overviewDiagram
    ? (overviewDiagram.success
      ? `<div class="diagram-wrap">${overviewDiagram.svg}</div>`
      : `<div class="diagram-error">Diagram error: ${escapeHtml(overviewDiagram.error)}</div>`)
    : '';

  return `
<section>
  <div class="section-hed">
    <div class="section-eyebrow">Key Findings</div>
    <h2>核心结论</h2>
    <div class="rule"></div>
  </div>
  ${diagram}
  <div class="conclusions-grid">${items}</div>
</section>`;
}

function buildChapter(chapter, index, diagrams) {
  const diagramKeys = chapter.diagrams?.map((_, di) => `ch${index}-d${di}`) || [];
  const diagramHtmls = diagramKeys.map(key => {
    const result = diagrams.get(key);
    if (!result) return '';
    return result.success
      ? `<div class="diagram-wrap">${result.svg}</div>`
      : `<div class="diagram-error">Diagram error: ${escapeHtml(result.error)}</div>`;
  }).join('\n');

  const contentHtml = renderMarkdown(chapter.content || '');

  return `
<section>
  <div class="section-hed">
    <div class="section-eyebrow">Chapter ${String(index + 1).padStart(2, '0')}</div>
    <h2>${escapeHtml(chapter.title || `Chapter ${index + 1}`)}</h2>
    <div class="rule"></div>
  </div>
  <div class="chapter-lead">
    <strong>${escapeHtml(chapter.conclusion || '')}</strong>
  </div>
  ${diagramHtmls}
  <div class="chapter-content">${contentHtml}</div>
</section>`;
}

function buildActions(actions) {
  const priorityLabel = { high: 'P0 紧急', medium: 'P1 重要', low: 'P2 持续' };
  const rows = actions.map(a => `
  <tr>
    <td class="act-priority ${a.priority || 'medium'}">${priorityLabel[a.priority] || 'P1'}</td>
    <td class="act-body">
      <strong>${escapeHtml(a.action)}</strong>
      <p>${escapeHtml(a.detail || '')}</p>
    </td>
  </tr>`).join('\n');

  return `
<section>
  <div class="section-hed">
    <div class="section-eyebrow">Next Steps</div>
    <h2>行动建议</h2>
    <div class="rule"></div>
  </div>
  <table class="actions-table"><tbody>${rows}</tbody></table>
</section>`;
}

function buildSummary(meta, summaryPoints) {
  const points = (summaryPoints || []).slice(0, 5).map(p =>
    `<li>${escapeHtml(p)}</li>`
  ).join('\n');

  return `
<section class="summary-section">
  <div class="summary-card-fallback" id="summary-fallback">
    <h2>${escapeHtml(meta?.title || 'Report')}</h2>
    <p class="summary-date">${escapeHtml(meta?.date || '')}</p>
    <ul>${points}</ul>
  </div>
  <button id="btn-save-summary" class="btn-save">📋 打印 / 保存为 PDF</button>
</section>`;
}

// ===== HTML Template Builder =====
function buildHtml(reportData, diagrams) {
  const { meta, conclusions, chapters, actions } = reportData;

  const coverSection = buildCover(meta);
  const conclusionsSection = buildConclusions(conclusions, diagrams.get('overview'));
  const chaptersSections = chapters.map((ch, i) => buildChapter(ch, i, diagrams)).join('\n');
  const actionsSection = actions?.length ? buildActions(actions) : '';
  const summarySection = buildSummary(meta, reportData.summary_points || conclusions.map(c => c.point));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(meta.title || 'Report')}</title>
<style>
/* ===== KAMI DESIGN SYSTEM (inline) ===== */
/* NOTE: Must match KAMI_THEME constant above. */
:root {
  --parchment: #f5f4ed;
  --ivory: #faf9f5;
  --brand: #1B365D;
  --brand-light: #2D5A8A;
  --brand-tint: #EEF2F7;
  --near-black: #141413;
  --dark-warm: #3d3d3a;
  --olive: #504e49;
  --stone: #6b6a64;
  --border: #e8e6dc;
  --border-soft: #e5e3d8;
  --warm-sand: #e8e6dc;
  --serif: Charter, Georgia, Palatino, "Times New Roman", "TsangerJinKai02", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif;
  --sans: -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Helvetica, Arial, sans-serif;
  --mono: "JetBrains Mono", "SF Mono", "Fira Code", Consolas, Monaco, "TsangerJinKai02", monospace;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--parchment);
  color: var(--near-black);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  max-width: 880px;
  margin: 0 auto;
  padding: 72px 48px 120px;
}

/* ---- TYPOGRAPHY ---- */
h1 { font-size: 36px; font-weight: 500; line-height: 1.15; margin: 0; letter-spacing: -0.01em; }
h2 { font-size: 24px; font-weight: 500; line-height: 1.2; margin: 0; }
h3 { font-size: 18px; font-weight: 500; line-height: 1.3; margin: 0 0 8px; color: var(--near-black); }
h4 { font-size: 16px; font-weight: 500; line-height: 1.4; margin: 0; color: var(--dark-warm); }
p  { margin: 8px 0; color: var(--dark-warm); line-height: 1.55; }
strong { font-weight: 500; color: var(--near-black); }
a { color: var(--brand); text-decoration: none; }
a:hover { text-decoration: underline; }

code.ic {
  font-family: var(--mono);
  background: var(--brand-tint);
  color: var(--brand);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.9em;
}
blockquote.bq {
  border-left: 2px solid var(--brand);
  padding: 4px 0 4px 14px;
  color: var(--olive);
  margin: 12px 0;
  font-style: normal;
}

/* ---- COVER ---- */
.cover {
  padding: 60px 0 48px;
  margin-bottom: 56px;
  border-bottom: 0.5px solid var(--border);
}
.cover-eyebrow {
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--stone);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.cover-eyebrow::before {
  content: "";
  display: inline-block;
  width: 8px; height: 1.5px;
  background: var(--brand);
  flex-shrink: 0;
}
.cover-tags { margin-bottom: 28px; }
.cover-tags .tag {
  display: inline-block;
  background: var(--brand-tint);
  color: var(--brand);
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 3px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  margin: 0 6px 6px 0;
}
.cover h1 {
  font-size: 44px;
  font-weight: 500;
  line-height: 1.10;
  margin: 0 0 20px;
  text-wrap: balance;
}
.cover .summary {
  font-size: 18px;
  color: var(--olive);
  max-width: 600px;
  line-height: 1.5;
  margin: 0 0 28px;
}
.cover .meta {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--stone);
  letter-spacing: 0.5px;
}

/* ---- SECTIONS ---- */
section { margin: 56px 0; }
.section-hed { margin-bottom: 24px; }
.section-eyebrow {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  color: var(--stone);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.section-hed h2 {
  font-size: 26px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--near-black);
}
.section-hed .rule {
  height: 0.5px;
  background: var(--border);
  margin-top: 16px;
}

/* ---- CONCLUSIONS ---- */
.conclusions-grid { counter-reset: conclusion; margin: 28px 0; }
.conclusion-item {
  counter-increment: conclusion;
  display: flex;
  gap: 20px;
  padding: 20px 0;
  border-bottom: 0.5px solid var(--border-soft);
}
.conclusion-item:last-child { border-bottom: none; }
.conclusion-num {
  font-family: var(--serif);
  font-size: 32px;
  font-weight: 500;
  color: var(--brand);
  line-height: 1;
  min-width: 36px;
  flex-shrink: 0;
}
.conclusion-num::before { content: "0" counter(conclusion); }
.conclusion-body h3 { margin: 0 0 6px; font-size: 18px; }
.conclusion-body p  { margin: 0; font-size: 15px; color: var(--olive); line-height: 1.55; }

/* ---- CHAPTER ---- */
.chapter-lead {
  font-size: 17px;
  color: var(--dark-warm);
  line-height: 1.55;
  margin-bottom: 20px;
  padding: 18px 22px;
  background: var(--ivory);
  border-radius: 6px;
}
.chapter-lead strong { color: var(--brand); }
.chapter-content { margin: 20px 0; }
.chapter-content h3 { margin: 28px 0 10px; font-size: 18px; }
.chapter-content h4 { margin: 20px 0 8px; font-size: 15px; color: var(--olive); }
.chapter-content ul, .chapter-content ol { margin: 8px 0; padding-left: 20px; }
.chapter-content li { margin: 4px 0; color: var(--dark-warm); line-height: 1.55; }
.chapter-content li strong { color: var(--near-black); }

/* ---- DIAGRAMS ---- */
.diagram-wrap {
  margin: 28px 0;
  padding: 24px;
  background: var(--ivory);
  border-radius: 6px;
  overflow-x: auto;
}
.diagram-wrap svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
.diagram-error {
  padding: 14px 18px;
  background: #f0e0d8;
  border-radius: 4px;
  color: #8b4513;
  font-family: var(--sans);
  font-size: 13px;
  margin: 16px 0;
}

/* ---- TABLES ---- */
table.data-table {
  width: 100%; border-collapse: collapse;
  font-size: 14px; margin: 20px 0;
}
table.data-table th {
  text-align: left; font-weight: 500; color: var(--stone);
  font-family: var(--sans); font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 10px; border-bottom: 0.5px solid var(--border);
}
table.data-table td {
  padding: 8px 10px; border-bottom: 0.3px solid var(--border-soft);
  vertical-align: top; color: var(--dark-warm);
}

/* ---- ACTIONS ---- */
.actions-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
.actions-table td {
  padding: 14px 0;
  border-bottom: 0.5px solid var(--border-soft);
  vertical-align: top;
}
.actions-table tr:last-child td { border-bottom: none; }
.actions-table .act-priority {
  width: 70px;
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  padding-right: 16px;
  white-space: nowrap;
}
.act-priority.high { color: var(--brand); }
.act-priority.medium { color: var(--olive); }
.act-priority.low { color: var(--stone); }
.actions-table .act-body strong { display: block; margin-bottom: 2px; font-size: 15px; }
.actions-table .act-body p { margin: 2px 0 0; font-size: 14px; color: var(--olive); }

/* ---- SUMMARY CARD ---- */
.summary-section {
  margin: 72px 0 40px;
  padding-top: 48px;
  border-top: 0.5px solid var(--border);
}
.summary-card-fallback {
  background: var(--ivory);
  border-radius: 8px;
  padding: 48px 44px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  text-align: center;
}
.summary-card-fallback h2 {
  font-size: 28px; font-weight: 500; margin-bottom: 8px;
}
.summary-card-fallback .summary-date {
  font-family: var(--sans);
  font-size: 13px; color: var(--stone);
  margin-bottom: 32px;
}
.summary-card-fallback ul {
  list-style: none; padding: 0; text-align: left;
  max-width: 560px; margin: 0 auto;
}
.summary-card-fallback li {
  position: relative;
  padding: 12px 0 12px 24px;
  border-bottom: 0.3px solid var(--border-soft);
  font-size: 17px;
  color: var(--dark-warm);
  line-height: 1.45;
}
.summary-card-fallback li:last-child { border-bottom: none; }
.summary-card-fallback li::before {
  content: "";
  position: absolute;
  left: 0; top: 22px;
  width: 8px; height: 1.5px;
  background: var(--brand);
}
.btn-save {
  display: inline-block;
  margin-top: 24px;
  background: var(--brand);
  color: var(--ivory);
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--brand);
  transition: all 0.15s;
}
.btn-save:hover {
  background: var(--brand-light);
  transform: translateY(-1px);
}

/* ---- RESPONSIVE ---- */
@media (max-width: 640px) {
  body { padding: 40px 20px 80px; font-size: 15px; }
  .cover { padding: 32px 0 36px; margin-bottom: 36px; }
  .cover h1 { font-size: 32px; }
  .section-hed h2 { font-size: 22px; }
  .conclusion-item { flex-direction: column; gap: 8px; }
}
</style>
</head>
<body>

${coverSection}
${conclusionsSection}
${chaptersSections}
${actionsSection}
${summarySection}

<script>
document.getElementById('btn-save-summary')?.addEventListener('click', function() {
  window.print();
});
</script>

</body>
</html>`;
}

// ===== Summary Card Generation (takumi with CJK font support) =====
async function findCJKFont() {
  const { existsSync, readFileSync } = await import('node:fs');
  // Search system CJK font paths (macOS, Linux, Windows)
  const candidates = [
    { path: '/System/Library/Fonts/Supplemental/Songti.ttc', name: 'Songti SC' },
    { path: '/System/Library/Fonts/Supplemental/Arial Unicode.ttf', name: 'Arial Unicode MS' },
    { path: '/Library/Fonts/Arial Unicode.ttf', name: 'Arial Unicode MS' },
    { path: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', name: 'Noto Sans CJK SC' },
    { path: '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', name: 'Noto Sans CJK SC' },
    { path: '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc', name: 'Noto Sans CJK SC' },
    { path: 'C:\\Windows\\Fonts\\msyh.ttc', name: 'Microsoft YaHei' },
    { path: 'C:\\Windows\\Fonts\\simsun.ttc', name: 'SimSun' },
  ];
  for (const c of candidates) {
    if (existsSync(c.path)) {
      try {
        return { name: c.name, data: readFileSync(c.path) };
      } catch (_) { /* continue */ }
    }
  }
  return null;
}

let summaryPngBase64 = null;

try {
  const cjkFont = await findCJKFont();
  if (cjkFont) {
    const core = await import('@takumi-rs/core');
    const htmlHelper = await import('takumi-js/helpers/html');

    const needsCJK = hasCJK(JSON.stringify(data));
    const fonts = [
      { name: 'Charter', data: cjkFont.data, weight: 400 },
      { name: 'Charter', data: cjkFont.data, weight: 700 },
    ];
    if (needsCJK) {
      fonts.push(
        { name: cjkFont.name, data: cjkFont.data, weight: 400 },
        { name: cjkFont.name, data: cjkFont.data, weight: 700 },
        { name: 'Songti SC', data: cjkFont.data, weight: 400 },
        { name: 'Songti SC', data: cjkFont.data, weight: 700 },
      );
    }

    const renderer = new core.Renderer({
      fonts,
      loadDefaultFonts: true,
    });

    const titleFont = needsCJK
      ? `font-family:${cjkFont.name},'Songti SC',serif`
      : `font-family:Charter,Georgia,serif`;
    const bodyFont = needsCJK
      ? `font-family:${cjkFont.name},'PingFang SC',-apple-system,sans-serif`
      : `font-family:Charter,Georgia,serif`;

    const pointsHtml = (data.summary_points || data.conclusions.map(c => c.point))
      .slice(0, 5)
      .map((p, i) => `<li style="${bodyFont};font-size:22px;color:#3d3d3a;margin-bottom:14px;line-height:1.5;padding-left:10px;border-left:3px solid #1B365D;">${escapeHtml(p)}</li>`)
      .join('');

    const cardHtml = `<div style="width:1200px;height:630px;background:#f5f4ed;display:flex;flex-direction:column;justify-content:center;padding:80px 100px;box-sizing:border-box;">
      <div style="font-size:14px;color:#6b6a64;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;font-family:-apple-system,sans-serif;">Report Summary</div>
      <h1 style="${titleFont};font-size:42px;font-weight:700;color:#141413;margin:0 0 40px 0;line-height:1.2;">${escapeHtml(data.meta?.title || 'Report')}</h1>
      <ul style="list-style:none;padding:0;margin:0;">${pointsHtml}</ul>
      <div style="margin-top:40px;font-size:14px;color:#6b6a64;font-family:-apple-system,sans-serif;">${escapeHtml(data.meta?.date || '')}</div>
    </div>`;

    const parsed = htmlHelper.fromHtml(cardHtml);
    const image = await renderer.render(parsed.node, { width: 1200, height: 630 });
    summaryPngBase64 = `data:image/png;base64,${image.toString('base64')}`;
    console.log(`Summary card PNG generated successfully (CJK: ${needsCJK ? 'yes' : 'no'}, font: ${cjkFont.name})`);
  }
} catch (err) {
  console.warn('takumi summary card failed (non-fatal):', err.message);
}

// Build final HTML
console.log('Assembling HTML report...');
let html = buildHtml(data, diagramResults);
if (summaryPngBase64) {
  // Inject PNG image into summary section, hide fallback
  html = html.replace(
    '<div class="summary-card-fallback"',
    `<div class="summary-card" style="margin-bottom:16px;"><img id="summary-img" src="${summaryPngBase64}" alt="Report Summary" style="max-width:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.04);" /></div>\n<div class="summary-card-fallback" style="display:none;"`,
  );
}
writeFileSync(outputPath, html, 'utf-8');
console.log(`Report written to: ${outputPath}`);
console.log(`Size: ${(html.length / 1024).toFixed(1)} KB`);
