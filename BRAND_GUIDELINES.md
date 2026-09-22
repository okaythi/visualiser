# Nixlabs Brand Guidelines & Design Rules

> **DIRECTIVE FOR THE NEXT AI MODEL**:  
> You are building an application under `*.nixlabs.tech` (`visualiser.nixlabs.tech`).  
> **THIS DOCUMENT CONTAINS DESIGN RULES ONLY.**  
> It does not dictate how your tool functions or how features are engineered. However, whatever you build must adhere strictly to these visual design tokens, typography rules, layout geometry, and theme mechanics so that it shares the exact same familiar look and feel as the rest of the Nixlabs ecosystem (`nixlabs.tech`, `security.nixlabs.tech`).

---

## 1. Aesthetic Philosophy: Utilitarian Engineering Precision

Nixlabs interfaces are defined by an **engineering-grade, precision-instrument aesthetic**.

1. **Utilitarian & Minimalist**: Form follows function. Clean, distraction-free surfaces.
2. **Hairline Precision**: Subtle `1px` borders define all surfaces and boundaries.
3. **No Decorative Bloat**: Zero glassy neumorphism, zero heavy drop shadows, zero multi-colored gradients, and zero cartoon animations.
4. **Snappy Micro-interactions**: Hover, focus, and state transitions are fast and immediate (`0.10s` to `0.15s ease`).
5. **Monospace Telemetry**: Technical data, indexes, metadata, identifiers, timestamps, and status readouts are rendered in `Ubuntu Mono`.

---

## 2. Design Tokens & Color Palette

The interface is driven exclusively by vanilla CSS custom properties defined in `src/styles/theme.css`.  
**RULE**: Never hardcode hex/RGB values in components or inline styles. Always reference CSS variables (`var(--token-name)`).

### Dark Theme (Default Persona)
Deep, low-fatigue, ultra-sharp contrast.

| Token | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg` | `#101010` | Root background / canvas |
| `--bg-card` | `#151515` | Elevated panels, cards, modules |
| `--bg-subtle` | `#181818` | Sunken backgrounds, troughs, inputs, sidebars |
| `--code-bg` | `#1c1c1c` | Monospace chips, code blocks, technical readouts |
| `--text` | `#e5e5e5` | Primary high-contrast readable text |
| `--text-muted` | `#888888` | Secondary labels, inactive controls, metadata |
| `--border` | `#262626` | Hairline 1px borders, separators, grid lines |
| `--border-focus` | `#38bdf8` | Sky Cyan focus rings, primary accent, active highlights |
| `--link-underline`| `#38bdf8` | Subdomain brand badge highlight (`visualiser`) |
| `--danger` | `#ef4444` | Warning, error, alert, or destructive state |
| `--success` | `#22c55e` | Success, positive confirmation, or active running state |

### Light Theme (Warm Paper / Cream Persona)
Organic parchment aesthetic matching classic scientific monographs.

| Token | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg` | `#f7f4eb` | Warm organic cream canvas |
| `--bg-card` | `#f2ece0` | Elevated surfaces, cards, containers |
| `--bg-subtle` | `#efeae0` | Sunken backgrounds, subtle troughs |
| `--code-bg` | `#ece6d8` | Monospace tags, chip backgrounds |
| `--text` | `#21201c` | Deep charcoal ink |
| `--text-muted` | `#646059` | Muted labels, secondary indices |
| `--border` | `#dfd8c8` | Muted parchment border |
| `--border-focus` | `#0284c7` | Deep sky cyan accent |
| `--link-underline`| `#0284c7` | Subdomain brand badge highlight |
| `--danger` | `#dc2626` | Warning, alert, or error state |
| `--success` | `#16a34a` | Success or active state |

### Theme Mechanics
- The theme is controlled by the `data-theme` attribute on the `<html>` root element (`data-theme="dark"` or `data-theme="light"`).
- Saved in `localStorage.getItem('theme')`.
- Default to `dark` if no stored preference exists.
- An inline script in `index.html` sets this attribute **before** React mounts to eliminate any white/black screen flash.

