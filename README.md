# Inkwell

[![skills.sh](https://skills.sh/b/Yunkou/inkwell)](https://skills.sh/Yunkou/inkwell)

> Editorial report generator for AI agents. Turns messy conversation threads into polished, readable HTML reports — the kind you'd actually want to share with your team.

**Inkwell** is a Claude Code skill that transforms AI research sessions, multi-turn conversations, and code analysis into structured HTML reports. Pyramid Principle methodology, beautiful-mermaid diagrams, a summary card rendered by takumi, and an editorial design system inspired by Kami. The output is a single self-contained HTML file — no server, no build step, no CDN dependencies. Open it anywhere.

## Why Inkwell?

AI chat output is a wall of text. Markdown dumps are long, flat, and visually exhausting. Humans process diagrams faster than paragraphs.

Inkwell turns raw conversation into a structured report with:

- **Pyramid Principle structure** — conclusion first, then supporting evidence
- **Diagrams everywhere** — at least one mermaid diagram per chapter (flowcharts, sequence diagrams, state machines, XY charts)
- **Editorial typography** — serif-led hierarchy, single ink-blue accent, warm-parchment canvas
- **Self-contained HTML** — zero external dependencies, works offline, 80–150 KB
- **Summary card** — a takumi-rendered PNG info card at the bottom with the key takeaways

## Six Use Cases

### 1. Research Debrief

You just spent 90 minutes with an AI agent researching a topic. Instead of scrolling through 200 messages, generate a report with the key findings, supporting evidence, and a summary diagram. Share it with your team as a standalone HTML file.

> *"What did we learn about the competitive landscape for vector databases?"* → Structured report with comparison charts.

### 2. Codebase Architecture Review

After an AI agent explores a new codebase — tracing data flows, mapping module boundaries, identifying patterns — the output is a wall of bullet points. Inkwell turns that into a visual architecture document with mermaid diagrams showing relationships, call graphs, and dependency maps.

> *"Explore this monorepo and explain how the auth system works."* → Architecture report with sequence diagrams.

### 3. Weekly Investment / Market Briefing

You run a weekly research workflow that pulls market data, financials, and news via MCP tools. The raw output is 700+ lines of markdown. Inkwell structures it into a professional briefing: cover with key metrics, chapters per sector, overview diagrams, and a takumi summary card you can screenshot for social media.

> *"Generate the weekly AI supply chain investment report."* → 5-chapter editorial report with portfolio allocation charts.

### 4. Incident Post-Mortem

After debugging a production incident with an AI agent, the timeline, root cause, fixes, and prevention steps are scattered across the conversation. Inkwell produces a clean post-mortem: timeline diagram, root cause analysis, action items with priority labels, ready to share with stakeholders.

> *"What caused the outage and what did we do?"* → Post-mortem with timeline sequence diagram.

### 5. Technical Decision Record

When you debate architectural choices with an AI agent — comparing frameworks, evaluating trade-offs, weighing pros and cons — the conversation is full of insights buried in paragraphs. Inkwell extracts the key decision factors into a structured document with comparison tables, decision-tree diagrams, and clear recommendations.

> *"Should we migrate from PostgreSQL to ClickHouse for our analytics pipeline?"* → Decision record with comparison matrix and flowchart.

### 6. Learning Pathway / Study Notes

After a deep-dive learning session where an AI agent teaches you a new domain, the Q&A is dense and unstructured. Inkwell turns it into well-organized study notes: concept maps, topic breakdowns per chapter, key takeaways with examples, and a summary card for quick review.

> *"Teach me how B+ trees work and why databases use them."* → Structured learning notes with tree-structure diagrams.

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- An AI agent that supports skills (Claude Code, Codex, Cursor, etc.)

### Installation

```bash
# Install via skills CLI (recommended)
npx skills add Yunkou/inkwell

# Or clone directly
git clone https://github.com/Yunkou/inkwell.git
cd inkwell && npm install
```

### Usage

Just ask your AI agent to generate a report:

```
Generate a report from our conversation about [topic].
```

The agent will:
1. Analyze the conversation and structure it into JSON (Pyramid Principle)
2. Render mermaid diagrams as inline SVG
3. Generate a takumi summary card PNG
4. Output a single self-contained `report.html`
5. Open it in your browser

Or invoke the skill directly:

```
/inkwell: generate a report from our conversation
```

## Agent Setup

### Claude Code

The skill auto-registers when cloned to `~/.claude/skills/` or installed via `npx skills add Yunkou/inkwell`. Invoke with `/inkwell` or just say "generate a report."

```bash
npx skills add Yunkou/inkwell
```

### Codex (OpenAI)

Place the skill in your Codex skills directory. Codex reads the SKILL.md frontmatter and workflows automatically.

```bash
git clone https://github.com/Yunkou/inkwell.git ~/.codex/skills/inkwell
cd ~/.codex/skills/inkwell && npm install
```

In Codex, the skill triggers when you mention "generate report", "make a report", or "summarize this" in context of research output.

### Cursor

Cursor supports skills via its `.cursor/skills/` directory. The SKILL.md format is compatible.

```bash
git clone https://github.com/Yunkou/inkwell.git .cursor/skills/inkwell
cd .cursor/skills/inkwell && npm install
```

In Cursor, use `@inkwell` to invoke the skill, or describe the report you want in the chat.

### GitHub Copilot

Copilot supports skills through its agentic chat features. Install via the skills CLI:

```bash
npx skills add Yunkou/inkwell
```

The skill will be available in Copilot's agent mode. Ask it to "generate a report" and it will invoke Inkwell.

### Windsurf

```bash
git clone https://github.com/Yunkou/inkwell.git ~/.windsurf/skills/inkwell
cd ~/.windsurf/skills/inkwell && npm install
```

### CLI-only (no agent)

Inkwell can be used directly as a CLI tool without any AI agent. Pass a JSON file to the generator:

```bash
node scripts/generate-report.mjs input.json report.html
open report.html
```

The JSON schema is documented in [SKILL.md](SKILL.md).

## How It Works

```
Conversation Context
      │
      ▼
┌─────────────────────┐
│  AI Structuring      │  AI agent analyzes conversation
│  (in-agent prompt)   │  Output: structured JSON (Pyramid Principle)
└────────┬────────────┘
         │  JSON
         ▼
┌─────────────────────┐
│  Node.js Generator   │  renderMermaidSVG() → inline SVG
│  generate-report.mjs │  takumi Renderer + CJK font → summary PNG
│                      │  Kami editorial CSS (inline)
└────────┬────────────┘
         │  report.html (self-contained)
         ▼
┌─────────────────────┐
│  Browser             │  Zero deps. Works offline.
│                      │  80–150 KB. Shareable.
└─────────────────────┘
```

## Report Structure

| Section | Content | Diagram |
|---------|---------|---------|
| **Cover** | Title, tags, summary, date, author | — |
| **Key Findings** | 3–5 numbered conclusions | 1 overview diagram |
| **Chapters** | Thesis card + body + diagrams each | ≥1 per chapter |
| **Actions** | Priority-ordered table (P0/P1/P2) | — |
| **Summary Card** | takumi PNG info card (1200×630) | Embedded as base64 |

Content that's too brief auto-collapses into flexible mode — fewer chapters, merged sections.

## Design System

Inkwell uses a refined editorial design language:

- **Palette**: warm parchment (`#f5f4ed`), single ink-blue accent (`#1B365D`), warm-toned grays
- **Typography**: LXGW WenKai (kaiti) for CJK, Charter/Georgia for English, serif-led hierarchy at 400/500 weight only
- **Spacing**: 1080px max-width, 88px/64px editorial padding
- **Components**: numbered section openers, Thesis boxes, 4-zone summary info cards
- **Anti-patterns banned**: side-stripe borders, gradient text, glassmorphism, AI-default cream backgrounds, cool grays

Full design tokens and rules: [references/design-tokens.md](references/design-tokens.md)

## Tech Stack

| Library | Role |
|---------|------|
| [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid) | Mermaid → SVG rendering |
| [takumi-js](https://github.com/kane50613/takumi) | Summary card PNG generation |
| `subset-font` | Font subsetting (LXGW WenKai → 100–200 KB inlined) |
| LXGW WenKai | Bundled CJK kaiti font (SIL OFL) |

## File Structure

```
inkwell/
├── SKILL.md                        # Agent entry point
├── README.md                       # You are here
├── package.json                    # Node dependencies
├── fonts/
│   ├── LXGWWenKai-Regular.woff2    # Bundled CJK font (SIL OFL)
│   └── README.md
├── references/
│   └── design-tokens.md            # Editorial design system reference
└── scripts/
    └── generate-report.mjs         # JSON → HTML generator (self-contained)
```

## Contributing

Issues and PRs welcome. The generator script is a single ESM file — easy to hack on.

## License

MIT
