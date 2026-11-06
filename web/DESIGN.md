---
name: PAC-MAN
description: An arcade arcade playground with a black PAC-MAN world and prominent yellow play actions.
colors:
  background: "#000000"
  surface: "#10121c"
  surface-elevated: "#181c29"
  text-primary: "#f6f7ff"
  text-secondary: "#d1d8ff"
  text-muted: "#c0caf9"
  arcade-blue: "#254cdf"
  pacman-yellow: "#ffdf32"
  deep-navy: "#090a10"
  cyan: "#7ee8f7"
  ghost-red: "#ff4b59"
  ghost-cyan: "#28d2ec"
  ghost-pink: "#ff9bc9"
  ghost-orange: "#ffae55"
  purple: "#7452a9"
  danger: "#ff9ba2"
  success: "#78e2ae"
  warning: "#9c5d14"
  border: "#263154"
  border-hover: "#4d65a8"
  terrain-normal: "#253449"
  terrain-boost: "#087886"
  terrain-mud: "#785230"
  terrain-lava: "#b32825"
typography:
  display:
    fontFamily: "Press Start 2P, Courier New, monospace"
    fontSize: "clamp(1.4rem, 3.5vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Press Start 2P, Courier New, monospace"
    fontSize: "clamp(1.3rem, 3.3vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Press Start 2P, Courier New, monospace"
    fontSize: "clamp(1rem, 2.2vw, 1.75rem)"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Chakra Petch, Courier New, monospace"
    fontSize: "0.92rem"
    lineHeight: 1.9
  label:
    fontFamily: "Chakra Petch, Courier New, monospace"
    fontSize: "0.8rem"
    fontWeight: 600
rounded:
  compact: "3px"
  control: "4px"
  primary-action: "6px"
  navigation: "9px"
  poster: "12px"
spacing:
  tight: "6px"
  control: "8px"
  group: "16px"
  panel: "24px"
  section: "36px"
components:
  button-primary:
    backgroundColor: "{colors.pacman-yellow}"
    textColor: "#1c211e"
    rounded: "{rounded.primary-action}"
    padding: "0 18px"
  button-primary-hover:
    backgroundColor: "#f0c925"
  seed-field:
    backgroundColor: "{colors.deep-navy}"
    textColor: "#ffffff"
    rounded: "{rounded.compact}"
    padding: "10px"
---

# Design System: PAC-MAN

## Overview

**Creative North Star: "The Graph Playground"**

Pure black fills the application. Near-black surfaces organize navigation, controls and launch areas. Pixel arcade headings, squared body type, PAC-MAN yellow actions, electric-blue maze walls and ghost colors define the theme.

Arcade content retains its own visual identity: dark native maze scenes, blue walls, yellow Pac-Man, and colored ghosts sit within the black arcade application. The homepage ink poster is a deliberate content region within this arcade world.

**Key Characteristics:**

- Royal-blue page with deep-navy framing and nearly square tool surfaces.
- Press Start 2P headlines paired with Chakra Petch controls and prose.
- Prominent PAC-MAN yellow play actions, selected tools, and yellow-on-navy navigation.
- Native arcade scenes presented as framed interactive content.

The implemented source is the authority: `src/styles/tokens.css`, `src/styles/global.css`, application, page, and component styles. This document records the replacement implementation; browser verification results belong in the task report rather than an inherited visual specification.

## Colors

The palette makes PAC-MAN explicit across the whole application: black background, deep-navy structure, yellow actions, and ghost colors.

### Primary

- **PAC-MAN Yellow:** Primary homepage/result actions, the persistent Arcade navigation action, selected laboratory tools, playback/pause, highlighted headline phrases, scores, and the PLAY. poster wordmark.
- **Electric Cobalt:** Retained arcade-blue token and maze identity; black supplies the application background and near-black surface layers organize tools.
- **Yellow Alias:** The legacy UI `--color-pacman` alias now resolves to PAC-MAN yellow.

### Secondary

- **Ghost colors:** Red, cyan, pink, and orange preserve the character palette. Light cyan supports visible keyboard focus and readable accents on the black background; brighter ghost cyan retains its character role.
- **Graph Purple:** Available for graph-related accents. Success green, danger brick, and warning ochre communicate state.
- **Terrain colors:** Normal, boost, mud, and lava preserve the maze's category encoding; do not treat them as interchangeable interface accents.

### Neutral

- **Royal Blue:** The application canvas.
- **Deep Navy:** Navigation, launcher panel, seed inputs, score region, and result dialog. The poster uses an even deeper blue-black.
- **Layered Blues:** Tool surfaces, hover regions, and comparison-table cells.
- **Near White:** Main text and pixel titles, with lavender-white secondary copy.
- **Lavender Blues:** Metadata, dividers, and control borders.

