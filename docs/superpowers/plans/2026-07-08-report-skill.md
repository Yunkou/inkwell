# Report Skill Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code skill that generates polished HTML reports from conversation context using Pyramid Principle, beautiful-mermaid diagrams, takumi summary images, and Kami design system.

**Architecture:** AI (Claude) structures conversation content into JSON → Node.js script renders self-contained HTML with inline SVGs + PNG + Kami CSS → browser opens report.

**Tech Stack:** Node.js ≥ 18, beautiful-mermaid, takumi-js (with JSX loader), Kami CSS (inline)

## Global Constraints

- Single self-contained HTML output, zero external dependencies at render time
- All assets (SVG, PNG, CSS, fonts) inline or data-URI embedded
- Kami palette: parchment #f5f4ed, ink-blue #1B365D, near-black #141413
- Serif typography: Charter/Georgia (EN), TsangerJinKai02 fallback (CN)
- No cool grays, no hard shadows, no pure white backgrounds
- Output file: report.html (temp directory)
- Auto-open with `open` command after generation

## File Structure

```
/Users/coco/.claude/skills/grill-me/
├── SKILL.md                        # Updated: skill instructions for Claude
├── package.json                    # Node.js dependencies
├── references/
│   └── kami-design.md              # Kami design tokens quick reference
└── scripts/
    └── generate-report.mjs         # JSON → report.html (ESM, single file)
```

---

### Task 1: Create package.json with dependencies

**Files:**
- Create: `/Users/coco/.claude/skills/grill-me/package.json`

