---
name: inkwell
description: Generate polished, editorial-style HTML reports from AI conversations using Pyramid Principle, beautiful-mermaid diagrams, LXGW WenKai kaiti font, and editorial typography. Output is a self-contained, single-file HTML with serif-led hierarchy, ink-blue accent, and warm-parchment canvas.
disable-model-invocation: false
---

# Report Skill

Turn any AI conversation or research session into a polished, editorial-style HTML report. Editorial typography, single ink-blue accent, warm-parchment canvas, every section a numbered editorial spread.

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
    "author": "可选，作者署名",
    "source": "可选，来源标注",
    "tags": ["标签1", "标签2"]
  },
  "conclusions": [
    { "point": "核心结论", "detail": "支撑细节说明" }
  ],
  "overview_diagram": "mermaid diagram code (optional, for overview)",
  "chapters": [
    {
      "title": "章节标题",
      "conclusion": "本章核心结论（一句话，作为 Thesis 卡片）",
      "content": "详细内容（支持 markdown: # ## ### - > ** ` ` |）",
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

**XY chart (`xychart-beta`) is a first-class citizen in this skill** — use it for any
time-series, ranking, or category-vs-number comparison. However, `beautiful-mermaid`
parses a **stricter subset** of Mermaid's xychart grammar than the official Mermaid CLI.
Lines that are not recognized are **silently dropped** (the chart renders with axes
and grid but no data). Two specific gotchas to avoid:

- `line "label" [...]` — the parser only matches `line [...]`; the quoted label
  causes the whole line to be ignored. Drop the label (hover tooltips come for free).
- `rect "region" [x1, y1, x2, y2]` — `rect` is not a recognized keyword. To shade
  a region, use a second `line` with constant values, or split into separate charts,
  or annotate with prose.

For the full grammar, the silent-failure catalogue, and copy-pasteable templates
(see **Simple Bar Chart**, **Line Chart**, **Bar + Line Overlay**, **Horizontal Bars**,
**Multiple Bar Series**, **Dual Lines**, **Categorical X-Axis**, **Numeric X-Axis**),
read `references/diagrams.md`. The "Pre-flight Checklist" at the end of that file
should be run mentally before generating a report.

**Markdown in chapter content:**
- `## ` → 18px H3 (sub-section, 章节内小标题)
- `### ` → 18px H3 (alternative form)
- `# ` → 15px olive H4 (sub-sub)
- `- ` → 列表项
- `> ` → blockquote（带 brand 左边线）
- `| col | col | ` → 自动 data-table 渲染

**Flexible mode:** If the content is short (1-2 points, no clear chapter structure), collapse to fewer chapters and merge sections as needed.

### Step 3: Install dependencies (one-shot, idempotent)

Resolve the skill directory and run the bundled installer. The install script auto-detects its location (the parent of `scripts/`), so you do not need to hard-code paths:

```bash
# Auto-detect: prefers an inkwell directory it can find next to known install roots;
# falls back to the directory of this SKILL.md if it lives in scripts/-less copy.
SKILL_DIR=""
for cand in "$HOME/.codex/skills/inkwell" "$HOME/.claude/skills/inkwell" "$(pwd)" /usr/local/share/codex/skills/inkwell; do
  if [ -f "$cand/scripts/install.sh" ]; then SKILL_DIR="$cand"; break; fi
done
: "${SKILL_DIR:=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)}"

bash "$SKILL_DIR/scripts/install.sh"
```

If you already know the install path (most users do), you can set it directly:

```bash
SKILL_DIR="/path/to/inkwell"   # e.g. ~/.codex/skills/inkwell, or /Users/coco/Project/04-report-skill
bash "$SKILL_DIR/scripts/install.sh"
```

The installer detects the location, runs `npm install` if needed, checks for `fonts/LXGWWenKai-Regular.woff2`, lists every resource the skill needs, and prints a final report. Re-run it safely any time.

> ⚠ If `bash scripts/install.sh` reports "scripts/ missing", you have a partial install — `skill-installer` only copies `SKILL.md` by default. Fix by re-installing with the full repo:
>
> ```bash
> # One of these (whichever your host supports):
> npx skills add Yunkou/inkwell
> git clone https://github.com/Yunkou/inkwell.git "$HOME/.codex/skills/inkwell"
> ```

### Step 4: Write JSON and generate report

Write the JSON to a temp file, then run the generator:

```bash
# Write JSON to temp file
cat > /tmp/report-input.json << 'JSONEOF'
<the structured JSON>
JSONEOF

# Generate the report (uses $SKILL_DIR set in Step 3)
node "$SKILL_DIR/scripts/generate-report.mjs" /tmp/report-input.json /tmp/report.html
```

The generator automatically:
- Subset the bundled LXGW WenKai font to the chars used in your report (100-200 KB inlined)
- Renders diagrams via beautiful-mermaid
- Renders the summary card as a takumi PNG with the same font

### Step 5: Verify (recommended)

Run the static verifier before opening the report. It catches structural defects, missing editorial anchors, anti-pattern violations, and design-token drift:

```bash
node "$SKILL_DIR/scripts/verify-report.mjs" /tmp/report.html --strict
```

Exit codes:

| Code | Meaning |
|------|---------|
| 0    | All checks pass (warnings allowed) |
| 1    | Fatal structural error (unbalanced tags, missing DOCTYPE) |
| 2    | Design-token violation or anti-pattern detected |

Re-run the generator (Step 4) if verification fails. Do **not** open a failing report for the user.

### Step 6: Open the report

```bash
open /tmp/report.html
```

Tell the user: "报告已生成并打开。包含 X 个章节、Y 张图表、Z 个结论。" (Use counts from the verifier's `Summary` section.)

## Design Language (Editorial)

### Section Architecture

Every report follows a numbered editorial pattern (auto-numbered by the generator):

| # | Section | Purpose |
|---|---------|---------|
| 01 | Key Findings · 核心结论 | 3-5 numbered conclusions, large brand-blue counter |
| 02–N | Context / Analysis / Findings / Synthesis / Outlook / Case Study / Deep Dive | Chapters with `Thesis` lead box |
| N+1 | Next Steps · 行动建议 | Priority-ordered table (P0/P1/P2) |
| N+2 | Summary Card · 结论摘要 | takumi-generated info card (4 zones: header / hero+metrics / insights / footer) |

### Summary Card (Info Card Design)

The bottom summary card is a 1200x630 PNG generated by takumi, structured as a 4-zone info card:

| Zone | Content | Style |
|------|---------|-------|
| **Top eyebrow** | `● REPORT SUMMARY` + meta line (date · author · source) | 12px sans, brand dot, hairline divider below |
| **Hero + Metrics** | 42px title (regular 400) + tagline on left, 2x2 metrics grid on right (Chapters / Conclusions / Diagrams / Actions) | serif hero at regular weight (avoids takumi bold-rendering artifacts), ivory metric cards with brand-blue numerals |
| **Key Insights** | 4 bullet points (2 columns), each with brand bar prefix | 18px dark-warm, 1.5px brand bar |
| **Footer** | `Editorial Report` + date | 11px stone, hairline above |

### Visual Rules

- **Section opener pattern**: `01 · Key Findings` eyebrow (12px sans, brand color, uppercase, letter-spacing 0.4px) + 32px serif section title + 1px hairline rule. Never use a left bar or border.
- **Numbered conclusions**: counter-based `01`, `02`, `03` in 28px brand-blue serif as a fixed-width left column. Body to the right with serif h3 + olive p.
- **Chapter Thesis box**: ivory background, 6px radius, blue `THESIS` uppercase eyebrow on top, single-sentence conclusion below.
- **Hero**: 12px eyebrow with 6px brand-blue dot + 64px serif title + 20px olive tagline + meta row (date · author · source) + tag pills.
- **Single ink-blue accent (#1B365D)**: never introduce a second chromatic color. No green/red badges, no warm orange. High/medium/low priorities all use the same blue→olive→stone ramp.
- **Container**: `max-width: 1080px; padding: 88px 64px 120px`. Generous, like editorial landing pages.
- **All grays warm-toned**. No cool blue-grays. Rule of thumb: R ≈ G > B.
- **CJK letter-spacing**: 0.35px on body in zh-CN. EN has 0. Body letter-spacing makes Chinese breathe.
- **CJK font**: LXGW WenKai 霞鹜文楷 (kaiti, screen-optimized, SIL OFL), bundled in `fonts/`, auto-subset per report.
- **Font-variant-numeric: tabular-nums** for all numbers, dates, percentages.
- **Tags**: `background: #EEF2F7; color: #1B365D; font-weight: 500; border-radius: 2px; padding: 2px 7px`. NOT Bootstrap's chunky 6px radius uppercase 600 weight.
- **No italic, no bold > 500 in serif**. Headings 500, body 400. Design philosophy: no synthetic bold.
- **Whisper shadow only**: `0 4px 24px rgba(0,0,0,0.04)` on summary card. No hard drop shadows.
- **Print-friendly**: A4 with 14mm × 16mm margins, color-adjust exact, breaks inside sections avoided.
- **Page entry animation**: `fadeIn 0.4s ease-out` on `.page`. (CSS only — headless screenshot tools need `--virtual-time-budget >= 500` to capture final state.)

### Component Patterns

| Need | Use |
|------|-----|
| Major section open | `.section-head` with `.section-num` + `.section-title` + `.rule` |
| Conclusion list | `.conclusion-item` with `.conclusion-num` + `.conclusion-body` |
| Chapter thesis | `.chapter-lead` (ivory box with `THESIS` label) |
| Actions | `.actions-table` (110px priority column + body) |
| Data tables | `table.data-table` (markdown `|` syntax auto-rendered, 11px uppercase sans header) |
| Diagrams | `.diagram-wrap` (ivory bg, 8px radius, 28px padding) |
| Summary card | `.summary-card-fallback` (12px radius, 56px padding, brand-bar bullets, sc-foot metadata row) |
| Inline code | `code.ic` (brand-tint bg, 2px radius, mono) |
| Quote | `blockquote.bq` (2px brand left border) |

### Anti-Patterns (what NOT to do)

- Left stripe on section titles (`border-left: 3px solid var(--brand)` on h2)
- Bold > 500 on serif text (`font-weight: 700`)
- Hard drop shadows (`box-shadow: 0 4px 8px rgba(0,0,0,0.25)`)
- Multi-color badges (red/green/yellow priority tags)
- Centered hero titles (left-align with eyebrow dot above)
- Pure white background (must be `var(--parchment)` #f5f4ed)
- Generic sans hero (must be serif 64px+)
- Italic in headings
- Cool blue-gray tones
- Centered summary card content (Editorial layouts keep things left-aligned with hierarchy)
- Single-paragraph summary (use the 4-zone info card structure)


## Location

This skill ships as a multi-file directory. The skill installation workflow depends on how the host installs it:

| Installer | What you get | What you must do |
|-----------|--------------|------------------|
| `npx skills add Yunkou/inkwell` | Full repo (`SKILL.md` + `scripts/` + `fonts/` + `references/`) | None — run `scripts/install.sh` |
| `git clone https://github.com/Yunkou/inkwell.git <dest>` | Full repo | None — run `scripts/install.sh` |
| `codex skill-installer` with `--path SKILL.md` | Only `SKILL.md` (no resources) | Re-clone the full repo, then `scripts/install.sh` |
| Direct file copy of `SKILL.md` | Only `SKILL.md` (no resources) | Re-clone the full repo, then `scripts/install.sh` |

The agent resolves the skill root via `$SKILL_DIR` (set in Step 3). All `scripts/`, `fonts/`, and `references/` references resolve relative to it.

## Bundled Font

The skill ships with `fonts/LXGWWenKai-Regular.woff2` (霞鹜文楷, SIL OFL). The generator subsets this to the chars actually used in your report and inlines it as base64 inside the generated HTML. This keeps reports self-contained and consistent across platforms.

See `fonts/README.md` for details and how to swap to a different font.

## CJK Font Fallback

If the bundled font is missing, the generator falls back to system CJK fonts (Songti SC on macOS, Noto Sans CJK on Linux, Microsoft YaHei on Windows). The summary card PNG also uses this fallback chain.

## Design Reference

See `references/design-tokens.md` for the full design tokens, colors, typography, and beautiful-mermaid theme mapping.

## Dependencies

- Node.js ≥ 18
- `npm install` (run once in this directory)
  - `beautiful-mermaid` — diagram SVG generation
  - `subset-font` — per-report font subsetting
  - `takumi-js` — summary card PNG generation
