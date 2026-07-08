# Bundled Fonts

This directory contains fonts shipped with the skill so reports render with consistent typography even when the host system has no suitable CJK font.

## `LXGWWenKai-Regular.woff2`

- **Source**: [lxgw/LxgwWenkai](https://github.com/lxgw/LxgwWenkai) v1.522
- **License**: SIL Open Font License 1.1 (free for commercial use, redistribution allowed)
- **Style**: 霞鹜文楷 — kaiti (楷体) with humanist warmth, screen-optimized
- **Size**: 4.6 MB (covers 20,902 CJK Unified Ideographs + Latin + punctuation)
- **Origin**: downloaded as `.ttf` (24 MB) from the GitHub release, then converted to woff2 with `woff2_compress`, then subset to common Chinese glyphs with `subset-font`

## How it is used

The generator:

1. Loads `fonts/LXGWWenKai-Regular.woff2` at runtime
2. Extracts every CJK character from the report content
3. Calls `subset-font` to produce a per-report woff2 containing only the glyphs actually needed (typical: 100-200 KB)
4. Inlines the subset as a base64 `data:` URI in a `@font-face` rule inside the generated HTML
5. Injects the same font file into the takumi renderer so the summary card PNG also uses it
6. Adds `'LXGW WenKai'` to the front of the `--serif` CSS variable font stack

## Replacing the font

To swap to a different font, drop your `MyFont-Regular.woff2` in this directory and update `scripts/generate-report.mjs`:

```js
// In loadBundledFont()
const fontPath = resolve(here, '..', 'fonts', 'MyFont-Regular.woff2');
return { name: 'My Font', path: fontPath, data: readFileSync(fontPath) };
```

Also update the `--serif` font stack in the `:root` CSS block to put your font first.

## Why not just use a system font?

- The skill is intended to render identically on macOS, Linux, and Windows
- Each platform ships different CJK fonts (Songti SC, Noto Sans CJK SC, Microsoft YaHei) and they don't share visual character
- An inlined subset font keeps the report self-contained (no external network requests) and ensures consistent rendering everywhere
