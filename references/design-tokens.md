# Editorial Design Tokens — Quick Reference

> A warm-parchment editorial design system: serif-led hierarchy, single ink-blue accent, generous whitespace. The skill generator inlines these tokens into every report.

## Colors

| Token | Hex | Role |
|-------|-----|------|
| `--parchment` | `#f5f4ed` | Page background (never pure white) |
| `--ivory` | `#faf9f5` | Card / container surface |
| `--warm-sand` | `#e8e6dc` | Button default / interactive surface |
| `--brand` | `#1B365D` | Ink-blue accent (only chromatic color, ≤5% surface) |
| `--brand-light` | `#2D5A8A` | Links on dark surfaces |
| `--brand-tint` | `#EEF2F7` | Tag background, code chip |
| `--brand-tint-2` | `#E4ECF5` | Brand gradient stop |
| `--brand-tint-3` | `#D6E1EE` | Brand gradient end |
| `--near-black` | `#141413` | Primary text |
| `--dark-warm` | `#3d3d3a` | Secondary text, body |
| `--olive` | `#504e49` | Subtext, captions, lede |
| `--stone` | `#6b6a64` | Tertiary, dates, metadata |
| `--border` | `#e8e6dc` | Section dividers, card borders |
| `--border-soft` | `#e5e3d8` | Row separators |
| `--ring` | `#e0ddd0` | Button ring / focus ring |

## Typography

- **EN serif**: Charter, Georgia, Palatino, "Times New Roman", serif
- **CN serif**: "TsangerJinKai02", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif
- **Mono**: "JetBrains Mono", "SF Mono", "Fira Code", Consolas, Monaco, monospace
- **UI sans**: -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Helvetica, Arial, sans-serif

## Type Scale (px)

| Role | Size | Weight | Line | Notes |
|------|------|--------|------|-------|
| Hero h1 (cover) | 64 | 500 | 1.05 | EN letter-spacing -0.5px, CJK 0 |
| Section title (`.section-title`) | 32 | 500 | 1.20 | EN -0.3px, CJK 0 |
| H3 in content | 18 | 500 | 1.30 | near-black |
| H4 in content | 15 | 500 | 1.40 | olive |
| Body | 16 | 400 | 1.55 | dark-warm |
| Tagline (`.tagline`) | 20 | 500 | 1.40 | olive |
| Lede (`.lede`) | 16 | 500 | 1.55 | olive |
| Chapter lead (`.chapter-lead`) | 16 | 400 | 1.55 | dark-warm, on ivory |
| Caption / sub | 15 | 400 | 1.55 | olive |
| Section num / Eyebrow | 12 | 500 | 1.35 | sans, brand or stone, uppercase, +0.4-1.2px tracking |
| Label (action priority) | 11 | 500 | 1.35 | sans, uppercase, +0.4-0.8px tracking |
| Conclusion num | 28 | 500 | 1.00 | serif, brand color |
| Tag (`.tag`) | 12 | 500 | 1.35 | sans, +0.4px tracking |

## Spacing Rhythm

| Element | Spacing |
|---------|---------|
| `.page` padding | `88px 64px 120px` (mobile: 48px 20px 64px) |
| Cover bottom margin | 56px |
| Cover padding-bottom | 40px |
| Section margin-bottom | 64px (mobile 48px) |
| Section head margin-bottom | 24px |
| Section rule (hairline) | 1px var(--border-soft) |
| Cover rule (hairline) | 1px var(--border-soft) |
| Conclusion item padding | 22px 0 |
| Chapter lead padding | 18px 22px |
| Diagram wrap padding | 28px 24px (radius 8px) |
| Summary card padding | 56px 48px (radius 12px) |

## Border Radii

| Component | Radius |
|-----------|--------|
| Tag | 2px |
| Code chip | 2px |
| Chapter lead box | 6px |
| Diagram wrap | 8px |
| Summary card | 12px |

## Component Recipes

**Section opener**
```html
<div class="section-head">
  <p class="section-num">01 · Key Findings</p>
  <h2 class="section-title">核心结论</h2>
  <div class="rule"></div>
</div>
```

**Cover hero**
```html
<header class="cover">
  <div class="eyebrow"><span class="dot"></span><span>Research Report</span></div>
  <h1>{title}</h1>
  <p class="tagline">{summary}</p>
  <div class="cover-meta">{date} · {author} · {source}</div>
  <div class="cover-tags">{tag} ...</div>
</header>
```

