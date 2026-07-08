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

---