**The Play First Rule.** Keep play controls visibly yellow with dark text. The Arcade navigation item remains a yellow launch action on every page. Use near-white text and light cyan focus on blue backgrounds; native scene actors retain their canonical colors.

## Typography

**Display Font:** Press Start 2P, with Georgia fallback.

**Body Font:** Chakra Petch, with Inter and system sans-serif fallbacks. Google Fonts supplies Press Start 2P and Chakra Petch externally; the layout must remain usable when the fonts cannot load.

Large arcade headlines use regular serif weight, tight tracking, and compact leading; italic yellow phrases add emphasis. Utility headings and labels retain the sans-serif stack. The `--font-family-display` utility token is Chakra Petch with Space Grotesk fallback; page styles explicitly select the arcade token for pixel headings.

The frontmatter captures the homepage display, manual headline and body, laboratory title, and control label roles. These are observed contextual roles rather than a universal heading scale. The manual's prose is limited to (72ch). Scores, graph comparisons, counters, and coordinates use tabular numerals where declared. The PLAY. poster wordmark is serif and uses React Bits GlitchText with a restrained hover effect.

## Layout

Desktop navigation is a fixed vertical rail (116px) with matching main-content offset. At (760px), it becomes a sticky top bar with a brand row and a four-item navigation row. Active navigation uses deep navy with yellow text/icons. The Arcade navigation item remains a yellow button with dark text/icons whether active or inactive.

The homepage caps at (1540px). The opening is a standalone arcade heading. The ink PLAY. poster groups all three page accesses beside the character parade and live maze demonstration: yellow Arcade play first, then outlined laboratory and manual actions. Wide, divided feature-link rows lead into the footer. This replaces the former split copy/map hero. The opening rearranges at (980px), and poster, actions, and feature rows adopt compact layouts at (760px).

The game caps at (1460px), with a square black-framed maze and a (248px) scoreboard column. At (1100px) the sidebar narrows to (220px); at (900px) status moves above the canvas. Desktop map width follows `min(100%, max(280px, calc(100dvh - 190px)))`; the stacked map uses `min(100%, max(260px, calc(100dvh - 410px)))`. Touch controls appear at compact widths or on coarse pointers.

The laboratory caps at (1500px). Controls sit in a (254px) left column, the map occupies the right, and comparison/inspection results span the full width below in two columns. At (1100px), controls narrow to (224px). At (900px), the map comes before controls and results stack. The square map uses a viewport-aware width on large screens and full available width at compact sizes.

The manual caps at (1200px), with a horizontal sticky table of contents, an arcade title, and divided sections pairing a (190px) section-label column with prose. The label column narrows at (1100px); sections stack at (760px), while topic navigation continues to scroll horizontally.

Homepage, game, and laboratory retain shared seed identity, initially (42), and the same maze configuration. Visual composition does not change the generator, algorithm behavior, or rules.

## Elevation & Depth

Blue surface layers, deep-navy panels, substantial canvas frames, and fine light-blue dividers provide most of the depth. The medium shadow supports the compact game-details popover; declared shadow values remain in the sidecar. The result overlay separates a navy dialog from the page with a dimmed, blurred backdrop.

## Shapes

Tool surfaces and fields use compact corners; larger homepage actions and navigation soften slightly. The ink poster and result wrapper use the larger poster radius. The game and laboratory canvas frames have narrow corners (3px) and substantial ink borders (10px), reducing to (7px) for the laboratory at compact widths. The brand remains a clipped circular Pac-Man silhouette, now yellow. Legend dots and victory marks use circles when their semantics require them.

## Components

### Buttons

The animated Pac-Man poster groups the Arcade, laboratory, and manual accesses in one column. The primary play action is (54px) high; the two outlined secondary actions are at least (46px) high. The opening has no separate access block or explanatory aside.

The primary homepage play action is PAC-MAN yellow with dark text, a minimum height of (54px), and a (6px) radius. It lives inside the animated PLAY. poster, is at least (210px) wide on desktop, and spans the poster width on mobile. The redundant opening play launcher was removed. The laboratory's selected algorithm and mode controls use yellow with dark text. Yellow playback and pause actions retain dark text; outlined or underlined laboratory/manual links provide secondary emphasis. Global disabled controls reduce opacity to (0.45).

Keyboard focus uses a light cyan outline (2px) offset by (4px), independently of hover. Preserve global focus treatment on links, inputs, buttons, and summaries. Playback keeps the main action on a full row and step/restart below in two equal columns.

### Inputs / Fields

Seed inputs use deep-navy fill, white text, a fine light-blue border, compact corners, and a minimum height of (44px). Range accents and carets use the UI accent alias. Selected tools must remain distinguishable by fill, border, and text treatment.

### Navigation

