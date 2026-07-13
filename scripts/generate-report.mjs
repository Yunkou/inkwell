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

// ===== Editorial Diagram Theme (Tokyo Night Light inspired) =====
// Inspired by tokyo-night-light but tuned for our warm-parchment editorial palette.
// We pass `bg` explicitly (instead of transparent) so the internal color-mix()
// derivatives (subgraph tints, node fills, faint lines) compute against the
// ivory surface we actually render on.
const EDITORIAL_THEME = {
  bg: '#faf9f5',           // ivory — matches .diagram-wrap surface
  fg: '#2e3a5f',           // deep ink-blue for node text and labels
  line: '#1B365D',         // brand ink-blue for edges, strokes, arrows
  accent: '#1B365D',       // brand ink-blue for accent strokes / node borders
  muted: '#7a7a72',        // warm stone — blends with parchment, never cool gray
  // surface, border not used by renderMermaidSVG; kept for CSS :root parity
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

// Wrap an SVG string in a data: URL inside an <img>. This forces the
// browser's image-rendering path, which is more consistent for SVG text
// (dominant-baseline, text-anchor) across Safari/Chrome/WeChat and at
// different viewport widths — inline <svg> tends to drift on narrow
// viewports because the same SVG is re-laid-out with the surrounding
// flex/block context, which can shift text by a few pixels relative
// to the underlying <path>/<polyline> geometry. See SKILL.md → Diagrams.
function svgToImgTag(svg) {
  let b64;
  try {
    b64 = Buffer.from(svg, 'utf-8').toString('base64');
  } catch (_) {
    b64 = btoa(unescape(encodeURIComponent(svg)));
  }
  return `<img class="diagram-svg" src="data:image/svg+xml;base64,${b64}" alt="Diagram" />`;
}

function renderDiagram(code) {
  try {
    const svg = renderMermaidSVG(code, { ...EDITORIAL_THEME, transparent: false });
    return { success: true, svg: sanitizeSvg(svg) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Detect xychart blocks whose source contains constructs that beautiful-mermaid
// silently ignores. Catching these at render time gives the user immediate,
// actionable feedback (without this, the chart renders with axes+grid but no
// data, which is the most common "why is my line missing?" complaint).
function lintXychartSource(code, label) {
  if (!/^\s*xychart(-beta)?\b/im.test(code)) return;
  const lines = code.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // `line "label" [...]` / `bar "label" [...]`  — parser only matches `line\s+\[`
    if (/^\s*(line|bar)\s+["\'][^"\']*["\']\s*\[/i.test(line)) {
      console.warn(`  ⚠ ${label}: line ${i+1} has a quoted label before the data array, which beautiful-mermaid ignores:`);
      console.warn(`      ${line.trim()}`);
      console.warn(`      Fix: drop the quoted label — hover tooltips are auto-generated. See references/diagrams.md §3.2.`);
    }
    // `rect` keyword — not supported in beautiful-mermaid
    if (/^\s*rect\b/i.test(line)) {
      console.warn(`  ⚠ ${label}: line ${i+1} uses \`rect\`, which is not a supported keyword in beautiful-mermaid:`);
      console.warn(`      ${line.trim()}`);
      console.warn(`      Fix: use a second \`line\` with constant values, or split into multiple charts. See references/diagrams.md §3.2.`);
    }
  }
}

// Pre-render all diagrams
const diagramResults = new Map();

if (data.overview_diagram) {
  lintXychartSource(data.overview_diagram, 'overview diagram');
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
      lintXychartSource(chapter.diagrams[di], `chapter ${ci+1} diagram ${di+1}`);
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
// ===== Bundled Font (LXGW WenKai, ships in fonts/) =====
async function loadBundledFont() {
  const { existsSync, readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const fontPath = resolve(here, '..', 'fonts', 'LXGWWenKai-Regular.woff2');
  if (!existsSync(fontPath)) return null;
  try {
    return { name: 'LXGW WenKai', path: fontPath, data: readFileSync(fontPath) };
  } catch (_) { return null; }
}

async function subsetBundledFont(bundled, text) {
  if (!bundled) return null;
  try {
    const { default: subsetFont } = await import('subset-font');
    const chars = new Set();
    for (const c of text) chars.add(c);
    for (const c of '.,;:!?·…—-()[]{}/\\\'\"`~@#$%^&*+=<>|《》「」『』【】〖〗' + '0123456789') chars.add(c);
    for (const c of '的一是不了人我在有这个们中大为和国地到以说时要就出会也你对生能而子那') chars.add(c);
    const subsetBuf = await subsetFont(bundled.data, [...chars].join(''), { targetFormat: 'woff2' });
    return { name: bundled.name, data: Buffer.from(subsetBuf), sizeKB: subsetBuf.length / 1024 };
  } catch (e) {
    console.warn('  Subset font failed, using full bundled font:', e.message);
    return { name: bundled.name, data: bundled.data, sizeKB: bundled.data.length / 1024 };
  }
}


function renderCodeBlock(lang, body) {
  // Preserve indentation visually by escaping HTML and relying on <pre><code>'s
  // default whitespace handling. The body is the raw text between the fences.
  const languageLabel = lang
    ? `<span class="cb-lang">${escapeHtml(lang)}</span>`
    : '';
  return `<div class="code-block">${languageLabel}<pre><code${lang ? ` class="lang-${escapeHtml(lang)}"` : ''}>${escapeHtml(body)}</code></pre></div>`;
}

function renderMarkdown(text) {
  // Strip fenced code blocks (```lang?\n...\n```) BEFORE splitting on blank
  // lines — fenced blocks frequently contain blank lines that would otherwise
  // fragment them. Stashed placeholders are restored below.
  const placeholders = [];
  const stripped = text.replace(/```([\w+-]*)\n([\s\S]*?)\n```/g, (_m, lang, body) => {
    const idx = placeholders.length;
    placeholders.push({ lang, body });
    return `\u0000CODEBLOCK_${idx}\u0000`;
  });

  return stripped
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      // Restore code-block placeholder.
      const ph = block.match(/^\u0000CODEBLOCK_(\d+)\u0000$/);
      if (ph) {
        const { lang, body } = placeholders[+ph[1]];
        return renderCodeBlock(lang, body);
      }
      if (block.startsWith('### ')) return `<h3>${escapeHtml(block.slice(4))}</h3>`;
      if (block.startsWith('## ')) return `<h3>${escapeHtml(block.slice(3))}</h3>`;
      if (block.startsWith('# ')) return `<h4>${escapeHtml(block.slice(2))}</h4>`;
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
  const dateStr = escapeHtml(meta.date || '');
  const authorStr = escapeHtml(meta.author || '');
  const sourceStr = escapeHtml(meta.source || '');
  const metaBits = [
    dateStr && `<span><b>${dateStr}</b></span>`,
    authorStr && `<span class="sep">·</span><span>by <b>${authorStr}</b></span>`,
    sourceStr && `<span class="sep">·</span><span><b>${sourceStr}</b></span>`,
  ].filter(Boolean).join('');
  return `
<header class="cover">
  <div class="eyebrow"><span class="dot"></span><span>Research Report</span></div>
  <h1>${escapeHtml(meta.title || 'Report')}</h1>
  <p class="tagline">${escapeHtml(meta.summary || '')}</p>
  ${metaBits ? `<div class="cover-meta">${metaBits}</div>` : ''}
  ${tagsHtml}
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
      ? `<div class="diagram-wrap">${svgToImgTag(overviewDiagram.svg)}</div>`
      : `<div class="diagram-error">Diagram error: ${escapeHtml(overviewDiagram.error)}</div>`)
    : '';

  return `
<section>
  <div class="section-head">
    <p class="section-num">01 · Key Findings</p>
    <h2 class="section-title">核心结论</h2>
    <div class="rule"></div>
  </div>
  ${diagram}
  <div class="conclusions-grid">${items}</div>
</section>`;
}

function buildChapter(chapter, index, diagrams, totalChapters) {
  const diagramKeys = chapter.diagrams?.map((_, di) => `ch${index}-d${di}`) || [];
  const diagramHtmls = diagramKeys.map(key => {
    const result = diagrams.get(key);
    if (!result) return '';
    return result.success
      ? `<div class="diagram-wrap">${svgToImgTag(result.svg)}</div>`
      : `<div class="diagram-error">Diagram error: ${escapeHtml(result.error)}</div>`;
  }).join('\n');

  const contentHtml = renderMarkdown(chapter.content || '');
  const num = String(index + 1).padStart(2, '0');
  const labelMap = ['Context', 'Analysis', 'Findings', 'Synthesis', 'Outlook', 'Case Study', 'Deep Dive'];
  const label = labelMap[index] || 'Chapter';

  return `
<section>
  <div class="section-head">
    <p class="section-num">${num} · ${label}</p>
    <h2 class="section-title">${escapeHtml(chapter.title || `Chapter ${index + 1}`)}</h2>
    <div class="rule"></div>
  </div>
  ${chapter.conclusion ? `<div class="chapter-lead"><span class="thesis-label">Thesis</span>${escapeHtml(chapter.conclusion)}</div>` : ''}
  ${diagramHtmls}
  <div class="chapter-content">${contentHtml}</div>
</section>`;
}

function buildActions(actions, sectionNum) {
  const priorityLabel = { high: 'P0 · Urgent', medium: 'P1 · Important', low: 'P2 · Ongoing' };
  const rows = actions.map(a => `
  <tr>
    <td class="act-priority ${a.priority || 'medium'}">${priorityLabel[a.priority] || 'P1'}</td>
    <td class="act-body">
      <strong>${escapeHtml(a.action)}</strong>
      <p>${escapeHtml(a.detail || '')}</p>
    </td>
  </tr>`).join('\n');

  const num = String(sectionNum).padStart(2, '0');
  return `
<section>
  <div class="section-head">
    <p class="section-num">${num} · Next Steps</p>
    <h2 class="section-title">行动建议</h2>
    <div class="rule"></div>
  </div>
  <table class="actions-table"><tbody>${rows}</tbody></table>
</section>`;
}

function buildSummary(meta, summaryPoints, sectionNum) {
  const num = String(sectionNum).padStart(2, '0');
  const points = (summaryPoints || []).slice(0, 5).map(p =>
    `<li>${escapeHtml(p)}</li>`
  ).join('\n');

  return `
<section class="summary-section">
  <div class="section-head">
    <p class="section-num">${num} · Summary Card</p>
    <h2 class="section-title">结论摘要</h2>
    <div class="rule"></div>
  </div>
  <div class="summary-card-fallback" id="summary-fallback">
    <p class="sc-eyebrow">Report Summary</p>
    <h2>${escapeHtml(meta?.title || 'Report')}</h2>
    <p class="summary-date">${escapeHtml(meta?.date || '')}</p>
    <ul>${points}</ul>
    <div class="sc-foot"><span>Editorial Report</span><span>${escapeHtml(meta?.date || '')}</span></div>
  </div>
</section>`;
}

// ===== HTML Template Builder =====
function buildHtml(reportData, diagrams) {
  const { meta, conclusions, chapters, actions } = reportData;

  // Section numbers: 01 = conclusions, 02..N = chapters, N+1 = actions, N+2 = summary
  const hasActions = actions && actions.length > 0;
  const chapterStart = 2;
  const actionsNum = chapterStart + chapters.length;
  const summaryNum = actionsNum + (hasActions ? 1 : 0);

  const coverSection = buildCover(meta);
  const conclusionsSection = buildConclusions(conclusions, diagrams.get('overview'));
  const chaptersSections = chapters.map((ch, i) => buildChapter(ch, i, diagrams, chapters.length)).join('\n');
  const actionsSection = hasActions ? buildActions(actions, actionsNum) : '';
  const summarySection = buildSummary(
    meta,
    reportData.summary_points || conclusions.map(c => c.point),
    summaryNum
  );

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(meta.title || 'Report')}</title>
<style>
/* ===== EDITORIAL DESIGN SYSTEM (inline) ===== */
/* NOTE: Must match EDITORIAL_THEME constant above. */
\${FONT_FACE_CSS}
:root {
  --parchment: #f5f4ed;
  --ivory: #faf9f5;
  --warm-sand: #e8e6dc;
  --brand: #1B365D;
  --brand-light: #2D5A8A;
  --brand-tint: #EEF2F7;
  --brand-tint-2: #E4ECF5;
  --brand-tint-3: #D6E1EE;
  --near-black: #141413;
  --dark-warm: #3d3d3a;
  --olive: #504e49;
  --stone: #6b6a64;
  --border: #e8e6dc;
  --border-soft: #e5e3d8;
  --ring: #e0ddd0;
  --serif: "LXGW WenKai", Charter, Georgia, Palatino, "Times New Roman", "TsangerJinKai02", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif;
  --sans: -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Helvetica, Arial, sans-serif;
  --mono: "JetBrains Mono", "SF Mono", "Fira Code", Consolas, Monaco, "TsangerJinKai02", monospace;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

html, body { background: var(--parchment); }
body {
  color: var(--near-black);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.55;
  letter-spacing: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-variant-numeric: tabular-nums;
}
html[lang="zh-CN"] body { letter-spacing: 0.35px; }
html[lang="zh-CN"] .section-title,
html[lang="zh-CN"] .lede,
html[lang="zh-CN"] .cover h1 { letter-spacing: 0; }
html[lang="en"] .section-title { letter-spacing: -0.3px; }
html[lang="en"] .cover h1 { letter-spacing: -0.5px; }

.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 88px 64px 120px;
  animation: page-fade-in 0.4s ease-out;
}
@media (max-width: 768px) {
  .page { padding: 48px 20px 64px; }
}

/* ---- TYPE SCALE ---- */
.cover h1 {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 64px;
  line-height: 1.05;
  color: var(--near-black);
  margin: 0 0 16px;
  text-wrap: balance;
}
.section-title {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 32px;
  line-height: 1.2;
  color: var(--near-black);
  margin: 0;
}
.section-num {
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--brand);
  margin: 0 0 6px;
}
.lede {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 16px;
  line-height: 1.55;
  color: var(--olive);
  margin: 14px 0 0;
}
h3 { font-size: 18px; font-weight: 500; line-height: 1.3; color: var(--near-black); margin: 0; }
h4 { font-size: 15px; font-weight: 500; line-height: 1.4; color: var(--olive); margin: 0; }
p  { color: var(--dark-warm); line-height: 1.55; }
strong { font-weight: 500; color: var(--near-black); }
a { color: var(--brand); text-decoration: none; transition: color .15s; }
a:hover { text-decoration: underline; text-underline-offset: 3px; }

code.ic {
  font-family: var(--mono);
  background: var(--brand-tint);
  color: var(--brand);
  padding: 1px 5px;
  border-radius: 2px;
  font-size: 0.85em;
}
blockquote.bq {
  border-left: 2px solid var(--brand);
  padding: 4px 0 4px 14px;
  color: var(--olive);
  margin: 12px 0;
  font-style: normal;
}

/* ---- CODE BLOCKS ---- */
.code-block {
  position: relative;
  margin: 20px 0;
  padding: 22px 24px 18px;
  background: var(--ivory);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  font-family: var(--mono);
  overflow-x: auto;
}
.code-block .cb-lang {
  position: absolute;
  top: 8px;
  right: 12px;
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--stone);
  padding: 1px 6px;
  border-radius: 2px;
  background: var(--parchment);
}
.code-block pre {
  margin: 0;
  padding: 0;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.55;
  color: var(--near-black);
  white-space: pre;
  tab-size: 2;
}
.code-block code {
  font-family: var(--mono);
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: inherit;
  border-radius: 0;
}

/* ---- COVER ---- */
.cover {
  padding-bottom: 40px;
  border-bottom: 1px solid var(--border-soft);
  margin-bottom: 56px;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--stone);
  margin: 0 0 18px;
}
.eyebrow .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--brand); display: inline-block;
}
.cover .tagline {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 20px;
  line-height: 1.4;
  color: var(--olive);
  margin: 0 0 24px;
  max-width: 720px;
}
.cover-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-family: var(--sans);
  font-size: 13px;
  color: var(--stone);
  letter-spacing: 0;
}
.cover-meta b { color: var(--dark-warm); font-weight: 500; }
.cover-meta .sep { color: var(--border); }
.cover-tags { margin: 18px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
.cover-tags .tag {
  display: inline-block;
  background: var(--brand-tint);
  color: var(--brand);
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 2px;
  letter-spacing: 0.4px;
}

/* ---- SECTION OPENER ---- */
section { margin-bottom: 64px; }
.section-head { margin-bottom: 24px; }
.section-head .rule {
  height: 1px;
  background: var(--border-soft);
  margin-top: 16px;
}

/* ---- CONCLUSIONS ---- */
.conclusions-grid { counter-reset: conclusion; margin-top: 8px; }
.conclusion-item {
  counter-increment: conclusion;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 20px;
  padding: 22px 0;
  border-bottom: 1px solid var(--border-soft);
  align-items: start;
}
.conclusion-item:last-child { border-bottom: none; }
.conclusion-num {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 28px;
  color: var(--brand);
  line-height: 1;
  letter-spacing: 0;
  padding-top: 2px;
}
.conclusion-num::before { content: "0" counter(conclusion); }
.conclusion-body h3 { margin: 0 0 4px; font-size: 18px; }
.conclusion-body p  { margin: 0; font-size: 15px; color: var(--olive); line-height: 1.55; }

/* ---- CHAPTER ---- */
.chapter-lead {
  font-size: 16px;
  color: var(--dark-warm);
  line-height: 1.55;
  margin-bottom: 24px;
  padding: 18px 22px;
  background: var(--ivory);
  border-radius: 6px;
}
.chapter-lead .thesis-label {
  display: block;
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--brand);
  margin-bottom: 6px;
}
.chapter-lead strong { color: var(--brand); }
.chapter-content { margin: 8px 0 0; }
.chapter-content h3 { margin: 28px 0 10px; font-size: 18px; }
.chapter-content h4 { margin: 20px 0 8px; font-size: 15px; }
.chapter-content ul, .chapter-content ol { margin: 8px 0; padding-left: 22px; }
.chapter-content li { margin: 4px 0; color: var(--dark-warm); line-height: 1.55; }
.chapter-content li strong { color: var(--near-black); }

/* ---- DIAGRAMS ---- */
.diagram-wrap {
  margin: 28px 0;
  padding: 28px 24px;
  background: var(--ivory);
  border-radius: 8px;
  overflow-x: auto;
}
.diagram-wrap svg, .diagram-wrap img.diagram-svg {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}
.diagram-caption {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--stone);
  text-align: center;
  margin: 12px 0 0;
  letter-spacing: 0.4px;
}
.diagram-error {
  padding: 14px 18px;
  background: #f0e0d8;
  border-radius: 6px;
  color: #8b4513;
  font-family: var(--sans);
  font-size: 13px;
  margin: 16px 0;
}

/* ---- DATA TABLES ---- */
table.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin: 20px 0;
  font-variant-numeric: tabular-nums;
}
table.data-table th {
  text-align: left;
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--stone);
  padding: 12px 16px 12px 0;
  border-bottom: 1px solid var(--border);
}
table.data-table td {
  padding: 12px 16px 12px 0;
  border-bottom: 1px solid var(--border-soft);
  vertical-align: top;
  color: var(--dark-warm);
}
table.data-table tr:last-child td { border-bottom: none; }
table.data-table th:last-child,
table.data-table td:last-child { padding-right: 0; }

/* ---- ACTIONS ---- */
.actions-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
.actions-table td {
  padding: 18px 0;
  border-bottom: 1px solid var(--border-soft);
  vertical-align: top;
}
.actions-table tr:last-child td { border-bottom: none; }
.actions-table .act-priority {
  width: 110px;
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding-right: 24px;
  white-space: nowrap;
  padding-top: 22px;
}
.act-priority.high   { color: var(--brand); }
.act-priority.medium { color: var(--olive); }
.act-priority.low    { color: var(--stone); }
.actions-table .act-body strong { display: block; margin-bottom: 4px; font-size: 16px; color: var(--near-black); font-weight: 500; }
.actions-table .act-body p { margin: 0; font-size: 14px; color: var(--olive); line-height: 1.5; }

/* ---- METRICS ROW ---- */
.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  padding: 20px 24px;
  background: var(--ivory);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin: 24px 0;
}
.metric { display: flex; flex-direction: column; gap: 4px; }
.metric-value {
  font-family: var(--serif);
  font-size: 24px;
  font-weight: 500;
  color: var(--brand);
  line-height: 1;
  letter-spacing: 0;
}
.metric-label {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--olive);
  letter-spacing: 0.4px;
}

/* ---- SUMMARY CARD ---- */
.summary-section {
  margin: 56px 0 32px;
  padding-top: 48px;
  border-top: 1px solid var(--border-soft);
}
.summary-card-fallback {
  background: var(--ivory);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 56px 48px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
}
.summary-card-fallback .sc-eyebrow {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--stone);
  margin-bottom: 20px;
}
.summary-card-fallback h2 {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 32px;
  line-height: 1.2;
  color: var(--near-black);
  margin: 0 0 8px;
  letter-spacing: -0.3px;
}
.summary-card-fallback .summary-date {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--stone);
  margin-bottom: 32px;
}
.summary-card-fallback ul {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid var(--border-soft);
}
.summary-card-fallback li {
  position: relative;
  padding: 16px 0 16px 28px;
  border-bottom: 1px solid var(--border-soft);
  font-size: 16px;
  color: var(--dark-warm);
  line-height: 1.5;
}
.summary-card-fallback li:last-child { border-bottom: none; }
.summary-card-fallback li::before {
  content: "";
  position: absolute;
  left: 0; top: 26px;
  width: 12px; height: 1.5px;
  background: var(--brand);
}
.summary-card-fallback .sc-foot {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--sans);
  font-size: 12px;
  color: var(--stone);
  letter-spacing: 0.4px;
}

/* ---- DASH LIST ---- */
ul.dash {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}
ul.dash li {
  position: relative;
  padding-left: 18px;
  margin: 4px 0;
  color: var(--dark-warm);
  line-height: 1.55;
}
ul.dash li::before {
  content: "\u2013";
  position: absolute;
  left: 0;
  color: var(--brand);
}

/* ---- QUOTE CALLOUT ---- */
.callout {
  margin: 24px 0;
  padding: 20px 24px;
  background: var(--ivory);
  border: 1px solid var(--border);
  border-left: 3px solid var(--brand);
  border-radius: 6px;
  font-size: 15px;
  color: var(--dark-warm);
  line-height: 1.6;
}
.callout .label {
  font-family: var(--sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--brand);
  margin-bottom: 6px;
  display: block;
}

/* ---- RESPONSIVE ---- */
@media (max-width: 768px) {
  .cover h1 { font-size: 40px; }
  .section-title { font-size: 24px; }
  .cover .tagline { font-size: 17px; }
  section { margin-bottom: 48px; }
  .summary-card-fallback { padding: 32px 24px; }
  .summary-card-fallback h2 { font-size: 24px; }
  .conclusion-item { grid-template-columns: 40px 1fr; gap: 12px; }
  .conclusion-num { font-size: 22px; }
  .actions-table .act-priority { width: 80px; padding-right: 16px; }
  .metrics { gap: 20px; padding: 16px; }
}
@media (max-width: 480px) {
  .page { padding: 32px 16px 48px; }
  .cover h1 { font-size: 32px; }
  .cover-meta { gap: 12px; }
}

/* ---- PRINT ---- */
@page { size: A4; margin: 14mm 16mm; background: var(--parchment); }
@media print {
  body, .page { background: var(--parchment); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { padding: 0 !important; max-width: 100% !important; }
  section { page-break-inside: auto; }
  .cover, .section-head, .chapter-lead, .diagram-wrap, .conclusion-item, .actions-table tr, .summary-card-fallback { break-inside: avoid; page-break-inside: avoid; }
  .cover h1 { font-size: 44px; }
  .section-title { font-size: 24px; }
}

</style>
</head>
<body>
<div class="page">
${coverSection}
${conclusionsSection}
${chaptersSections}
${actionsSection}
${summarySection}
</div>
</body>
</html>`;
}

// ===== Summary Card Generation (takumi with CJK font support) =====
async function findCJKFont() {
  const { existsSync, readFileSync } = await import('node:fs');
  // 1) Prefer bundled LXGW WenKai (ships in fonts/, SIL OFL)
  const bundled = await loadBundledFont();
  if (bundled) {
    return { name: bundled.name, data: bundled.data, bundled: true };
  }
  // 2) Fall back to system CJK fonts
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
    // Register fonts at weight 400 only. We avoid loadDefaultFonts because
    // takumi otherwise falls back to system bold variants, which make the
    // LXGW WenKai kaiti title look heavy/blurry.
    const fonts = [
      { name: cjkFont.name, data: cjkFont.data, weight: 400 },
    ];
    if (needsCJK) {
      fonts.push(
        { name: 'LXGW WenKai', data: cjkFont.data, weight: 400 },
      );
    }

    const renderer = new core.Renderer({
      fonts,
      loadDefaultFonts: false,
    });

    const titleFont = needsCJK
      ? `${cjkFont.name},'Songti SC',serif`
      : `Charter,Georgia,serif`;
    const bodyFont = needsCJK
      ? `${cjkFont.name},'PingFang SC',-apple-system,sans-serif`
      : `Charter,Georgia,serif`;

    const points = (data.summary_points || data.conclusions.map(c => c.point)).slice(0, 4);
    const pointsHtml = points
      .map((p, i) => `<div style="display:flex;align-items:flex-start;gap:12px;padding:6px 0;"><span style="width:18px;height:1.5px;background:#1B365D;flex-shrink:0;margin-top:14px;"></span><span style="${bodyFont};font-size:18px;color:#3d3d3a;line-height:1.5;letter-spacing:0;">${escapeHtml(p)}</span></div>`)
      .join('');

    // Metrics
    const totalChapters = data.chapters?.length || 0;
    const totalConclusions = data.conclusions?.length || 0;
    const totalDiagrams = (data.overview_diagram ? 1 : 0) + (data.chapters || []).reduce((acc, c) => acc + (c.diagrams?.length || 0), 0);
    const totalActions = data.actions?.length || 0;
    const metrics = [
      { v: String(totalChapters), l: 'Chapters' },
      { v: String(totalConclusions), l: 'Conclusions' },
      { v: String(totalDiagrams), l: 'Diagrams' },
      { v: String(totalActions), l: 'Actions' },
    ];
    const metricsHtml = metrics.map(m => `
      <div style="display:flex;flex-direction:column;gap:6px;padding:16px 20px;background:#faf9f5;border:1px solid #e8e6dc;border-radius:8px;flex:1;min-width:0;">
        <div style="${titleFont};font-size:30px;font-weight:400;color:#1B365D;line-height:1;letter-spacing:0;">${m.v}</div>
        <div style="font-family:-apple-system,sans-serif;font-size:11px;color:#6b6a64;letter-spacing:1.2px;text-transform:uppercase;font-weight:500;">${escapeHtml(m.l)}</div>
      </div>
    `).join('');

    // Tagline truncation
    const tagline = (data.meta?.summary || '').trim();
    const dateStr = escapeHtml(data.meta?.date || '');
    const authorStr = escapeHtml(data.meta?.author || '');
    const sourceStr = escapeHtml(data.meta?.source || '');
    const metaLine = [
      dateStr && dateStr,
      authorStr && `by ${authorStr}`,
      sourceStr && sourceStr,
    ].filter(Boolean).join(' \u00b7 ');

    // Info card: 1200x630, grid layout
    // - Row 1 (eyebrow): 36px
    // - Row 2 (hero title + metrics): 200px
    // - Row 3 (tagline): 36px
    // - Row 4 (insights): 220px
    // - Row 5 (footer): 32px
    // Total: ~620px (with 5px padding buffer)
    const cardHtml = `<div style="width:1200px;height:630px;background:#f5f4ed;display:flex;flex-direction:column;padding:48px 60px;box-sizing:border-box;font-family:${titleFont};">
      <!-- Top eyebrow row -->
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e3d8;padding-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;font-family:-apple-system,sans-serif;font-size:12px;color:#6b6a64;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;">
          <span style="width:6px;height:6px;background:#1B365D;border-radius:50%;display:inline-block;"></span>
          <span>Report Summary</span>
        </div>
        <div style="font-family:-apple-system,sans-serif;font-size:12px;color:#6b6a64;letter-spacing:0.4px;">${metaLine}</div>
      </div>

      <!-- Hero row: title on left, metrics on right -->
      <div style="display:flex;gap:40px;margin-top:22px;align-items:flex-start;">
        <div style="flex:1.5;min-width:0;padding-right:8px;">
          <h1 style="font-size:42px;font-weight:400;color:#141413;line-height:1.15;margin:0 0 14px 0;letter-spacing:-0.2px;">${escapeHtml(data.meta?.title || 'Report')}</h1>
          <p style="font-size:15px;color:#504e49;line-height:1.55;margin:0;font-family:${bodyFont};letter-spacing:0;max-width:560px;">${escapeHtml(tagline)}</p>
        </div>
        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;min-width:0;align-content:start;">
          ${metricsHtml}
        </div>
      </div>

      <!-- Insights (4 bullets max) -->
      <div style="margin-top:auto;padding-top:24px;border-top:1px solid #e5e3d8;">
        <div style="font-family:-apple-system,sans-serif;font-size:11px;color:#1B365D;letter-spacing:1.2px;text-transform:uppercase;font-weight:500;margin-bottom:10px;">Key Insights</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 32px;">
          ${pointsHtml}
        </div>
      </div>

      <!-- Footer -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding-top:12px;border-top:1px solid #e5e3d8;font-family:-apple-system,sans-serif;font-size:11px;color:#6b6a64;letter-spacing:0.4px;">
        <span>Editorial Report</span>
        <span>${dateStr}</span>
      </div>
    </div>`;

    const parsed = htmlHelper.fromHtml(cardHtml);
    const image = await renderer.render(parsed.node, { width: 1200, height: 630 });
    summaryPngBase64 = `data:image/png;base64,${image.toString('base64')}`;
    console.log(`Summary card PNG generated successfully (CJK: ${needsCJK ? 'yes' : 'no'}, font: ${cjkFont.name})`);
  }
} catch (err) {
  console.warn('takumi summary card failed (non-fatal):', err.message);
}

// ===== Subset bundled font for HTML =====
let htmlFontBase64 = null;
if (data && hasCJK(JSON.stringify(data))) {
  const bundled = await loadBundledFont();
  if (bundled) {
    const sub = await subsetBundledFont(bundled, JSON.stringify(data));
    if (sub) {
      htmlFontBase64 = sub.data.toString('base64');
      console.log(`  HTML font subset: ${sub.name} (${sub.sizeKB.toFixed(0)} KB, inlined as base64)`);
    }
  }
}

// Build final HTML
console.log('Assembling HTML report...');
const fontFaceCSS = htmlFontBase64
  ? "@font-face {\n  font-family: 'LXGW WenKai';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(data:font/woff2;base64," + htmlFontBase64 + ") format('woff2');\n}"
  : '';
let html = buildHtml(data, diagramResults);
html = html.replace('${FONT_FACE_CSS}', fontFaceCSS);
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
