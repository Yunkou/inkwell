---
name: report-skill
description: Generate polished HTML reports from AI conversations using Pyramid Principle, beautiful-mermaid diagrams, and Kami design system.
disable-model-invocation: false
---

# Report Skill

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
      "content": "详细内容（支持 markdown: # ## ### - > ** ** ` `）",
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
cd <project-directory> && node scripts/generate-report.mjs /tmp/report-input.json /tmp/report.html
```

Replace `<project-directory>` with the path to this skill's directory.

### Step 4: Open the report

```bash
open /tmp/report.html
```

Tell the user: "报告已生成并打开。包含 X 个章节、Y 张图表。点击底部按钮可保存总结图。"

## Design Guidelines

### Visual Hierarchy

- **No side-stripe borders.** Never use `border-left: 3px solid` on section titles, conclusion items, or list items. Use numbered markers (brand-colored numerals), hairline horizontal rules, or typographic contrast instead.
- **Editorial section openers.** Each major section opens with an eyebrow label (small uppercase sans, stone color) + serif heading + 0.5px hairline rule. This is the Kami editorial pattern — not a left bar.
- **Numbered conclusions.** Conclusions use CSS counter-based numbers (01, 02, 03...) in brand color, rendered large as visual anchors. This creates clear scan-and-stop points.
- **Chapter leads in ivory boxes.** Each chapter's one-sentence conclusion sits in a subtle ivory box (`background: var(--ivory); border-radius: 6px`), separating it from body content.
- **Typographic drama.** Cover heading at 44px, section headings at 26px, body at 16px. Three-level clear size contrast. Serif carries authority, sans carries utility.
- **Whisper shadow only.** For elevated elements, use `box-shadow: 0 4px 24px rgba(0,0,0,0.04)`. Never hard shadows. Never ring shadow + border combination on the same element.
- **All grays warm-toned.** No cool blue-grays. Every gray has a yellow-brown undertone.

### CJK Font Support

- The generator automatically detects CJK content and loads a system CJK font (Songti SC on macOS, Noto Sans CJK on Linux, Microsoft YaHei on Windows) into takumi for rendering the summary card PNG.
- If no system CJK font is found, falls back to the HTML summary card which renders perfectly in-browser.
- English-only reports use the default Charter/Georgia serif fonts in takumi.

### Component Patterns

| Need | Use |
|------|-----|
| Major section open | `.section-hed` with eyebrow + h2 + `.rule` |
| Conclusion list | `.conclusion-item` with `.conclusion-num` + `.conclusion-body` |
| Chapter thesis | `.chapter-lead` (ivory box, single sentence) |
| Actions | `.actions-table` (2-column table, priority labels) |
| Data tables | `table.data-table` (markdown `|` syntax auto-rendered) |
| Diagrams | `.diagram-wrap` (ivory bg, no border, clean) |
| Summary card | `.summary-card-fallback` (centered, brand bar bullets) |

## Design Reference

See `references/kami-design.md` for the full Kami design system tokens, colors, typography, and beautiful-mermaid theme mapping.

## Dependencies

- Node.js ≥ 18
- `npm install` (run once in this directory)
