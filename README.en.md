# Inkwell

[![skills.sh](https://skills.sh/b/Yunkou/inkwell)](https://skills.sh/Yunkou/inkwell)

> Editorial report generator for AI agents. Turns messy conversation threads into polished, readable HTML reports — the kind you'd actually want to share with your team.

**Inkwell** is an AI agent skill that transforms research sessions, multi-turn conversations, and code analysis into structured HTML reports. Pyramid Principle methodology, beautiful-mermaid diagrams, a summary card rendered by takumi, and an editorial design system inspired by Kami. The output is a single self-contained HTML file — no server, no build step, no CDN dependencies. Open it anywhere.

[中文说明](README.md)

## Why Inkwell

AI chat output is a wall of text. Markdown dumps are long, flat, and visually exhausting. Humans process diagrams faster than paragraphs.

Inkwell turns raw conversation into:

- **Pyramid Principle** — conclusion first, then supporting evidence
- **Diagrams everywhere** — at least one mermaid diagram per chapter (flowcharts, sequence diagrams, state machines, XY charts)
- **Editorial typography** — serif-led hierarchy, single ink-blue accent, warm-parchment canvas, LXGW WenKai kaiti for CJK
- **Self-contained HTML** — zero external dependencies, works offline, 80–150 KB
- **Summary info card** — a takumi-rendered 1200×630 PNG at the bottom, four-zone layout

## Six Use Cases

### 1. Research Debrief

Spent 90 minutes researching with AI. Instead of scrolling through 200 messages, generate a report with key findings, evidence, and a summary diagram. Share as a standalone HTML file.

> *"What did we learn about the vector database landscape?"* → Structured report with comparison charts.

### 2. Codebase Architecture Review

After AI explores a new codebase — tracing data flows, mapping modules, identifying patterns — inkwell produces a visual architecture document with mermaid diagrams.

> *"Explore this monorepo and explain the auth system."* → Architecture report with sequence diagrams.

### 3. Weekly Investment Briefing

A workflow pulls market data, financials, and news via MCP tools. Raw output is 700+ lines of markdown. Inkwell structures it into a professional briefing with sector chapters, overview diagrams, and a summary card.

> *"Generate the weekly AI supply chain report."* → 5-chapter editorial report with allocation charts.

### 4. Incident Post-Mortem

After debugging a production incident, the timeline, root cause, fixes, and prevention steps are scattered. Inkwell produces a clean post-mortem with a timeline diagram and priority-labeled action items.

> *"What caused the outage and what did we do?"* → Post-mortem with sequence diagram.

### 5. Technical Decision Record

Debating architectural choices — comparing frameworks, evaluating trade-offs. Inkwell extracts decision factors into a document with comparison tables, decision-tree diagrams, and clear recommendations.

> *"PostgreSQL vs ClickHouse for our analytics pipeline?"* → Decision record with comparison matrix.

### 6. Study Notes

After a deep-dive learning session, dense Q&A becomes well-organized notes: concept maps, topic breakdowns, key takeaways, and a summary card for quick review.

> *"Teach me how B+ trees work."* → Structured notes with tree-structure diagrams.

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- An AI agent with skills support (Claude Code, Codex, Cursor, etc.)

### Install

```bash
# Via skills CLI (recommended)
npx skills add Yunkou/inkwell

# Or clone directly
git clone https://github.com/Yunkou/inkwell.git
cd inkwell && npm install
```

### Use

Tell your AI agent:

```
Generate a report from our conversation.
```

The agent will:
1. Analyze the conversation and structure it into JSON (Pyramid Principle)
2. Render mermaid diagrams as inline SVG
3. Generate a takumi summary card PNG
4. Output a single self-contained `report.html`
5. Open it in your browser

Or invoke directly:

```
/inkwell: generate a report from our conversation
```

## Agent Setup

### Claude Code / Codex / Cursor / Copilot / Windsurf / Gemini CLI / Trae

```bash
npx skills add Yunkou/inkwell
```

The skill auto-registers. Supported agents include Claude Code, Codex, Cursor, GitHub Copilot, Windsurf, Gemini CLI, Trae, Cline, and 25+ more.

### CLI-only (no agent)

```bash
node scripts/generate-report.mjs input.json report.html
open report.html
```

JSON schema: [SKILL.md](SKILL.md).

## How It Works

```
Conversation Context → AI Structuring (JSON) → Node.js Generator → report.html → Browser
```

## Report Structure

| Section | Content | Diagram |
|---------|---------|---------|
| **Cover** | Title, tags, summary, date, author | — |
| **Key Findings** | 3–5 numbered conclusions | 1 overview |
| **Chapters** | Thesis card + body + diagrams | ≥1 each |
| **Actions** | Priority table (P0/P1/P2) | — |
| **Summary Card** | takumi PNG (1200×630) | Base64 inline |

Brief content auto-collapses into flexible mode.

## Design System

- **Palette**: parchment (`#f5f4ed`), ink-blue (`#1B365D`), warm grays
- **Typography**: LXGW WenKai for CJK, Charter/Georgia for English, 400/500 weight only
- **Layout**: 1080px max-width, 88px/64px editorial padding
- **Anti-patterns**: side-stripe borders, gradient text, glassmorphism, AI-cream, cool grays

Full reference: [references/design-tokens.md](references/design-tokens.md)

## Tech Stack

| Library | Role |
|---------|------|
| [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid) | Mermaid → SVG |
| [takumi-js](https://github.com/kane50613/takumi) | Summary card PNG |
| `subset-font` | Font subsetting |
| LXGW WenKai | Bundled CJK kaiti (SIL OFL) |

## License

MIT