---

## 3. Typography & Hierarchy

Nixlabs relies strictly on two font families loaded via Google Fonts:

```css
--sans: 'Ubuntu', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--mono: 'Ubuntu Mono', ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
```

### Font Pairing Rules

1. **`Ubuntu` (Sans-serif)**:
   - Used for: General navigation, titles, section headers, instructions, human-readable prose.
   - Font weights:
     - `400` (Regular): General body copy, standard labels.
     - `500` (Medium): Section titles, button text, table column headers.
     - `600` (Semi-bold): Major headers, card titles.

2. **`Ubuntu Mono` (Monospace)**:
   - Used for: **All technical telemetry and identifiers**.
     - Identifiers, indexes, tags, and channel codes
     - Timestamps, durations, and timecodes
     - Numeric values, units, and measurements
     - Brand subdomain badge (`visualiser.nixlabs.tech`)
     - Status indicators and badges

---

## 4. Mandatory Signature UI Elements

Every application under `*.nixlabs.tech` must include these two canonical elements:

### 4.1. The Brand Header Badge
Located in the application header:
```tsx
<a href="/" className="brand-badge">
  <span className="subdomain">visualiser</span>
  <span className="tld">.nixlabs.tech</span>
</a>
```
- **Typography**: `var(--mono)`, `0.95rem`, font-weight `500`.
- **Styling**:
  - `.subdomain`: `color: var(--link-underline);` (Cyan `#38bdf8` in dark, `#0284c7` in light).
  - `.tld`: `color: var(--text-muted);` or `color: var(--text);`.
  - No text decoration on hover (clean and restrained).

### 4.2. Floating Controls (Theme Toggle)
Fixed at the bottom-right corner:
```css
.floating-controls {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  display: flex;
  gap: 0.5rem;
  z-index: 100;
}
```
- **Appearance**: Circular button (`width: 2.5rem; height: 2.5rem; border-radius: 9999px;`).
- **Surface**: `background-color: var(--bg-subtle); border: 1px solid var(--border); color: var(--text);`.
- **Hover**: `transform: translateY(-1px); border-color: var(--text-muted);`.
- **Iconography**: Inline SVG stroke icons (`stroke: currentColor; fill: none; stroke-width: 2;`).
  - Dark mode renders the **Sun** icon.
  - Light mode renders the **Moon** icon.

---

## 5. Geometry, Spacing & Layout Rules

### Borders & Corners
- **Border width**: Strictly `1px solid var(--border)`. Never 2px or thick border walls.
- **Border Radii Hierarchy**:
  - `4px`: Small badges, tags, chips, micro icon buttons.
  - `6px`: Standard buttons (`.btn`), dropdown selects, text inputs.
  - `8px`: Cards (`.card`), panels, content containers.
  - `9999px`: Floating controls circular button ONLY. (Do not use full-pill bubble shapes for standard action buttons).

### Shadows
- Default: `box-shadow: none;`
- Subtle container elevation (optional): `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);`
- Focus ring: `box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15); border-color: var(--border-focus);`

### Custom Scrollbars
```css
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-muted);
}
```

---

## 6. Negative Constraints (What NEVER to Do)

1. **NO External Heavy UI Libraries**: Do NOT install Tailwind, Material UI, Bootstrap, Mantine, or styled-components. The design system runs strictly on vanilla CSS custom properties in `src/styles/theme.css`.
2. **NO Hardcoded Colors**: Do not use hardcoded hex/RGB colors in JSX or CSS. Always reference semantic CSS variables (`var(--...)`).
3. **NO Arbitrary Fonts**: Do not import Inter, Roboto, or decorative script fonts. Use ONLY `Ubuntu` and `Ubuntu Mono`.
4. **NO Bubble Buttons**: Standard action buttons must use `4px` or `6px` radius. Never bubbly pill shapes (`border-radius: 50px`).
5. **DO NOT Break Light Mode**: All UI surfaces, text, and graphics must dynamically adapt to both dark and light modes via CSS variables.
