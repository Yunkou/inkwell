# Inkwell

[![skills.sh](https://skills.sh/b/Yunkou/inkwell)](https://skills.sh/Yunkou/inkwell)

> 把 AI 对话变成精编 HTML 报告。金字塔结构、图表优先、编辑级排版。生成的单文件 HTML 可以离线打开、直接分享。

**Inkwell** 是一个 AI Agent 技能，把多轮对话、代码调研、研究过程转化为结构化 HTML 报告。方法论是金字塔原理，图表用 beautiful-mermaid 渲染，总结图用 takumi 生成，排版继承 Kami 编辑级设计系统。输出是一个自包含的 HTML 文件——无服务端、无构建、无 CDN 依赖。

[English README](README.en.md)

## 为什么需要 Inkwell

AI 聊天框输出是文字墙。Markdown 又长又平，阅读体验差。人脑处理图表比处理段落快得多。

Inkwell 把原始对话变成：

- **金字塔结构** — 结论先行，以上统下，归类分组，逻辑递进
- **图表优先** — 每章至少一张 mermaid 图（流程图、时序图、状态图、XY 图表）
- **编辑级排版** — 衬线为主、单色墨蓝强调、羊皮纸底色、霞鹜文楷中文
- **自包含 HTML** — 零外部依赖，离线可用，80–150 KB
- **总结信息卡** — 报告底部 takumi 渲染的 1200×630 PNG，四区布局

## 六个应用场景

### 1. 调研复盘

跟 AI 花了 90 分钟调研一个话题，不想翻 200 条消息。一键生成报告：核心结论、支撑论据、总览图。导出 HTML 发给团队。

> *"向量数据库竞争格局调研"* → 带对比图表的精编报告。

### 2. 代码架构审查

让 AI 探索新代码库——追踪数据流、梳理模块边界、识别设计模式。输出不再是散乱的要点列表，而是带 mermaid 架构图的可视化文档。

> *"梳理这个 monorepo 的认证系统"* → 带时序图的架构报告。

### 3. 投资周报 / 市场简报

通过 MCP 工具拉取行情数据、财务指标、新闻舆情，原始输出 700+ 行 markdown。Inkwell 将其重组为专业简报：封面关键指标、分板块章节、总览图、可截图分享的总结卡。

> *"生成本周 AI 产业链投资报告"* → 5 章编辑级报告，含仓位配置图。

### 4. 事故复盘

跟 AI 排查完生产故障，时间线、根因、修复方案、预防措施散落在对话各处。Inkwell 生成清晰的事故报告：时间线时序图、根因分析、分优先级的行动项。

> *"这次宕机的原因和处理过程"* → 带时间线的事故复盘报告。

### 5. 技术决策记录

跟 AI 争论架构选型——对比框架、权衡利弊——洞察全埋在段落里。Inkwell 提取关键决策因素，生成对比表、决策树图、明确建议。

> *"要不要从 PostgreSQL 迁到 ClickHouse？"* → 带决策流程图的对比分析。

### 6. 学习笔记

让 AI 教你一个新领域，问答密集且无结构。Inkwell 整理成有条理的学习笔记：概念图、分章节知识点、核心要点及示例、快速回顾总结卡。

> *"给我讲 B+ 树原理"* → 带树结构图的结构化笔记。

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- 支持 Skills 的 AI Agent（Claude Code、Codex、Cursor 等）

### 安装

```bash
# 推荐：通过 skills CLI 安装
npx skills add Yunkou/inkwell

# 或直接 clone
git clone https://github.com/Yunkou/inkwell.git
cd inkwell && bash scripts/install.sh

# 验证安装（应该全部 ✓）
bash scripts/install.sh   # 幂等：再跑一次会跳过已就绪的步骤
```

> ⚠ Codex `skill-installer` 默认只安装 `SKILL.md`，会把 `scripts/`、`fonts/`、`references/` 丢在身后。请用上面两种方式之一获取完整目录树，再用 `bash scripts/install.sh` 一键就绪。详细原因见 [SKILL.md](SKILL.md) 的 `## Location` 段落。

### 文件结构

```
inkwell/
├── SKILL.md                       # skill 入口（AI Agent 读这里）
├── README.md
├── package.json                   # 依赖声明（beautiful-mermaid / subset-font / takumi）
├── scripts/
│   ├── generate-report.mjs        # 主生成器
│   ├── verify-report.mjs          # 生成结果校验（结构 + 反模式 + 设计令牌）
│   └── install.sh                 # 一键安装（含 npm install）
├── fonts/
│   ├── LXGWWenKai-Regular.woff2   # 霞鹜文楷（按报告字符子集化、inline 进 HTML）
│   └── README.md
└── references/
    ├── design-tokens.md           # 设计令牌（散文文档）
    └── design-tokens.json         # 设计令牌（机器可读，verify-report.mjs 读这里）
```

### 使用

直接跟 AI Agent 说：

```
把我们的对话生成一份报告。
```

Agent 会自动：
1. 分析对话内容，按金字塔原理结构化
2. 渲染 mermaid 图表为内联 SVG
3. 生成 takumi 总结图 PNG
4. 输出单文件 `report.html`
5. 在浏览器中打开

或直接调用技能：

```
/inkwell: 把刚才的调研生成报告
```

## Agent 配置

### Claude Code

通过 `npx skills add Yunkou/inkwell` 安装后自动注册。输入 `/inkwell` 或说「生成报告」即可触发。

### Codex (OpenAI)

```bash
git clone https://github.com/Yunkou/inkwell.git ~/.codex/skills/inkwell
cd ~/.codex/skills/inkwell && npm install
```

在 Codex 中说 "generate report"、"生成报告" 即触发。

### Cursor

```bash
npx skills add Yunkou/inkwell
```

在 Cursor 中使用 `@inkwell` 调用技能。

### GitHub Copilot / Windsurf / Gemini CLI / Trae

全部通过 skills CLI 安装：

```bash
npx skills add Yunkou/inkwell
```

### 纯 CLI（无 Agent）

Inkwell 可以脱离 AI Agent 直接使用。传入 JSON 文件即可：

```bash
node scripts/generate-report.mjs input.json report.html
open report.html
```

JSON 格式见 [SKILL.md](SKILL.md)。

## 工作原理

```
对话上下文
      │
      ▼
┌─────────────────────┐
│  AI 结构化            │  Agent 分析对话内容
│  (对话中完成)          │  输出：金字塔结构 JSON
└────────┬────────────┘
         │  JSON
         ▼
┌─────────────────────┐
│  Node.js 生成器       │  renderMermaidSVG() → 内联 SVG
│  generate-report.mjs │  takumi + 中文字体 → 总结图 PNG
│                      │  编辑级 CSS 全部内联
└────────┬────────────┘
         │  report.html（自包含）
         ▼
┌─────────────────────┐
│  浏览器               │  零依赖，离线可用
│                      │  80–150 KB，直接分享
└─────────────────────┘
```

## 报告结构

| 章节 | 内容 | 图表 |
|------|------|------|
| **封面** | 标题、标签、摘要、日期、作者 | — |
| **核心结论** | 3–5 条大号编号结论 | 1 张总览图 |
| **分章节** | Thesis 卡片 + 正文 + 图表 | 每章 ≥1 张 |
| **行动建议** | 优先级表格（P0/P1/P2） | — |
| **总结信息卡** | takumi PNG（1200×630）| base64 内嵌 |

内容过短时自动切换灵活模式——合并章节、精简结构。

## 设计系统

Inkwell 使用编辑级设计语言：

- **配色**：羊皮纸底（`#f5f4ed`），单色墨蓝强调（`#1B365D`），暖调灰
- **字体**：霞鹜文楷（中文楷体），Charter/Georgia（英文衬线），仅用 400/500 字重
- **排版**：1080px 最大宽度，88px/64px 编辑级页边距
- **组件**：编号章节头、Thesis 盒、四区总结信息卡
- **禁止项**：左侧彩色竖线、渐变文字、毛玻璃、AI 默认奶油底色、冷调灰

完整设计规范：[references/design-tokens.md](references/design-tokens.md)

## 技术栈

| 库 | 作用 |
|----|------|
| [beautiful-mermaid](https://github.com/lukilabs/beautiful-mermaid) | Mermaid → SVG 渲染 |
| [takumi-js](https://github.com/kane50613/takumi) | 总结卡 PNG 生成 |
| `subset-font` | 字体子集化（霞鹜文楷 → 100–200 KB 内联） |
| 霞鹜文楷 | 内置中文楷体（SIL OFL 开源） |

## 文件结构

```
inkwell/
├── SKILL.md                        # Agent 入口
├── README.md                       # 中文说明（本文件）
├── README.en.md                    # English README
├── package.json                    # Node 依赖
├── fonts/
│   ├── LXGWWenKai-Regular.woff2    # 内置中文字体（SIL OFL）
│   └── README.md
├── references/
│   └── design-tokens.md            # 编辑级设计规范
└── scripts/
    └── generate-report.mjs         # JSON → HTML 生成器
```

## 参与贡献

欢迎提 Issue 和 PR。生成器脚本是单文件 ESM，很容易修改。

## 许可证

MIT
