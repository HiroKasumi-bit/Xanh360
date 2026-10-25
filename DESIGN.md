---
name: Xanh360
description: Sourced waste sorting for Ho Chi Minh City; paper cards on a deep forest ground, one sun-yellow accent.
colors:
  ground: "#0f3a2e"
  ground-deep: "#0a2a22"
  ground-tray: "rgb(220 240 226 / .07)"
  on-ground: "#f3f6ec"
  on-ground-muted: "#b5d6c0"
  on-ground-line: "rgb(214 236 222 / .14)"
  accent-fill: "#f2bf4a"
  accent-hi: "#ffd56f"
  accent-on-ground: "#f4c85e"
  paper: "#f6f5ef"
  paper-raised: "#fffdf8"
  paper-sunken: "#efeee6"
  ink: "#153c32"
  ink-2: "#4a5d52"
  ink-3: "#4e6055"
  ink-placeholder: "#5f7067"
  line: "#dbe5dc"
  line-soft: "rgb(13 42 31 / .09)"
  line-strong: "#c9d9cf"
  green-100: "#e8f1e3"
  green-300: "#a8d1a6"
  green-500: "#1d7a55"
  green-600: "#17694c"
  green-700: "#14503d"
  cat-recycle-bg: "#e6f1e4"
  cat-recycle-fg: "#1f6142"
  cat-organic-bg: "#eef1da"
  cat-organic-fg: "#4d6320"
  cat-special-bg: "#fcefd9"
  cat-special-fg: "#84501a"
  cat-hazard-bg: "#fdebe4"
  cat-hazard-fg: "#8c2f1a"
  cat-hazard-accent: "#c0462c"
  cat-residual-bg: "#eeefec"
  cat-residual-fg: "#4d5a53"
  cat-unknown-bg: "#edf0f1"
  cat-unknown-fg: "#4b5d63"
typography:
  display:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2rem, 1.3rem + 3.1vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.45rem + 1.3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.12rem + .55vw, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title-sm:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1.03rem + .15vw, 1.125rem)"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.005em"
  wordmark:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "clamp(.9375rem, .9rem + .2vw, 1.0625rem)"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: ".9375rem"
    fontWeight: 400
    lineHeight: 1.55
  button:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: ".9375rem"
    fontWeight: 600
    lineHeight: 1.25
  meta:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: ".8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  xs: "8px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "22px"
  2xl: "28px"
  pill: "999px"
spacing:
  gutter-phone: "16px"
  gutter-desktop: "32px"
  grid-gap: "12px"
  card-gap: "16px"
  card-pad: "22px"
  panel-pad: "28px"
  shell-max: "1180px"
components:
  button-primary:
    backgroundColor: "{colors.green-600}"
    textColor: "#ffffff"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.green-700}"
  button-outline:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.green-700}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-text:
    textColor: "{colors.green-600}"
    height: "44px"
  button-text-on-ground:
    textColor: "{colors.accent-on-ground}"
    height: "44px"
  capture-card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "22px"
  capture-card-primary:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.ground}"
    rounded: "{rounded.xl}"
    padding: "22px"
  card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "23px"
  item-card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "18px 32px 18px 18px"
  search-field:
    backgroundColor: "#faf9f4"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px 8px 18px"
  chip-quick:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.green-700}"
    rounded: "{rounded.pill}"
    padding: "5px 13px"
  header-chip:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "7px 13px"
    height: "46px"
  nav-tab:
    textColor: "{colors.on-ground-muted}"
    padding: "12px 18px"
    height: "46px"
  nav-tab-active:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.green-700}"
  nav-tab-active-phone:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.on-ground}"
  brand-tile:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.ground}"
    rounded: "{rounded.md}"
    size: "46px"
---

# Design System: Xanh360

## Overview

**Creative North Star: "Paper on the forest"**

The page ground is a flat, deep forest green with a fine grain. Every working surface (search, capture actions, item lists, results, collection points, history) is a light paper card laid on that ground, so the task reads first and the ground carries the brand. One sun-yellow accent marks what is lit: the brand tile, the "Chụp ảnh" capture card, the promise line of the hero headline, links on the ground, the active phone tab and text selection.

