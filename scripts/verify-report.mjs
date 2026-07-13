#!/usr/bin/env node
// scripts/verify-report.mjs — Validate a generated inkwell report.
//
// Usage:
//   node scripts/verify-report.mjs /tmp/report.html
//   node scripts/verify-report.mjs /tmp/report.html --tokens references/design-tokens.json
//   node scripts/verify-report.mjs /tmp/report.html --strict
//
// Checks:
//   1. HTML structural integrity (DOCTYPE, <html lang>, balanced tags)
//   2. Required editorial anchors are present (cover, chapter-lead, etc.)
//   3. Design-token compliance (parchment bg, brand accent, font families)
//   4. Anti-pattern detection (left-bar on section title, font-weight 700 on serif, pure white bg)
//   5. Mermaid blocks: at least one per chapter if `--strict`
//
// Exit codes:
//   0 — all checks pass (warnings allowed)
//   1 — fatal structural failure
//   2 — design-token violation(s) detected
//   3 — anti-pattern violation(s) detected
//
// When the user runs the skill, the agent should re-run this script after
// `generate-report.mjs` and include its output in the final summary.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_DIR = resolve(__dirname, '..');

const ANSI = {
  reset: '\x1b[0m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  blue:  '\x1b[34m',
  dim:   '\x1b[2m',
  bold:  '\x1b[1m',
};
const c = (color, s) => `${ANSI[color]}${s}${ANSI.reset}`;

// design-tokens.json uses camelCase keys; generated CSS uses kebab-case vars
// (e.g. brandLight → --brand-light, brandTint2 → --brand-tint-2).
function tokenToCssVar(name) {
  return name
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

const args = process.argv.slice(2);
const reportPath = args[0];
const tokensPath = (() => {
  const i = args.indexOf('--tokens');
  return i >= 0 ? args[i + 1] : resolve(SKILL_DIR, 'references/design-tokens.json');
})();
const strict = args.includes('--strict');

if (!reportPath) {
  console.error('Usage: node scripts/verify-report.mjs <report.html> [--tokens <tokens.json>] [--strict]');
  process.exit(1);
}
if (!existsSync(reportPath)) {
  console.error(`${c('red', '✗')} Report not found: ${reportPath}`);
  process.exit(1);
}

const html = readFileSync(reportPath, 'utf8');
let tokens = null;
if (existsSync(tokensPath)) {
  try { tokens = JSON.parse(readFileSync(tokensPath, 'utf8')); }
  catch (e) { console.warn(`${c('yellow', '⚠')}  Could not parse ${tokensPath}: ${e.message}`); }
}

const findings = { fatal: [], error: [], warn: [], info: [] };
const add = (severity, message) => findings[severity].push(message);
const section = (label) => console.log(`\n${c('blue', '▸')} ${c('bold', label)}`);

// ───────────────────────────────────────────────────────────────
// 1. HTML structural integrity
// ───────────────────────────────────────────────────────────────
section('1. Structural integrity');
const hasDoctype = /<!DOCTYPE html>/i.test(html);
const hasLang    = /<html[^>]*\slang=/i.test(html);
const hasViewport= /name=["']viewport["']/i.test(html);
const openTags   = (html.match(/<(\w+)(?:\s[^>]*)?>/g) || [])
  .map(t => t.match(/^<(\w+)/)[1])
  .filter(t => !['meta','link','br','hr','img','input','source','wbr','area','base','col','embed','param','track','circle','path','rect','line','polygon','polyline','use','ellipse','stop'].includes(t.toLowerCase()));
const closeTags  = (html.match(/<\/(\w+)>/g) || [])
  .map(t => t.match(/^<\/(\w+)>/)[1]);
const count = (arr) => arr.reduce((m, t) => (m[t] = (m[t] || 0) + 1, m), {});
const oc = count(openTags), cc = count(closeTags);
const unbalanced = [];
for (const tag of new Set([...Object.keys(oc), ...Object.keys(cc)])) {
  if ((oc[tag] || 0) !== (cc[tag] || 0)) {
    if (['div','section','header','footer','main','article','aside','nav','ul','ol','li','table','thead','tbody','tr','td','th','h1','h2','h3','h4','h5','h6','p','span','a','blockquote','figure','figcaption','details','summary'].includes(tag)) {
      unbalanced.push(`${tag}: open=${oc[tag] || 0} close=${cc[tag] || 0}`);
    }
  }
}
if (hasDoctype) console.log(`  ${c('green','✓')} <!DOCTYPE html>`);
else { console.log(`  ${c('red','✗')} <!DOCTYPE html> missing`); add('fatal', 'Missing DOCTYPE'); }
if (hasLang) console.log(`  ${c('green','✓')} <html lang=…>`);
else { console.log(`  ${c('red','✗')} <html lang=…> missing`); add('fatal', 'Missing html lang attribute'); }
if (hasViewport) console.log(`  ${c('green','✓')} viewport meta`);
else { console.log(`  ${c('yellow','⚠')}  viewport meta missing`); add('warn', 'viewport meta missing'); }
if (unbalanced.length === 0) console.log(`  ${c('green','✓')} tag balance (${Object.keys(oc).length} unique)`);
else { console.log(`  ${c('red','✗')} unbalanced: ${unbalanced.join(', ')}`); add('fatal', `Unbalanced tags: ${unbalanced.join(', ')}`); }

// ───────────────────────────────────────────────────────────────
// 2. Required editorial anchors
// ───────────────────────────────────────────────────────────────
section('2. Editorial anchors');
const anchors = [
  { name: 'cover hero',         re: /<header class=["']cover["']>/ },
  { name: 'section head',       re: /<div class=["']section-head["']>/ },
  { name: 'conclusion item',    re: /<div class=["']conclusion-item["']/ },
  { name: 'chapter lead',       re: /<div class=["']chapter-lead["']/ },
  { name: 'actions table',      re: /<table class=["']actions-table["']/ },
  { name: 'data table',         re: /<table class=["']data-table["']/, optional: true },
  { name: 'diagram wrap',       re: /<div class=["']diagram-wrap["']/, optional: true },
  { name: 'code block',          re: /<div class=["']code-block["']/, optional: true },
  { name: 'summary card',       re: /summary-card/, optional: true },
  { name: 'page root',          re: /<div class=["']page["']/ },
  { name: 'brand hairline rule',re: /<div class=["']rule["']/ },
];
for (const a of anchors) {
  if (a.re.test(html)) console.log(`  ${c('green','✓')} ${a.name}`);
  else {
    const sev = a.optional ? 'warn' : 'error';
    const sym = sev === 'warn' ? '⚠' : '✗';
    console.log(`  ${c(sev === 'warn' ? 'yellow' : 'red', sym)}  ${a.name} missing${a.optional ? ' (optional)' : ''}`);
    add(sev, `Missing editorial anchor: ${a.name}`);
  }
}
const chapterCount = (html.match(/<div class=["']chapter-lead["']/g) || []).length;
const conclusionCount = (html.match(/<div class=["']conclusion-item["']/g) || []).length;
console.log(`  ${c('dim',`(${chapterCount} chapters, ${conclusionCount} conclusions)`)}`);

// ───────────────────────────────────────────────────────────────
// 3. Design-token compliance
// ───────────────────────────────────────────────────────────────
section('3. Design-token compliance');
if (tokens?.color) {
  for (const [name, def] of Object.entries(tokens.color)) {
    const hex = def.value?.toLowerCase();
    if (!hex) continue;
    const varRef = new RegExp(`var\\(--${tokenToCssVar(name)}\\)`, 'i');
    const literal = new RegExp(hex.replace('#', '#'), 'gi');
    if (varRef.test(html) || literal.test(html)) {
      console.log(`  ${c('green','✓')} ${name} = ${hex} (in CSS)`);
    }
  }
}
// Required: parchment background somewhere
if (/var\(--parchment\)|#f5f4ed/i.test(html)) console.log(`  ${c('green','✓')} parchment background used`);
else { console.log(`  ${c('red','✗')} parchment background not used`); add('error', 'Parchment background token missing'); }
// Required: brand accent used at least once
if (/var\(--brand\)|#1B365D/i.test(html)) console.log(`  ${c('green','✓')} brand ink-blue used`);
else { console.log(`  ${c('yellow','⚠')}  brand ink-blue not detected`); add('warn', 'Brand accent not detected'); }
// Required: bundled font reference
if (/LXGW WenKai/i.test(html)) console.log(`  ${c('green','✓')} bundled font: LXGW WenKai`);
else { console.log(`  ${c('yellow','⚠')}  bundled font not referenced`); add('warn', 'Bundled font not referenced'); }

// ───────────────────────────────────────────────────────────────
// 4. Anti-pattern detection
// ───────────────────────────────────────────────────────────────
section('4. Anti-patterns');
const antipatterns = [
  { name: 'left bar on section title', re: /\.section-title\s*\{[^}]*border-left\s*:/ },
  { name: 'cool blue-gray tones',      re: /#[0-9a-f]{6}/i, hexOnly: true }, // checked below against R<=>B luminance
  { name: 'synthetic bold on serif',   re: /font-weight:\s*7\d\d/ },
  { name: 'hard drop shadow',          re: /box-shadow:\s*0\s+\d+px\s+\d+px\s+rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.[2-9]/ },
];
// Allowed palette (warm-toned). Anything hex outside this set is checked for hue.
const allowedHex = new Set([
  '#f5f4ed','#faf9f5','#e8e6dc','#1b365d','#2d5a8a','#eef2f7','#e4ecf5','#d6e1ee',
  '#141413','#3d3d3a','#504e49','#6b6a64','#e5e3d8','#e0ddd0','#000000','#ffffff',
]);
// For hue-check, exclude colors embedded in the stylesheet only (CSS rules we authored).
// colors inside <svg>...</svg> (e.g., generated by beautiful-mermaid) are out of scope.
const styleScope = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] || '';
const allHex = [...new Set((styleScope.match(/#[0-9a-f]{6}/gi) || []).map(h => h.toLowerCase()))];
const offPalette = allHex.filter(h => !allowedHex.has(h));
const colorIsCoolBlue = (hex) => {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return b > r && (b - r) > 12; // cool-tone: blue dominates red
};
const coolBlues = offPalette.filter(colorIsCoolBlue);

for (const ap of antipatterns) {
  if (ap.hexOnly) continue;
  const m = html.match(ap.re);
  if (m) {
    console.log(`  ${c('red','✗')} ${ap.name}: ${m[0].slice(0, 60)}…`);
    add('error', `Anti-pattern: ${ap.name}`);
  } else {
    console.log(`  ${c('green','✓')} no ${ap.name}`);
  }
}
if (coolBlues.length > 0) {
  console.log(`  ${c('red','✗')} cool blue-gray tones: ${coolBlues.slice(0,3).join(', ')}`);
  add('error', `Cool blue-gray tones detected: ${coolBlues.join(', ')}`);
} else {
  console.log(`  ${c('green','✓')} no cool blue-gray tones (off-palette hexes scanned: ${offPalette.length})`);
}
// Specific check: pure-white background
if (/background\s*:\s*#fff(?![\da-f])|background\s*:\s*white/i.test(html)) {
  console.log(`  ${c('red','✗')} pure white background detected (must be parchment)`);
  add('error', 'Pure white background detected');
} else {
  console.log(`  ${c('green','✓')} no pure white background`);
}
// Specific check: multi-color badges (red/green priority tags)
if (/act-priority\s+high[^}]*background\s*:\s*#(?![0-9a-f]{6})|background\s*:\s*#c0392b|background\s*:\s*#27ae60/i.test(html)) {
  console.log(`  ${c('red','✗')} multi-color priority badge detected (brand ramp only)`);
  add('error', 'Multi-color priority badge detected');
} else {
  console.log(`  ${c('green','✓')} priority badges use brand ramp only`);
}

// ───────────────────────────────────────────────────────────────
// 5. Mermaid coverage
// ───────────────────────────────────────────────────────────────
section('5. Mermaid coverage');
const mermaidCount = (html.match(/<div class=["']diagram-wrap["']/g) || []).length;
console.log(`  ${c('dim',`${mermaidCount} diagram-wrap blocks`)}`);
if (mermaidCount === 0) {
  console.log(`  ${c('yellow','⚠')}  no diagrams rendered`);
  add('warn', 'No diagrams rendered');
}
if (strict && chapterCount > 0 && mermaidCount < chapterCount) {
  console.log(`  ${c('red','✗')} strict mode: ${chapterCount} chapters but only ${mermaidCount} diagrams`);
  add('error', `Strict mode: ${chapterCount - mermaidCount} chapters lack a diagram`);
}

// ───────────────────────────────────────────────────────────────
// 6. XY chart silent-failure detection
// ───────────────────────────────────────────────────────────────
section('6. XY chart integrity');
// Detect any xychart SVG: presence of `data-xychart-colors` attribute (set by
// beautiful-mermaid) is a reliable marker of an xychart SVG, vs graph/SVG.
const xychartSvgs = (html.match(/<svg[^>]*data-xychart-colors="\d+"[^>]*>/g) || []).length;
const xychartLinePaths = (html.match(/<path[^>]*class="xychart-line [^"]/g) || []).length;
const xychartBarPaths  = (html.match(/<path[^>]*class="xychart-bar [^"]/g) || []).length;
const xychartSeriesCount = xychartLinePaths + xychartBarPaths;
console.log(`  ${c('dim',`${xychartSvgs} xychart SVG(s), ${xychartLinePaths} line path(s), ${xychartBarPaths} bar path(s)`)}`);
if (xychartSvgs > 0 && xychartSeriesCount === 0) {
  // xychart rendered axes + grid but no data series — the classic
  // "line \"label\" [...]" or "rect" silent-failure mode.
  console.log(`  ${c('red','✗')} ${xychartSvgs} xychart SVG(s) have NO data series — likely silent parser failure`);
  console.log(`  ${c('dim','    Common cause: `line \"label\" [..]` or `rect \"region\" [..]` — not supported by beautiful-mermaid.')}`);
  console.log(`  ${c('dim','    See references/diagrams.md §3.2 for the supported grammar.')}`);
  add('error', `XY chart silent failure: ${xychartSvgs} xychart(s) rendered without any line/bar series`);
}
if (xychartSvgs === 0) {
  console.log(`  ${c('dim','no xychart blocks present')}`);
}

// ───────────────────────────────────────────────────────────────
// 7. Code blocks & overview-diagram authoring hints
// ───────────────────────────────────────────────────────────────
section('7. Code blocks & overview diagram');
const codeBlockCount = (html.match(/<div class=["']code-block["']/g) || []).length;
console.log(`  ${c('dim',`${codeBlockCount} code-block card(s)`)}`);

// Heuristic: if the report rendered at least one chapter but ZERO code-blocks
// AND the chapter content contains literal triple-backtick fragments inside
// the HTML (e.g. a stray ``` that did not get fenced), warn loudly.
if (codeBlockCount === 0 && /```[a-zA-Z0-9+_-]*\n/.test(html)) {
  console.log(`  ${c('yellow','⚠')}  literal triple-backtick fragments found in HTML but no .code-block cards rendered`);
  console.log(`  ${c('dim','    Likely cause: renderMarkdown was bypassed (e.g. content was escaped earlier) and the fences were not stripped.')}`);
  add('warn', 'Triple-backtick fragments present in HTML but no code-block cards — fences were not processed.');
}

// Overview-diagram complexity heuristic: an LR diagram with many nodes or
// many back-edges tends to render cramped in beautiful-mermaid's ELK layered
// layout. We can't read the original JSON here, but we CAN estimate from
// the rendered SVG (number of <g class="node"> and <polyline class="edge">).
function countOverviewComplexity(html) {
  const overviewIdx = html.indexOf('核心结论');
  if (overviewIdx < 0) return { nodes: 0, edges: 0 };
  // Find the first diagram-wrap AFTER the conclusions heading; that's the overview.
  const wrapStart = html.indexOf('<div class="diagram-wrap"', overviewIdx);
  if (wrapStart < 0) return { nodes: 0, edges: 0 };
  const wrapEnd = html.indexOf('</div>', wrapStart);
  const slice = html.slice(wrapStart, wrapEnd);
  // Skip subsequent diagrams inside chapters (each <div class="diagram-wrap"> opens a new scope).
  const firstWrapEnd = slice.indexOf('</div>');
  const overviewSvg = slice.slice(0, firstWrapEnd < 0 ? slice.length : firstWrapEnd);
  const nodes = (overviewSvg.match(/<g class="node"/g) || []).length;
  const edges = (overviewSvg.match(/<polyline class="edge"/g) || []).length;
  return { nodes, edges };
}
const overviewStats = countOverviewComplexity(html);
if (overviewStats.nodes > 0) {
  console.log(`  ${c('dim',`overview diagram: ${overviewStats.nodes} node(s), ${overviewStats.edges} edge(s)`)}`);
  // 8 nodes / 8 edges with bidirectional traffic is the visual threshold
  // where beautiful-mermaid's ELK layered layout starts to feel crowded in
  // the overview (rendered at the very top of every report).
  if (overviewStats.nodes > 7 || overviewStats.edges > 8) {
    console.log(`  ${c('yellow','⚠')}  overview diagram is dense (${overviewStats.nodes} nodes / ${overviewStats.edges} edges)`);
    console.log(`  ${c('dim','    Consider splitting into 2 chapter diagrams, or use subgraph groups. See SKILL.md → Overview diagram authoring tips.')}`);
    add('warn', `Overview diagram is dense (${overviewStats.nodes} nodes / ${overviewStats.edges} edges) — may render cramped.`);
    add('info', `see SKILL.md → 'Overview diagram authoring tips'`);
  } else {
    console.log(`  ${c('green','✓')} overview diagram complexity is within comfortable limits`);
  }
} else {
  console.log(`  ${c('dim','no overview diagram to inspect')}`);
}

// ───────────────────────────────────────────────────────────────
// Summary
// ───────────────────────────────────────────────────────────────
console.log(`\n${c('bold', 'Summary')}`);
console.log(`  Report: ${reportPath}`);
console.log(`  Size:   ${(html.length / 1024).toFixed(1)} KB`);
console.log(`  ${c('red', `fatal:    ${findings.fatal.length}`)}`);
console.log(`  ${c('red', `errors:   ${findings.error.length}`)}`);
console.log(`  ${c('yellow',`warnings: ${findings.warn.length}`)}`);

const exitCode =
  findings.fatal.length > 0 ? 1 :
  findings.error.length > 0 ? 2 :
  0;
if (exitCode !== 0) {
  console.log(`\n${c('bold', 'Findings:')}`);
  for (const f of [...findings.fatal, ...findings.error]) console.log(`  ${c('red','•')} ${f}`);
  for (const f of findings.warn) console.log(`  ${c('yellow','•')} ${f}`);
}
console.log(exitCode === 0 ? `\n${c('green', '✓ Report passes verification.')}` : `\n${exitCode === 1 ? c('red', '✗ Report has fatal structural errors.') : c('red', '✗ Report has design-token / anti-pattern violations.')}`);
process.exit(exitCode);