**Interfaces:**
- Produces: `package.json` with `beautiful-mermaid`, `takumi-js` dependencies and `"type": "module"`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "grill-me-report",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "HTML report generator for Claude Code conversation summaries",
  "scripts": {
    "generate": "node scripts/generate-report.mjs"
  },
  "dependencies": {
    "beautiful-mermaid": "^1.1.3",
    "takumi-js": "^0.8.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd /Users/coco/.claude/skills/grill-me && npm install`
Expected: dependencies installed successfully, `node_modules/` created.

- [ ] **Step 3: Verify beautiful-mermaid loads**

Run: `cd /Users/coco/.claude/skills/grill-me && node -e "import('beautiful-mermaid').then(m => console.log(Object.keys(m)))"`
Expected: Output shows `['renderMermaidSVG', 'renderMermaidASCII', 'THEMES', 'fromShikiTheme', ...]`

- [ ] **Step 4: Verify takumi-js loads**

Run: `cd /Users/coco/.claude/skills/grill-me && node -e "import('takumi-js').then(m => console.log(Object.keys(m)))"`
Expected: Output shows `['render', 'renderSvg', 'renderAnimation', ...]` or reports missing native binding (continue anyway — takumi may need bun; if fails, we fall back gracefully in the generator)

---

### Task 2: Create Kami design tokens reference

**Files:**
- Create: `/Users/coco/.claude/skills/grill-me/references/kami-design.md`

**Interfaces:**
- Produces: Reference document consumed by Claude when generating report content. Not machine-read — human/AI reference only.

- [ ] **Step 1: Write kami-design.md**

```markdown
# Kami Design System — Quick Reference

## Colors

| Token | Hex | Role |
|-------|-----|------|
| `--parchment` | `#f5f4ed` | Page background |
| `--ivory` | `#faf9f5` | Card/container background |
| `--brand` | `#1B365D` | Ink-blue accent (≤5% surface) |
| `--brand-light` | `#2D5A8A` | Links on dark surfaces |
| `--near-black` | `#141413` | Primary text |
| `--dark-warm` | `#3d3d3a` | Secondary text |
| `--olive` | `#504e49` | Subtext, captions |
| `--stone` | `#6b6a64` | Tertiary, dates, metadata |
| `--border` | `#e8e6dc` | Section dividers, card borders |
| `--border-soft` | `#e5e3d8` | Row separators |
| `--warm-sand` | `#e8e6dc` | Button default surface |

## Typography

- **EN serif**: Charter, Georgia, Palatino, "Times New Roman", serif
- **CN serif**: "TsangerJinKai02", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif
- **Mono**: "JetBrains Mono", "SF Mono", "Fira Code", Consolas, Monaco, monospace
- **UI sans**: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif

## Size Scale (screen px)

| Role | Size | Weight | Line-height |
|------|------|--------|-------------|
| Display/Hero | 48px | 500 | 1.10 |
| H1 Section | 28px | 500 | 1.20 |
| H2 | 22px | 500 | 1.25 |
| H3 | 18px | 500 | 1.30 |
| Body | 16px | 400 | 1.55 |
| Caption | 14px | 400 | 1.45 |
| Label | 12px | 600 | 1.35 |

## Components

**Section Title**: brand left bar (3px × auto) + serif heading
**Card**: ivory bg, 0.5px border, 8px radius, 16px 20px padding
**Button Primary**: brand bg, ivory text, 8px 16px, 8px radius, ring shadow
**Button Secondary**: warm-sand bg, dark-warm text
**Tag**: brand-tint bg (#EEF2F7), brand text, 2px radius, uppercase
**Code Block**: ivory bg, 0.5px border, 6px radius, mono font
**Quote**: 2px brand left border, olive text
**Table**: border-bottom rows, brand-tinted header

## beautiful-mermaid Theme Mapping

```
bg:      '#f5f4ed'  → --parchment
fg:      '#141413'  → --near-black
line:    '#504e49'  → --olive
accent:  '#1B365D'  → --brand
muted:   '#6b6a64'  → --stone
surface: '#faf9f5'  → --ivory
border:  '#e8e6dc'  → --border
```

## Key Rules

1. Page bg parchment #f5f4ed, never pure white
2. Single accent ink-blue #1B365D, no second chromatic color
3. All grays warm-toned (yellow-brown undertone)
4. EN: serif everything; CN: serif headings, sans body
5. Serif weight at 500 max, no bold (700)
6. Depth via whisper shadow only (0 4px 24px rgba(0,0,0,0.05))
7. No italic in headings/body
```

---

### Task 3: Create the report generator script (core)

**Files:**
- Create: `/Users/coco/.claude/skills/grill-me/scripts/generate-report.mjs`

**Interfaces:**
- Consumes: CLI arg `process.argv[2]` = path to JSON input file; `process.argv[3]` = path to output HTML (default: `/tmp/report.html`)
- Produces: Self-contained `report.html` file
- JSON schema (from spec): `{ meta: { title, date, summary, tags }, conclusions: [{ point, detail }], overview_diagram: string, chapters: [{ title, conclusion, content, diagrams: [] }], actions: [{ priority, action, detail }], summary_points: [] }`

- [ ] **Step 1: Write the script skeleton with imports and CLI parsing**

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
```

- [ ] **Step 2: Add beautiful-mermaid diagram rendering**

```javascript
import { renderMermaidSVG } from 'beautiful-mermaid';

const KAMI_THEME = {
  bg: '#f5f4ed',
  fg: '#141413',
  line: '#504e49',
  accent: '#1B365D',
  muted: '#6b6a64',
  surface: '#faf9f5',
  border: '#e8e6dc',
};

function renderDiagram(code) {
  try {
    // Wrap in div for layout control
    const svg = renderMermaidSVG(code, { ...KAMI_THEME, transparent: true });
    return { success: true, svg };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Pre-render all diagrams
const diagramResults = new Map();

if (data.overview_diagram) {
  diagramResults.set('overview', renderDiagram(data.overview_diagram));
}

for (let ci = 0; ci < data.chapters.length; ci++) {
  const chapter = data.chapters[ci];
  if (chapter.diagrams) {
    for (let di = 0; di < chapter.diagrams.length; di++) {
      const key = `ch${ci}-d${di}`;
      diagramResults.set(key, renderDiagram(chapter.diagrams[di]));
    }
  }
}

console.log(`Rendered ${diagramResults.size} diagrams`);
```

- [ ] **Step 3: Add summary card generation (with graceful fallback)**

```javascript
let summaryPngBase64 = null;

async function generateSummaryCard(reportData) {
  try {
    const { render } = await import('takumi-js');

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

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Generate summary card (async)
summaryPngBase64 = await generateSummaryCard(data);
if (summaryPngBase64) {
  console.log('Summary card PNG generated successfully');
}
```

- [ ] **Step 4: Add HTML template builder with Kami CSS**

```javascript
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
.metrics {
  display: flex; gap: 24px; margin: 24px 0; flex-wrap: wrap;
}
.metric {
  flex: 1; min-width: 120px;
}
.metric-value {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 500;
  color: var(--brand);
}
.metric-label {
  font-size: 13px;
  color: var(--olive);
  font-family: var(--sans);
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
```

- [ ] **Step 5: Add section builder functions**

```javascript
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
```

- [ ] **Step 6: Add the main execution block**

```javascript
// Build and write the HTML
console.log('Assembling HTML report...');
const html = buildHtml(data, diagramResults, summaryPngBase64);

writeFileSync(outputPath, html, 'utf-8');
console.log(`Report written to: ${outputPath}`);
console.log(`Size: ${(html.length / 1024).toFixed(1)} KB`);
```

- [ ] **Step 7: Test the generator with sample data**

Create a test JSON at `/tmp/test-report-input.json`:
```json
{
  "meta": {
    "title": "测试报告：用户认证模块调研",
    "date": "2026-07-08",
    "summary": "对现有认证系统进行全面调研，识别安全风险并提出改进方案",
    "tags": ["安全", "认证", "调研"]
  },
  "conclusions": [
    { "point": "JWT token 刷新机制存在安全漏洞", "detail": "当前 refresh token 未设置过期时间，且存储在 localStorage 中易受 XSS 攻击" },
    { "point": "OAuth 2.0 流程缺少 PKCE 扩展", "detail": "移动端和 SPA 场景下应强制使用 PKCE 防止授权码拦截攻击" },
    { "point": "密码策略强度不足", "detail": "当前仅要求 6 位字符，未强制特殊字符和数字组合" }
  ],
  "overview_diagram": "graph TD\n  A[用户] --> B{认证方式}\n  B -->|密码| C[传统登录]\n  B -->|OAuth| D[第三方登录]\n  C --> E{安全风险}\n  D --> F{安全风险}\n  E -->|高| G[弱密码]\n  E -->|中| H[无速率限制]\n  F -->|高| I[缺少PKCE]\n  F -->|中| J[Token泄漏]",
  "chapters": [
    {
      "title": "JWT Token 安全分析",
      "conclusion": "JWT 实现存在三个关键缺陷：无过期、localStorage 存储、缺少签名验证",
      "content": "### 现状分析\n\n当前系统使用 JWT 作为主要认证令牌。Access token 有效期为 24 小时，refresh token **未设置过期时间**。\n\n### 风险点\n\n- **XSS 攻击面**：token 存储在 `localStorage`，任何注入的脚本均可读取\n- **无签名验证**：服务端未验证 JWT 签名算法，存在 `alg=none` 攻击风险\n- **无撤销机制**：用户登出后 token 仍有效\n\n### 建议方案\n\n使用 httpOnly cookie 存储 refresh token，access token 改为内存存储 + 短有效期（15分钟）",
      "diagrams": [
        "sequenceDiagram\n  participant U as 用户\n  participant C as 客户端\n  participant S as 服务端\n  U->>C: 登录\n  C->>S: 用户名+密码\n  S->>C: access token (15min) + refresh token (httpOnly cookie)\n  C->>S: API 请求 (Authorization header)\n  S->>C: 200 OK\n  Note over C,S: 15分钟后\n  C->>S: refresh token (cookie自动发送)\n  S->>C: 新 access token"
      ]
    },
    {
      "title": "密码策略改进",
      "conclusion": "密码策略需要从 6 位简单密码升级到 12 位以上含特殊字符，并增加速率限制",
      "content": "### 当前策略\n\n- 最小长度：6 位\n- 无字符类型要求\n- 无登录失败次数限制\n\n### 行业标准对比\n\n- NIST SP 800-63B 建议最小 8 位\n- OWASP 建议 8 位以上，推荐 12 位\n- 应检查已知泄露密码库（如 HaveIBeenPwned）",
      "diagrams": []
    }
  ],
  "actions": [
    { "priority": "high", "action": "修复 JWT refresh token 存储方式", "detail": "改用 httpOnly cookie，添加过期时间和撤销机制" },
    { "priority": "high", "action": "实施登录速率限制", "detail": "IP + 账号双重限制，5 次失败锁定 15 分钟" },
    { "priority": "medium", "action": "升级密码复杂度要求", "detail": "最小 12 位，需含大小写字母+数字+特殊字符" },
    { "priority": "low", "action": "添加登录审计日志", "detail": "记录所有登录尝试的时间、IP、User-Agent" }
  ],
  "summary_points": [
    "JWT 存储方式需立即修复（httpOnly cookie）",
    "OAuth 流程需增加 PKCE 扩展",
    "密码策略需升级到 12 位以上",
    "速率限制和审计日志作为补充防护"
  ]
}
```

Run: `cd /Users/coco/.claude/skills/grill-me && node scripts/generate-report.mjs /tmp/test-report-input.json /tmp/test-report.html`
Expected: Reports "Loaded report...", "Rendered 3 diagrams", "Report written to /tmp/test-report.html"

- [ ] **Step 8: Open the test report**

Run: `open /tmp/test-report.html`
Expected: Browser opens with the Kami-styled report. Verify: cover page renders, diagrams visible, summary card section present, save button functional.

---

### Task 4: Update SKILL.md entry point

**Files:**
- Modify: `/Users/coco/.claude/skills/grill-me/SKILL.md`

**Interfaces:**
- Consumes: Current conversation context (Claude Code session)
- Produces: Structured JSON written to temp file; invokes `node scripts/generate-report.mjs <json-path>`

- [ ] **Step 1: Write the updated SKILL.md**

```markdown
---
name: grill-me
description: Generate polished HTML reports from AI conversations using Pyramid Principle, beautiful-mermaid diagrams, and Kami design system.
disable-model-invocation: false
---

# Report Generator (Grill-Me)

Turn any AI conversation or research session into a polished, visual-first HTML report.

## When to Use

- User says "生成报告", "generate report", "make a report", "summarize this"
- After a multi-turn research or code analysis session
- When the user wants structured, readable output from a long conversation

## Workflow

### Step 1: Understand the content

Read the current conversation context. Identify:
- The main topic/question
- Key conclusions the user and AI have reached
- Supporting evidence and analysis
- Action items or recommendations

### Step 2: Structure into JSON

Create a JSON object following this schema:

```json
{
  "meta": {
    "title": "报告标题",
    "date": "YYYY-MM-DD",
    "summary": "一句话摘要",
    "tags": ["标签1", "标签2"]
  },
  "conclusions": [
    { "point": "核心结论", "detail": "支撑细节说明" }
  ],
  "overview_diagram": "mermaid diagram code (optional, for overview)",
  "chapters": [
    {
      "title": "章节标题",
      "conclusion": "本章核心结论（一句话）",
      "content": "详细内容（支持 markdown: # ## ### - > ** ** ` `",
      "diagrams": ["mermaid code 1", "mermaid code 2"]
    }
  ],
  "actions": [
    { "priority": "high|medium|low", "action": "行动项", "detail": "具体说明" }
  ],
  "summary_points": ["总结要点1", "总结要点2", "总结要点3"]
}
```

**Pyramid Principle rules:**
1. **结论先行**: `conclusions` 放在报告开头，让读者先看到最重要的结论
2. **以上统下**: 每个 `chapter.conclusion` 支撑顶层的某个 `conclusion`
3. **归类分组**: 相关内容归入同一个 chapter
4. **逻辑递进**: chapters 按重要性/时间/结构顺序排列

**Mermaid diagrams:**
- Use mermaid diagrams liberally — one diagram per chapter minimum
- Supported types: `graph TD/LR`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`, `erDiagram`, `xychart-beta`
- Describe architecture, flows, relationships, timelines, comparisons
- Remember: **diagrams are always more readable than text**

**Flexible mode:** If the content is short (1-2 points, no clear chapter structure), collapse to fewer chapters and merge sections as needed.

### Step 3: Write JSON and generate report

Write the JSON to a temp file, then run the generator:

```bash
# Write JSON to temp file
cat > /tmp/report-input.json << 'JSONEOF'
<the structured JSON>
JSONEOF

# Generate the report
cd /Users/coco/.claude/skills/grill-me && node scripts/generate-report.mjs /tmp/report-input.json /tmp/report.html
```

### Step 4: Open the report

```bash
open /tmp/report.html
```

Tell the user: "报告已生成并打开。包含 X 个章节、Y 张图表。点击底部按钮可保存总结图。"

## Design Reference

See `references/kami-design.md` for the full Kami design system tokens, colors, typography, and beautiful-mermaid theme mapping.

## Dependencies

- Node.js ≥ 18
- `npm install` (run once in the skill directory)
```

---

### Task 5: Integration test (end-to-end)

**Files:**
- None (test only)

**Interfaces:**
- Consumes: SKILL.md instructions + test JSON
- Produces: Verified working report.html opened in browser

- [ ] **Step 1: Verify npm dependencies are installed**

Run: `cd /Users/coco/.claude/skills/grill-me && node -e "import('beautiful-mermaid').then(m => console.log('beautiful-mermaid:', m.renderMermaidSVG ? 'OK' : 'MISSING RENDER'))"`
Expected: `beautiful-mermaid: OK`

- [ ] **Step 2: Run generator with test data**

Run: `cd /Users/coco/.claude/skills/grill-me && node scripts/generate-report.mjs /tmp/test-report-input.json /tmp/test-report.html`
Expected output:
```
Loaded report: "测试报告：用户认证模块调研"
Chapters: 2, Conclusions: 3
Rendered 3 diagrams
Summary card PNG generated successfully
Assembling HTML report...
Report written to: /tmp/test-report.html
Size: XX.X KB
```

- [ ] **Step 3: Verify HTML output is self-contained**

Run: `grep -c 'https://' /tmp/test-report.html; grep -c 'http://' /tmp/test-report.html`
Expected: Both return `0` (no external HTTP dependencies).

Run: `grep -c 'data:image/png;base64,' /tmp/test-report.html`
Expected: `1` (takumi summary PNG embedded) or `0` (if takumi unavailable — fallback HTML summary is present instead).

- [ ] **Step 4: Verify Kami colors are present**

Run: `grep -c '#f5f4ed' /tmp/test-report.html && grep -c '#1B365D' /tmp/test-report.html`
Expected: Both return `>= 1` (parchment and ink-blue used).

- [ ] **Step 5: Open in browser**

Run: `open /tmp/test-report.html`
Expected: Browser displays the report with Kami styling, mermaid SVGs render correctly, summary section visible at bottom with save button.

- [ ] **Step 6: Verify save button works**

Manually check in browser: click "💾 保存总结图" button. With takumi: PNG downloads. Without takumi: print dialog opens.
