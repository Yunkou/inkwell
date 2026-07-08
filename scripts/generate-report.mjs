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
  // Remove external @import rules (e.g. Google Fonts) from SVG <style> tags
  // to keep the output fully self-contained.
  // Also strips <script> tags, on* event handlers, and javascript: URLs.
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

function renderMarkdown(text) {
  // Minimal markdown rendering
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
          line.startsWith('- ') ? `<li>${escapeHtml(line.slice(2))}</li>` : ''
        ).join('') + '</ul>';
      }
      if (block.startsWith('> ')) {
        return `<blockquote style="border-left:2px solid var(--brand);padding:4px 0 4px 14px;color:var(--olive);margin:12px 0;">${escapeHtml(block.slice(2).replace(/\n> /g, '<br>'))}</blockquote>`;
      }
      // Inline formatting
      let html = escapeHtml(block);
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/`(.+?)`/g, '<code style="font-family:var(--mono);background:var(--ivory);padding:1px 4px;border-radius:3px;font-size:0.9em;">$1</code>');
      return `<p>${html}</p>`;
    })
    .join('\n');
}

// ===== Section Builder Functions =====
function buildCover(meta) {
  const tags = meta.tags?.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') || '';
  return `
<header class="cover">
  ${tags ? `<div style="margin-bottom:24px">${tags}</div>` : ''}
  <h1>${escapeHtml(meta.title || 'Report')}</h1>
  <p class="summary">${escapeHtml(meta.summary || '')}</p>
  <p class="meta">${escapeHtml(meta.date || '')}</p>
</header>`;
}