The desktop rail uses centered icon/label pairs, a compact sans-serif label, navy hover fill, and deep-navy active fill with yellow text/icons. Mobile navigation places icon and label on one line. The sound control is circular and remains available in the top row. Keep the skip link usable.

### Cards / Containers

Most content groups use whitespace and divider lines rather than card outlines. The scoreboard's main score sits on navy, with yellow numerical emphasis and a thin blue border. Laboratory tables use blue cell fill and horizontal separators; inspector placeholders use a blue surface and a border. Feature links are full-width rows with a small arrow movement on hover.

### Arcade content

The homepage demonstration is a separate illustrative Phaser scene using the shared seed and existing generator, pathfinding, and renderers. Its pause control also controls the character parade. Scenes stop offscreen or when the document is hidden; reduced motion presents a still scene. Keep dark canvas pixels and canonical actor colors within their content context.

Actual React Bits GlareHover and GlitchText are vendored in `src/components/react-bits/` with `LICENSE.md`. GlareHover supplies restrained noninteractive sweeps on existing actions and framed content. GlitchText affects the PLAY. wordmark on hover. Native SplitText and AnimatedContent implementations remain under `src/components/motion/`; do not describe these native implementations as vendored React Bits source.

### Game results

GameResult is portaled to the document body with a fixed scrollable backdrop. The deep-navy dialog caps at (480px), uses yellow arcade headings and score, near-white copy, and yellow primary actions, and retains a canonical yellow defeat mark. Content height is limited to the viewport, with compact spacing at (480px). It locks background scrolling, focuses the first action, traps Tab within its actions, and restores prior focus when possible. Victory and defeat preserve their retry/new-map behavior.

### Motion

Motion is finite for arrivals and reveals, and functional for the demo/parade. SplitText preserves an accessible unsplit alternative; AnimatedContent reveals once in view and cleans up observers and animation handles. Reduced-motion preferences disable global CSS animation, transitions, and smooth scrolling, hide glare/glitch overlays, and retain visible text and controls. The sidecar records observed durations rather than introducing a new motion scale.

## Do's and Don'ts

### Do:

- **Do** use black, deep navy, pixel arcade titles, and the PAC-MAN palette across the whole application.
- **Do** preserve keyboard focus, reduced motion, readable fallback fonts, and responsive workspace ordering.
- **Do** keep shared maze identity and native game colors intact while changing presentation.
- **Do** use dividers and spacing to organize tools and prose.

### Don't:

- **Don't** restore the interim ivory background; the latest user direction explicitly applies the PAC-MAN theme to the background and whole interface.
- **Don't** obscure play actions among secondary links or recolor native actors using unrelated UI aliases.
- **Don't** reintroduce the previous split copy/map homepage hero or replace the vertical rail with the original desktop top navigation.
- **Don't** claim visual QA, algorithm results, or performance metrics without current evidence.

## Arcade typography and black background

The background is pure black (#000000). Press Start 2P supplies pixel arcade headings and the PLAY wordmark; Chakra Petch supplies readable controls and body copy. Google Fonts loads both with display=swap; Courier New is the offline fallback. All serif and italic display styling is removed. Homepage display is 1.4–3rem, mobile 1.1–1.8rem, with 1.65 line height; page titles use 1–1.75rem. Manual titles and result dialogs use smaller pixel type to retain readable wrapping. All three homepage accesses remain inside the animated Pac-Man card.

## Organized workspaces and React Bits motion

The home primary action now uses the official React Bits StarBorder component (native canvas; no new dependency), sourced from https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Animations/StarBorder under the adjacent React Bits license. It uses a restrained yellow border trail and hover/keyboard feedback; reduced motion hides its decorative canvas. Local adjustments react to changed motion preferences and stop animation while the document is hidden. Existing GlitchText and GlareHover remain.

Arcade groups score, objective, pause and map tools into a single sidebar surface. Laboratory separates algorithm, rendering, playback and seed groups with labelled regions, 44px controls, and a 280px desktop controls column; analysis stays below the map. Its theory disclosure announces expanded state and reveals content once. Manual uses readable squared section titles, a wider title column, and scrollable topic navigation. Secondary home accesses align side by side when space allows and stack on compact screens. AnimatedContent enters the Arcade sidebar and Laboratory panels once; SplitText introduces the three inner-page headings. The canvas itself does not move. Global repeated page-arrival animation is removed.

Validation for this pass: production build and 13 unit tests passed. Headless Chrome checked all four pages at 1440px and 390px, with no horizontal overflow or canvas clipping. The new play action retained keyboard focus and its accessible name; Laboratory play/pause/reset, theory disclosure and Manual topic navigation passed. Screenshots use offline Courier fallback because external webfonts are unavailable in the headless environment. Playback feedback now updates immediately on existing play/pause events; search logic remains unchanged.