**Conclusion list item**
```html
<div class="conclusion-item">
  <div class="conclusion-num"></div> <!-- auto-numbered 01/02/03 via CSS counter -->
  <div class="conclusion-body">
    <h3>{point}</h3>
    <p>{detail}</p>
  </div>
</div>
```

**Chapter Thesis**
```html
<div class="chapter-lead">
  <span class="thesis-label">Thesis</span>
  {conclusion}
</div>
```

**Action row**
```html
<tr>
  <td class="act-priority high">P0 · Urgent</td>
  <td class="act-body">
    <strong>{action}</strong>
    <p>{detail}</p>
  </td>
</tr>
```

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

## Animation

```css
@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page { animation: page-fade-in 0.4s ease-out; }
```

The entrance is subtle — 6px lift, 0.4s ease-out. Headless screenshot tools (Puppeteer, Chrome --headless) need `--virtual-time-budget >= 500` to capture the final state.

## Print

```css
@page { size: A4; margin: 14mm 16mm; background: #f5f4ed; }
@media print {
  body, .page { background: var(--parchment); print-color-adjust: exact; }
  .cover, .section-head, .chapter-lead, .diagram-wrap,
  .conclusion-item, .actions-table tr, .summary-card-fallback {
    break-inside: avoid;
  }
}
```

## Key Rules

1. Page bg parchment `#f5f4ed`, never pure white
2. Single accent ink-blue `#1B365D`, no second chromatic color (no red/green priority)
3. All grays warm-toned (yellow-brown undertone, R ≈ G > B)
4. EN: serif for headlines and body. CN: serif for headlines, sans for body
5. Serif weight 400-500, never 700. No synthetic bold.
6. Three line-height bands: tight (1.05-1.20 titles) / reading (1.40-1.55 body) / dense (1.30-1.40)
7. Tag backgrounds solid hex, no rgba (WeasyPrint double-rectangle bug)
8. Shadows: ring (`0 0 0 1px var(--border)`) or whisper (`0 4px 24px rgba(0,0,0,0.04)`) only
9. Section openers are `eyebrow + title + rule`. Never a left bar.
10. Conclusion numbers are large brand-blue serif, left column. Body is the only right column.
11. Chapter lead lives in an ivory box, with `THESIS` eyebrow on top.
12. Container is wide (1080px) with generous vertical padding (88/64/120).
13. CJK body has `letter-spacing: 0.35px` to breathe. EN has 0.
14. Tabular numerals for everything numeric.


## Summary Card (4-Zone Info Card)

The bottom summary card is a 1200×630 PNG, organized as a 4-zone info card:

```
┌──────────────────────────────────────────────────────────────┐
│ ● REPORT SUMMARY                            2026-07-07       │  Eyebrow (12px sans, brand dot, hairline)
├──────────────────────────────────────────────────────────────┤
│  AI 产业链周度投资建议报告            ┌─────┐ ┌─────┐         │  Hero (44px serif)
│                                    │  5  │ │  5  │         │  + tagline
│  覆盖 AI 产业链 134 只标的...        │ CHAP│ │ CONC│         │
│                                    ├─────┤ ├─────┤         │  Metrics (2x2 grid)
│                                    │  6  │ │  6  │         │  (ivory cards, brand numerals)
│                                    │DIAG │ │ ACT │         │
│                                    └─────┘ └─────┘         │
├──────────────────────────────────────────────────────────────┤
│ KEY INSIGHTS                                                  │
│ — AI 板块万亿里程碑后剧烈分化…  — 资金从光模块→AI 服务器…  │  Insights (4 max, 2 columns)
│ — 机器人是本周最强主线…           — Swarm 校验揭示4个问题…  │  18px dark-warm, brand bar
├──────────────────────────────────────────────────────────────┤
│ Editorial Report                          2026-07-07  │  Footer (11px stone)
└──────────────────────────────────────────────────────────────┘
```

Zone measurements (target):
| Zone | Height | Notes |
|------|--------|-------|
| Eyebrow | 36px | brand dot + REPORT SUMMARY, hairline below |
| Hero+Metrics | 200px | flex row, 60/40 split, brand numerals 32px |
| Insights | 220px | 2 columns, 1.5px brand bar prefix |
| Footer | 32px | hairline above, 11px stone |