function buildConclusions(conclusions, overviewDiagram) {
  const items = conclusions.map(c => `
  <div class="conclusion-item">
    <h3>${escapeHtml(c.point)}</h3>
    <p>${escapeHtml(c.detail || '')}</p>
  </div>`).join('\n');

  const diagram = overviewDiagram
    ? (overviewDiagram.success
      ? `<div class="diagram-wrap">${overviewDiagram.svg}</div>`
      : `<div class="diagram-error">Diagram error: ${escapeHtml(overviewDiagram.error)}</div>`)
    : '';

  return `
<section>
  <h2 class="section-title section-title-h1">核心结论</h2>
  ${diagram}
  ${items}
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

  // Simple markdown-to-HTML for content
  const contentHtml = renderMarkdown(chapter.content || '');

  return `
<section>
  <h2 class="section-title">${escapeHtml(chapter.title || `Chapter ${index + 1}`)}</h2>
  <div class="card">
    <p><strong>${escapeHtml(chapter.conclusion || '')}</strong></p>
  </div>
  ${diagramHtmls}
  <div class="chapter-content">${contentHtml}</div>
</section>`;
}

function buildActions(actions) {
  const rows = actions.map(a => `
  <div class="action-row">
    <span class="action-priority ${a.priority || 'medium'}">${escapeHtml(a.priority || 'medium')}</span>
    <div>
      <strong>${escapeHtml(a.action)}</strong>
      <p>${escapeHtml(a.detail || '')}</p>
    </div>
  </div>`).join('\n');

  return `
<section>
  <h2 class="section-title">行动建议</h2>
  ${rows}
</section>`;
}

function buildSummary(summaryPng, meta, summaryPoints) {
  if (summaryPng) {
    return `
<section class="summary-section">
  <h2 class="section-title" style="text-align:center;border-left:none;">报告总结</h2>
  <div class="summary-card">
    <img id="summary-img" src="${summaryPng}" alt="Report Summary" />
  </div>
  <button id="btn-save-summary" class="btn-save">💾 保存总结图</button>
</section>`;
  }

  // Fallback: render summary card as HTML
  const points = (summaryPoints || []).slice(0, 5).map(p =>
    `<li>${escapeHtml(p)}</li>`
  ).join('\n');

  return `
<section class="summary-section">
  <h2 class="section-title" style="text-align:center;border-left:none;">报告总结</h2>
  <div id="summary-fallback" class="summary-card-fallback">
    <h2>${escapeHtml(meta?.title || 'Report')}</h2>
    <ul>${points}</ul>
    <p style="margin-top:20px;color:var(--stone);font-family:var(--sans);font-size:13px;">${escapeHtml(meta?.date || '')}</p>
  </div>
  <button id="btn-save-summary" class="btn-save">📋 打印 / 保存为 PDF</button>
</section>`;
}

// ===== HTML Template Builder =====
function buildHtml(reportData, diagrams, summaryPng) {
  const { meta, conclusions, chapters, actions } = reportData;

  const coverSection = buildCover(meta);
  const conclusionsSection = buildConclusions(conclusions, diagrams.get('overview'));
  const chaptersSections = chapters.map((ch, i) => buildChapter(ch, i, diagrams)).join('\n');
  const actionsSection = actions?.length ? buildActions(actions) : '';
  const summarySection = buildSummary(summaryPng, meta, reportData.summary_points || conclusions.map(c => c.point));

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
  --near-black: #141413;
  --dark-warm: #3d3d3a;
  --olive: #504e49;
  --stone: #6b6a64;
  --border: #e8e6dc;
  --border-soft: #e5e3d8;
  --warm-sand: #e8e6dc;
  --serif: Charter, Georgia, Palatino, "Times New Roman", "TsangerJinKai02", "Source Han Serif SC", serif;
  --sans: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  --mono: "JetBrains Mono", "SF Mono", "Fira Code", Consolas, Monaco, monospace;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--parchment);
  color: var(--near-black);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  max-width: 800px;
  margin: 0 auto;
  padding: 60px 40px 120px;
}
h1 { font-size: 28px; font-weight: 500; line-height: 1.2; margin: 32px 0 12px; }
h2 { font-size: 22px; font-weight: 500; line-height: 1.25; margin: 28px 0 10px; }
h3 { font-size: 18px; font-weight: 500; line-height: 1.3; margin: 24px 0 8px; }
p { margin: 8px 0; color: var(--dark-warm); }
strong { font-weight: 500; color: var(--near-black); }
a { color: var(--brand); }

.card {
  background: var(--ivory);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  padding: 20px 24px;
  margin: 16px 0;
}
.section-title {
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 500;
  color: var(--near-black);
  margin: 32px 0 14px;
  border-left: 3px solid var(--brand);
  border-radius: 1.5px;
  padding-left: 10px;
}
.section-title-h1 {
  font-size: 28px;
  margin: 48px 0 16px;
}
.tag {
  display: inline-block;
  background: #EEF2F7;
  color: var(--brand);
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 2px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  margin-right: 6px;
}
.diagram-wrap {
  margin: 24px 0;
  padding: 20px;
  background: var(--ivory);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
}
.diagram-wrap svg { max-width: 100%; height: auto; }
.diagram-error {
  padding: 16px;
  background: #f0e0d8;
  border-left: 3px solid #8b4513;
  border-radius: 4px;
  color: #8b4513;
  font-family: var(--sans);
  font-size: 13px;
}
.conclusion-item {
  padding: 16px 0 16px 16px;
  border-left: 3px solid var(--brand);
  margin: 12px 0;
}
.conclusion-item h3 { margin-top: 0; }
.action-row {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px 0;
  border-bottom: 0.5px solid var(--border-soft);
}
.action-priority {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 2px;
  white-space: nowrap;
  margin-top: 2px;
}
.action-priority.high { background: #1B365D; color: #faf9f5; }
.action-priority.medium { background: #EEF2F7; color: #1B365D; }
.action-priority.low { background: var(--warm-sand); color: var(--stone); }

/* ===== COVER ===== */
.cover {
  text-align: center;
  padding: 80px 0 60px;
  border-bottom: 0.5px solid var(--border);
  margin-bottom: 48px;
}
.cover h1 {
  font-size: 48px;
  font-weight: 500;
  line-height: 1.10;
  margin: 0 0 16px;
}
.cover .summary {
  font-size: 18px;
  color: var(--olive);
  max-width: 560px;
  margin: 0 auto 24px;
  line-height: 1.5;
}
.cover .meta {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--stone);
  letter-spacing: 0.5px;
}

/* ===== SUMMARY CARD ===== */
.summary-section {
  margin: 60px 0 40px;
  padding-top: 48px;
  border-top: 0.5px solid var(--border);
  text-align: center;
}
.summary-card {
  position: relative;
  display: inline-block;
  max-width: 100%;
}
.summary-card img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.05);
}
.summary-card-fallback {
  background: var(--parchment);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 48px 40px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.05);
}
.summary-card-fallback h2 {
  font-size: 28px; margin-bottom: 24px;
}
.summary-card-fallback ul {
  list-style: none; padding: 0; text-align: left;
}
.summary-card-fallback li {
  padding: 10px 0 10px 14px;
  border-left: 3px solid var(--brand);
  margin: 8px 0;
  font-size: 18px;
  color: var(--dark-warm);
}
.btn-save {
  display: inline-block;
  margin-top: 16px;
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

/* ===== RESPONSIVE ===== */
@media (max-width: 640px) {
  body { padding: 32px 20px 80px; }
  .cover h1 { font-size: 32px; }
  .cover { padding: 40px 0 40px; }
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
// Save summary card as PNG using Canvas API
document.getElementById('btn-save-summary')?.addEventListener('click', function() {
  const img = document.getElementById('summary-img');
  const fallback = document.getElementById('summary-fallback');
  const target = (img && img.complete && img.naturalWidth > 0) ? img : fallback;
  if (!target) return;

  if (target.tagName === 'IMG') {
    // Download the PNG directly
    const a = document.createElement('a');
    a.href = target.src;
    a.download = 'report-summary.png';
    a.click();
  } else {
    // Fallback: use html2canvas approach — open print dialog as workaround
    window.print();
  }
});
</script>

</body>
</html>`;
}

