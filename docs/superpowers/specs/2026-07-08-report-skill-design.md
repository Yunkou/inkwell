# Report Skill Design Spec

**Date**: 2026-07-08
**Status**: Approved

## Overview

A Claude Code skill (`report-skill`) that generates beautiful, visual-first HTML reports from AI conversation context. Uses the Pyramid Principle methodology, beautiful-mermaid for diagrams, takumi for summary images, and Kami's design system for consistent warm-parchment styling.

## Motivation

AI chat text output is hard to read. Markdown reports are long and visually unappealing. Humans process diagrams faster than text. This skill transforms raw AI conversation content into polished, structured HTML reports that are actually enjoyable to read.

## Architecture

```
User conversation context (Claude Code session)
      │
      ▼
┌─────────────────────────┐
│  Phase 1: AI Structuring │  Claude analyzes conversation
│  (in-skill prompt)       │  Output: structured JSON
│                          │  - core conclusions
│                          │  - chapters with key points
│                          │  - mermaid diagram descriptions
│                          │  - action items
└────────────┬────────────┘
             │  structured JSON (via stdin or temp file)
             ▼
┌─────────────────────────┐
│  Phase 2: Node.js Render │  Script reads JSON
│  (report-generator.js)   │  - beautiful-mermaid → SVG
│                          │  - takumi → summary PNG
│                          │  - embeds all assets inline
│                          │  Output: single report.html
└────────────┬────────────┘
             │  report.html
             ▼
┌─────────────────────────┐
│  Phase 3: Open Browser   │  open report.html
│                          │  User browses, saves summary image
└─────────────────────────┘
```

## Report Structure

### Standard Mode (default)

| Section | Content | Diagram |
|---------|---------|---------|
| **Cover** | Title, date, summary, tags | Optional decorative mermaid |
| **Core Conclusions** | 3-5 top-level Pyramid Principle points | 1 relationship/overview diagram |
| **Chapters** | Each: section conclusion + supporting detail | ≥1 mermaid diagram per chapter |
| **Action Items** | Priority-ordered next steps | Flow diagram |
| **Summary Card** | takumi-generated minimalist conclusion PNG | Save button |

### Flexible Mode (fallback)

When content doesn't fit the standard structure (too brief, too narrow), sections auto-collapse: cover + core conclusions merged, chapters reduced, action items become inline callout.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Input mode | Conversation-driven | Skill captures current Claude Code session context |
| Report structure | Standard, with flexible fallback | Matches Pyramid Principle; degrades gracefully |
| Rendering approach | Pure Node.js, all assets inline | Single self-contained HTML, zero CDN deps, works offline |
| Content structuring | AI (Claude) does semantic analysis | Best quality for varied conversation types |
| Summary image style | Minimalist conclusion card (A) | Title + 3-5 key conclusions, Kami-styled |

## Technology Stack

### beautiful-mermaid
- `renderMermaidSVG(code, theme)` — synchronous SVG generation
- Theme mapped to Kami palette: bg=#f5f4ed, fg=#141413, line=#504e49, accent=#1B365D, muted=#6b6a64, surface=#faf9f5, border=#e8e6dc
- Diagrams supported: flowchart, state, sequence, class, ER, XY chart

### takumi-js
- `render(jsx, { width, height })` → PNG buffer
- Summary card: 1200×630px, Kami-themed with parchment background, ink-blue accent, serif typography
- PNG embedded as base64 data URI in HTML

### Kami Design System
- Colors: parchment #f5f4ed, ink-blue #1B365D, near-black #141413, dark-warm #3d3d3a, olive #504e49, stone #6b6a64
- Typography: Charter/Georgia serif (EN), TsangerJinKai02 serif (CN), sans for UI labels
- Weights: 400 body, 500 headings, no bold (700)
- Spacing: 4px base unit
- Shadows: whisper shadow only (0 4px 24px rgba(0,0,0,0.05)), ring shadow for buttons
- Components: cards, section titles (brand left bar), code blocks, tables, tags, metrics, quotes

## File Structure

```
/Users/coco/.claude/skills/grill-me/
├── SKILL.md                    # Skill entry point (updated)
├── references/
│   └── design.md               # Kami design tokens reference
├── scripts/
│   ├── report-generator.js     # Main HTML report generator
│   └── summary-card.js         # takumi summary card generator
└── templates/
    └── report-template.html    # Base HTML template with inline Kami CSS
```

## Skill Behavior

1. User invokes `/grill-me` (or skill is triggered by context)
2. Claude reads the conversation context and structures it into JSON following Pyramid Principle
3. Claude writes the JSON to a temp file
4. Claude runs `node scripts/report-generator.js <temp-json-file>`
5. Script outputs `report.html` to a temp location
6. Claude runs `open report.html`
7. User views the report in browser, can click save button to download summary PNG

## JSON Schema (AI output)

```json
{
  "meta": {
    "title": "Report Title",
    "date": "2026-07-08",
    "summary": "One-line summary",
    "tags": ["tag1", "tag2"]
  },
  "conclusions": [
    { "point": "Key conclusion 1", "detail": "Supporting detail" }
  ],
  "overview_diagram": "mermaid code for overview diagram",
  "chapters": [
    {
      "title": "Chapter Title",
      "conclusion": "Chapter-level conclusion",
      "content": "Detailed text content (markdown)",
      "diagrams": ["mermaid code 1", "mermaid code 2"]
    }
  ],
  "actions": [
    { "priority": "high|medium|low", "action": "What to do", "detail": "Why and how" }
  ],
  "summary_points": ["Point 1", "Point 2", "Point 3"]
}
```

## Dependencies

- `beautiful-mermaid` (npm) — Mermaid SVG rendering
- `takumi-js` (npm) — Summary image generation
- Node.js ≥ 18

## Non-Goals

- Real-time collaboration or editing
- PDF export (HTML print-to-PDF is sufficient)
- Multi-language reports in v1 (CN-first, EN support via Kami)
- Server-side hosting or sharing URLs

## Edge Cases

- **Empty/short conversation**: Fall back to flexible mode, minimize sections
- **Very long conversation**: AI summarizes first, generates multi-chapter report
- **No diagram-worthy content**: Skip mermaid sections, keep text + summary card
- **takumi fails**: Skip summary card section, report still renders
- **Node.js not installed**: Skill detects and reports error clearly
