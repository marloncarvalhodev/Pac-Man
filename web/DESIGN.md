---
name: PAC-MAN
description: Dark arcade interface with yellow play controls and cyan laboratory accents.
colors:
  background: "#0c1018"
  surface: "#121925"
  surface-elevated: "#1a2433"
  text-primary: "#f2f4f8"
  text-secondary: "#b0bbce"
  text-muted: "#95a2b8"
  pacman: "#ffda55"
  cyan: "#7cd9e8"
  danger: "#ff8e8e"
  success: "#75dfb0"
  border: "#293344"
  border-hover: "#526079"
  terrain-normal: "#253449"
  terrain-boost: "#087886"
  terrain-mud: "#785230"
  terrain-lava: "#b32825"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(3.4rem, 5.6vw, 5.4rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Space Grotesk, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.5rem, 4.5vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Space Grotesk, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 600
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.95rem"
    lineHeight: 1.85
  intro:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.05rem"
    lineHeight: 1.75
  navigation:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 500
rounded:
  control: "8px"
  action: "10px"
  panel: "12px"
  dialog: "14px"
spacing:
  compact: "6px"
  control: "12px"
  group: "16px"
  panel: "24px"
---

# Design System: PAC-MAN

## Overview

The implemented interface pairs an arcade maze with restrained tool panels. Deep blue-black surfaces, yellow actions, and geometric headings establish continuity between the landing page, game, manual, and laboratory. Cyan distinguishes laboratory details and keyboard focus.

Source of truth: `src/styles/tokens.css`, `src/styles/global.css`, and the component and page CSS modules. These notes describe source styles; full browser and build verification remains blocked by unavailable npm dependencies and DNS `ENOTFOUND`. Syntax validation of 17 files and the connected, reproducible preview path passed in the implementation pass.

## Colors

Yellow is the primary action, selected-navigation, score, and route color. Cyan supports laboratory links, inspector details, and the global focus outline. Success and danger distinguish result and goal states. Terrain colors encode the four terrain categories.

Neutral surfaces separate the page, controls, and raised regions. Primary text carries headings and values; secondary text carries explanations; muted text carries supporting metadata. Borders define groups without making every section a card. Maze rendering also contains local drawing colors; do not replace those with unrelated interface accents.

## Typography

Space Grotesk is the display family, with the Inter/system sans stack as fallback. Inter is the body and control family. The frontmatter records actual desktop roles: the home headline, manual headline, laboratory title, manual body, landing introduction, and navigation. These roles are contextual samples, not a universal size assignment to every heading.

Headings use balanced wrapping. Scores, comparison tables, step counters, and coordinates use tabular numerals where declared. Manual prose is limited to (72ch); the landing introduction is limited to (440px) on desktop and (44ch) on mobile. Responsive headline sizes remain defined in the page modules.

## Layout

The landing container caps at (1440px), with fluid horizontal padding and a two-column hero that becomes one column at (700px). The sticky navigation uses a desktop row, then a separate four-item navigation row at (760px). Its active item has a yellow underline.

The laboratory caps at (1600px). Its three-column workspace becomes two columns at (1250px), with inspection below, then one column at (760px), ordered controls, canvas, inspection. The manual caps at (1240px), with sticky topic navigation that becomes horizontal scrolling navigation at (800px). Game status content caps at (1000px); the square game canvas also responds to viewport height. Touch controls appear on mobile or coarse pointers.

Group spacing commonly uses (12px), (16px), and (24px); page grids also use (28px) and (30px). Preserve the observed responsive rules rather than applying one breakpoint to every surface.

## Elevation & Depth

Depth comes primarily from dark tonal layering and fine borders. The large shadow token is used by the game-details popover. Small and medium shadows remain available in the token source but are not a default treatment for cards. Motion and exact shadow values are recorded in the sidecar.

## Shapes

Controls use softly rounded corners, commonly the control radius. Landing actions and canvas frames use the action radius; information panels use the panel radius; preview and result-dialog frames use the dialog radius. Small legend dots are circular. The yellow brand mark is a clipped circle with an open mouth, matching the maze identity.

## Components

- **Buttons:** Landing actions are at least (52px) high with (0 18px) padding. Yellow primary actions darken their text and lighten on hover; secondary actions have a visible border and gain an elevated surface on hover. Laboratory play controls are at least (44px) high. Disabled buttons reduce opacity to (0.45).
- **Inputs and selection controls:** Seed fields use a dark surface, border, control radius, and a minimum height of (44px). Selected algorithm and mode buttons use a translucent yellow fill, yellow text, and a stronger border. Input accents and carets use yellow.
- **Focus:** Buttons, links, inputs, summaries, and focusable main regions receive a cyan (2px) outline offset by (4px). Keep this visible independently of hover styling.
- **Panels and dialogs:** HUD, examples, and contextual information use tonal surfaces. Game result dialogs use bordered panels inside a scrollable canvas overlay. Laboratory groups often use whitespace and divider lines rather than individual filled cards.
- **Maze preview:** The responsive SVG has blue maze walls, a yellow route, metrics beneath, and a caption separated by a rule. Its path tracing and the landing reveal run only when reduced motion is not requested.
- **Motion:** Button color transitions are short; arrow movement is slight. Reduced-motion preferences disable animations and transitions and remove smooth scrolling.

## Do's and Don'ts

- **Do** retain the dark surface hierarchy, yellow play identity, and cyan laboratory/focus accent.
- **Do** preserve visible keyboard focus, responsive workspace ordering, and reduced-motion behavior.
- **Do** use the existing display/body families and tabular numerals for changing metrics.
- **Don't** add shadows to every section or flatten all surface levels into one background.
- **Don't** promote local maze drawing colors or isolated component values into new global tokens without checking their use.