// ===== Summary Card Generation (with graceful fallback) =====
let summaryPngBase64 = null;

async function generateSummaryCard(reportData) {
  try {
    const { render } = await import('takumi-js');

    // NOTE: Color values below must match KAMI_THEME and CSS :root variables.
    const pointsHtml = (reportData.summary_points || reportData.conclusions.map(c => c.point))
      .slice(0, 5)
      .map((p, i) => `<li style="font-family:Charter,Georgia,serif;font-size:22px;color:#3d3d3a;margin-bottom:12px;line-height:1.4;padding-left:8px;border-left:3px solid #1B365D;">${escapeHtml(p)}</li>`)
      .join('');

    const html = `<div style="width:1200px;height:630px;background:#f5f4ed;display:flex;flex-direction:column;justify-content:center;padding:80px 100px;font-family:Charter,Georgia,serif;box-sizing:border-box;">
      <div style="font-size:14px;color:#6b6a64;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;font-family:-apple-system,sans-serif;">Report Summary</div>
      <h1 style="font-size:42px;font-weight:500;color:#141413;margin:0 0 40px 0;line-height:1.15;">${escapeHtml(reportData.meta?.title || 'Report')}</h1>
      <ul style="list-style:none;padding:0;margin:0;">${pointsHtml}</ul>
      <div style="margin-top:40px;font-size:14px;color:#6b6a64;font-family:-apple-system,sans-serif;">${escapeHtml(reportData.meta?.date || '')}</div>
    </div>`;

    const image = await render(html, { width: 1200, height: 630 });
    return `data:image/png;base64,${image.toString('base64')}`;
  } catch (err) {
    console.warn('takumi summary card failed (non-fatal):', err.message);
    console.warn('Summary card will render as HTML fallback in the report.');
    return null;
  }
}

// ===== Main Execution =====
// Generate summary card (async)
summaryPngBase64 = await generateSummaryCard(data);
if (summaryPngBase64) {
  console.log('Summary card PNG generated successfully');
}

// Build and write the HTML
console.log('Assembling HTML report...');
const html = buildHtml(data, diagramResults, summaryPngBase64);

writeFileSync(outputPath, html, 'utf-8');
console.log(`Report written to: ${outputPath}`);
console.log(`Size: ${(html.length / 1024).toFixed(1)} KB`);