The hero is a Blender-rendered photograph of the Saigon riverfront, one per time of day (dawn, day, sunset, night) chosen before first paint from Ho Chi Minh City time (`app/daypart.ts`, `html[data-daypart]`). A forest-green scrim sits dense under the copy and clears over the skyline. One key light comes from the top right: highlights sit on top edges, shadows fall down and slightly left. The interface is in Vietnamese and set in Be Vietnam Pro throughout.

The signed-in admin (`.admin-shell`) is a working tool laid straight on the page, so it keeps a paper ground; its on-ground colours fall back to ink.

**Key Characteristics:**
- Deep forest ground with grain; light paper cards with ink text on it.
- One accent, sun yellow, used sparingly for what is lit.
- Functional greens, amber and earth red live inside cards and carry meaning.
- Saigon hero photograph by time of day under a forest scrim.
- Soft, green-tinted, top-lit elevation; generous rounded corners.
- Motion limited to transform and opacity, with one reduced-motion switch.

## Colors

A two-world palette: forest colours for whatever sits on the ground, paper and ink for whatever sits in a card, with one warm accent bridging them.

### Primary
- **Sun Yellow** (`accent-fill`): the brand tile, the "Chụp ảnh" capture card, the sunlit lozenge behind the active phone tab, and `::selection`. Text on it is the forest ground colour. `accent-hi` is its lit highlight in radial gradients only.
- **Sun Yellow on Ground** (`accent-on-ground`): the accent as text or icon on the forest (hero promise line, hero meta icons, "Xem danh mục" and footer links, focus ring on dark surfaces).

### Secondary
- **Action Green** (`green-600`, hover `green-700`): primary buttons and the search button inside cards, as a `green-500` to `green-600` vertical gradient. `green-500` is the focus ring on paper. `green-100` is the notice and pressed-row tint; `green-300` the hover border of chips and outline buttons.

### Tertiary
- **Category colours** (`cat-*`): meaning, never decoration. Green recyclable, olive organic, amber collect separately, earth red hazard and destructive, stone residual, blue-grey unknown. Each has a tint background, a text step at 4.5:1 or more on it, a line and an accent band.

### Neutral
- **Forest Ground** (`ground`): the page background, also the browser theme colour.
- **Deep Forest** (`ground-deep`): the phone bottom tab bar (at 92% opacity, frosted).
- **Tray** (`ground-tray`): the desktop tab tray pressed into the ground.
- **On-ground Light** (`on-ground`): headings and active labels on the ground.
- **On-ground Muted** (`on-ground-muted`): body text, inactive tabs and the footer on the ground.
- **Ground Line** (`on-ground-line`): hairlines on the ground (header rule, footer rule, tray edge, disabled outline).
- **Paper Raised** (`paper-raised`): every card and chip. `paper` is the admin ground; `paper-sunken` the photo dropzone well.
- **Ink** (`ink`, `ink-2`, `ink-3`): text inside cards; `ink-2` and `ink-3` hold 4.5:1 on every paper surface. `ink-placeholder` for field placeholders.
- **Lines** (`line-soft`, `line`, `line-strong`): card borders, outline buttons, field borders.

### Named Rules
**The Two Worlds Rule.** Text on the ground uses only the on-ground colours and `accent-on-ground`; text inside a card uses only ink, the greens and the category colours. A surface never borrows the other world's text colour.

**The One Sun Rule.** Sun yellow is the only accent. It marks what is lit (brand tile, the "Chụp ảnh" card, the headline's promise line, links on the ground, the active phone tab, selection) and nothing else; buttons inside cards stay green.

## Typography

**Display Font:** Be Vietnam Pro (self-hosted latin + vietnamese subsets, 400 to 800; fallback system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Be Vietnam Pro

**Character:** One family carries everything; hierarchy comes from weight (800 display and wordmark, 700 headings, 600 labels and buttons, 400 to 500 text) and tight negative tracking on large sizes.

### Hierarchy
- **Display** (800, `display`): the hero headline only. Its second line, the promise, is set in `accent-on-ground` with normal (non-italic) style.
- **Headline** (700, `headline`): page intros on the ground and the 404 page.
- **Title** (700, `title`): section headings ("Những món thường gặp"), result headings, dialog titles.
- **Title Small** (600, `title-sm`): card and step headings.
- **Lead** (400, `lead`): the hero sentence, max about 465px.
- **Body** (400, `body`; `body-small` for secondary text): paragraphs use `ink-2` and `text-wrap: pretty`.
- **Meta** (500, `meta`): captions, item subtitles, hero meta line, footer. Nothing is set below 13px.

### Named Rules
**The Vietnamese Marks Rule.** Line height never drops below 1.15 on display and 1.3 on multi-line titles, and underlines sit at `.34em` so stacked marks and the dot below (ạ, ụ, ỗ) stay legible. Inputs are at least 16px.

## Layout

A single centred shell, max 1180px wide, with 32px gutters (16px on phones, both extended by the safe-area insets). Order on the search tab: header on the ground, the tab tray, the full-width hero, three capture cards (`1.13fr 1fr 1fr`, 16px gap), the search card, popular items in a three-column grid (12px gap), then the paper "how it works" card and the footer under a 1px `on-ground-line` hairline.

Breakpoints observed: 1179px (hero stacks copy above the skyline), 1000px (motion toggle becomes icon-only), 900px (tall hero photograph), 640px (phone: bottom tab bar, 16px gutters, tighter cards), 389px (small phones), and landscape at max-height 500px (compact hero, bottom tab bar). On phones the tab list becomes a fixed bottom bar (`--tabbar-h` 44px on phones, 56px otherwise, plus the safe-area inset), and "Chụp ảnh" must stay above it at 390×664 and 360×640. Touch targets are at least 44px; header chips and tabs are 46px.

## Elevation & Depth

Hybrid: paper cards are lifted off the ground with soft, green-tinted, layered shadows and a bright inset top edge (one key light from the top right). Fields and pressed states sink with inset shadows. Shadows on the yellow capture card and brand tile are neutral black so the yellow does not muddy.

### Shadow Vocabulary
- **Rest** (`--elev-1`): every paper card and header chip.
- **Raised** (`--elev-2`): the classification result card.
- **Lift** (`--elev-lift`): hover shadow, pre-drawn on a pseudo-element and faded in by opacity, never by animating `box-shadow`.
- **Pressed** (`--elev-pressed`): pressed cards, outline buttons and the pressed motion toggle.
- **Field well** (`inset 0 1px 2px rgb(13 42 31 / .07)`): the search field.
- **Hero** (`0 1px 2px rgb(10 42 34 / .2), -4px 26px 48px -26px rgb(10 42 34 / .7)`): the photograph frame.

### Named Rules
**The Top-Right Sun Rule.** Highlights go on top edges, drop shadows fall down and slightly left (negative x offset on the larger layers).

**The Flat Disabled Rule.** An unavailable control loses its shadow; on the ground it becomes an outline in `on-ground-line` with muted text, not a dimmed paper chip.

## Shapes

Generously rounded, never sharp. Radii step from 8px (rows) through 10px (buttons), 14px (fields, icon tiles, brand tile), 18px (item cards, point cards, result sign), 22px (capture, search and result cards) to 28px (hero). Chips and header controls are full pills. Phones step large containers down one size (hero 22px, capture and search cards 18px). Borders are 1px in `line-soft` on cards. The gạch bông (encaustic cement tile) pattern appears only as a faded corner, masked from the top right at 12% opacity, on the paper "how it works" card.

## Components

### Buttons
- **Shape:** gently rounded (`rounded.sm`), minimum 44px tall.
- **Primary:** white text on a `green-500` to `green-600` gradient with a light top edge and a small green drop; hover shifts to `green-600` to `green-700`.
- **Outline:** paper fill, 1px `line` border, `green-700` text; hover border `green-300`. Destructive outline uses `red-700` text and `red-300` border.
- **Text button:** no fill, `green-600` text in cards, `accent-on-ground` on the ground.
- **Press:** everything pressable scales to .97 over 90ms and settles back over 220ms with no overshoot; wide rows scale to .99 and take the `green-100` tint.
- **Focus:** a 2.5px `green-500` ring 2px off the element with a white halo; on dark surfaces the ring turns `accent-on-ground` with a deep-forest halo.

### Chips
- **Quick picks:** paper pills, 1px light border, `green-700` text at 13px; hover border `green-300`.
- **Header chips** (location, weather, motion toggle): 46px paper pills with `--elev-1`. The pressed motion toggle sinks and takes the `green-100` tint.
- **Badges:** 13px semibold pills in category tints.

### Cards / Containers
- **Corner Style:** `rounded.xl` for capture, search and result cards; `rounded.lg` for item and point cards.
- **Background:** `paper-raised`; the source panel uses a cooler paper (#f1f4ec) with only an inset top edge.
- **Shadow Strategy:** `--elev-1` at rest, `--elev-lift` faded in on hover with a 2px rise (fine pointers only).
- **Border:** 1px `line-soft`.
- **Internal Padding:** 22 to 28px; 15 to 20px on phones.

### Inputs / Fields
- **Style:** a shallow well (#faf9f4) with a 1px `line-strong` border and `rounded.md`; the search button sits inside it.
- **Focus:** one 2.5px focus-green outline drawn over the field's own border (`focus-within`).

### Navigation
- **Desktop and tablet:** a tray pressed into the ground (`ground-tray`, inset shadow, `on-ground-line` edge, 16px radius) holding four tabs with icons; inactive labels in `on-ground-muted`, hover `on-ground`. A single paper pill slides under the active tab (measured, moved with `translate`), label `green-700`.
- **Phone and short landscape:** a fixed bottom bar in frosted deep forest (`ground-deep` at 92%, 18px blur), lit top hairline, shadow cast upward. The active tab's label turns `on-ground`, and the sliding pill becomes the sun-yellow lozenge with its icon in `ground`.

### Capture Cards (signature)
Three paper tiles for the ways in: "Chụp ảnh", "Tải ảnh", "Nhập tên". Each has a 45px icon tile, a 21px bold label, a 13px hint and a corner arrow that nudges up-right on hover. "Chụp ảnh" is the one sunlit tile: `accent-fill` with an `accent-hi` radial highlight from the top right, forest text, and its icon on a forest tile in `accent-on-ground`.

### Saigon Hero (signature)
A full-frame, rounded (28px) photograph of the Saigon riverfront for the current daypart, anchored bottom right, wide frame on laptops and tall frame on portrait tablets and phones, with a 32% grain overlay. A forest scrim (`rgb(7 30 24 / .8x)`) fades from the left beside the copy on wide screens and from the top where the copy spans the frame. The headline is near-white (#fbfdf7) with its promise line in sun yellow; the forest ground colour shows while the picture loads.

### Waste Sign (signature)
The classification result sign: category tint background with a white top sheen, a 10px category band on the left edge, a 76px embossed paper icon tile, the category name in the category text colour (22px), and a 13px instruction line. Hazard results switch the surrounding card to the red family.

## Do's and Don'ts

### Do:
- **Do** put every working surface on a `paper-raised` card; leave only page intros, section headings, the page count, the Maps fallback and the footer directly on the ground.
- **Do** use `on-ground` for headings and `on-ground-muted` for text on the ground, and `accent-on-ground` for links there.
- **Do** keep sun yellow to the lit elements named in The One Sun Rule; buttons inside cards stay Action Green.
- **Do** fade hover shadows in on a pseudo-element and animate only transform and opacity; honour `html[data-motion=reduced]`, where loops, entrances and lifts stop but presses and busy spinners stay.
- **Do** draw disabled controls on the ground as an `on-ground-line` outline with muted text.
- **Do** keep text at 4.5:1 (large text 3:1) and targets at 44px or more.

### Don't:
- **Don't** return to a cream page with a green button; the ground is forest and the cards are paper.
- **Don't** put a pattern on the ground; gạch bông lives only as the faded corner of the "how it works" paper card.
- **Don't** add a second accent colour or use category colours as decoration.
- **Don't** set small uppercase labels above headings; only the 404 page keeps its muted error code.
- **Don't** animate `box-shadow` or `filter`; use pre-drawn shadows and opacity.
