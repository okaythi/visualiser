# Nixlabs Brand Guidelines & Design Rules

> **CRITICAL DIRECTIVE FOR THE NEXT AI MODEL**:  
> You are tasked with designing and building an audio visualizer for a song with **28 individual stems** that lives under the domain `*.nixlabs.tech` (specifically `visualiser.nixlabs.tech`).  
> **THIS DOCUMENT CONTAINS DESIGN RULES ONLY.**  
> You must strictly follow every guideline, token, typography hierarchy, and aesthetic standard detailed below. The user demands that this application has the **exact same familiar general look and feel** as the rest of the Nixlabs ecosystem (`nixlabs.tech`, `security.nixlabs.tech`, etc.).  
> **DO NOT** introduce foreign design frameworks, flashy neon party visuals, or arbitrary styling choices.

---

## 1. Aesthetic Philosophy: Utilitarian Engineering Precision

Nixlabs products are defined by an **engineering-grade, precision-instrument aesthetic**. The UI feels like professional laboratory hardware, high-end cryptographic workstations, or aerospace telemetry consoles.

1. **Utilitarian & Minimalist**: Form follows function. Every pixel serves a purpose.
2. **Hairline Precision**: 1px subtle borders define all surfaces and boundaries.
3. **No Decorative Bloat**: Zero glassy neumorphism, zero heavy drop shadows, zero gratuitous gradients, and zero bouncy/springy cartoon animations.
4. **Snappy Micro-interactions**: Hover, focus, and state transitions are fast and immediate (`0.10s` to `0.15s ease`).
5. **Monospace Telemetry**: All technical data, track labels, channel numbers, frequencies, decibel readouts, sample rates, and timestamps are rendered in `Ubuntu Mono`.

---

## 2. Design Tokens & Color Palette

The interface is driven exclusively by vanilla CSS custom properties defined in `src/styles/theme.css`.  
**RULE**: Never hardcode hex/RGB values in components. Always reference CSS variables (`var(--token-name)`).

### Dark Theme (Default & Primary Persona)
The signature Nixlabs pitch/carbon environment. Deep, low-fatigue, ultra-sharp contrast.

| Token | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg` | `#101010` | Root background / deep canvas |
| `--bg-card` | `#151515` | Elevated surfaces: panels, stem cards, track strips |
| `--bg-subtle` | `#181818` | Sunken surfaces: meter tracks, inputs, sidebars |
| `--code-bg` | `#1c1c1c` | Monospace chips, code blocks, technical readouts |
| `--text` | `#e5e5e5` | Primary high-contrast readable text |
| `--text-muted` | `#888888` | Secondary labels, inactive controls, track index metadata |
| `--border` | `#262626` | Hairline 1px borders, separators, grid lines |
| `--border-focus` | `#38bdf8` | Sky Cyan focus rings, active stem indicator, waveform highlights |
| `--link-underline`| `#38bdf8` | Subdomain brand badge highlight (`visualiser`) |
| `--danger` | `#ef4444` | Mute button active, peak clipping (>0 dB), overload alert |
| `--success` | `#22c55e` | Solo button active, playing/streaming active indicator |

### Light Theme (Warm Paper / Cream Persona)
Organic parchment aesthetic matching classic scientific monographs and laboratory notebooks.

| Token | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg` | `#f7f4eb` | Warm organic cream canvas |
| `--bg-card` | `#f2ece0` | Elevated surfaces, cards, stem containers |
| `--bg-subtle` | `#efeae0` | Sunken backgrounds, track troughs |
| `--code-bg` | `#ece6d8` | Monospace tags, chip backgrounds |
| `--text` | `#21201c` | Deep charcoal ink |
| `--text-muted` | `#646059` | Muted labels, secondary indices |
| `--border` | `#dfd8c8` | Muted parchment border |
| `--border-focus` | `#0284c7` | Deep sky cyan accent |
| `--link-underline`| `#0284c7` | Subdomain brand badge highlight |
| `--danger` | `#dc2626` | Red alerts, mute indicator |
| `--success` | `#16a34a` | Green confirmation, solo indicator |

### Theme Mechanics
- The theme is controlled by the `data-theme` attribute on the `<html>` root element (`data-theme="dark"` or `data-theme="light"`).
- Saved in `localStorage.getItem('theme')`.
- Default to `dark` if no stored preference exists.
- The inline script in `index.html` sets this attribute **before** React mounts to eliminate any white/black screen flash.

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
     - `400` (Regular): General text, descriptions, standard labels.
     - `500` (Medium): Section titles, button text, table column headers.
     - `600` (Semi-bold): Major headers, card titles.

2. **`Ubuntu Mono` (Monospace)**:
   - Used for: **All audio engineering telemetry**.
     - Stem channel numbers (`CH 01`, `CH 28`)
     - Stem file names (`kick_in.wav`, `snare_top.wav`, `lead_vox.wav`)
     - Timecodes & transport (`02:45.312 / 04:12.800`)
     - Decibels & signal meters (`-14.2 dBFS`, `+0.3 dB`)
     - Frequencies (`44.1 kHz`, `20 Hz - 20 kHz`)
     - Brand subdomain badge (`visualiser.nixlabs.tech`)
     - Solo / Mute state badges (`[S]`, `[M]`)
     - Status badges (`28 STEMS LOADED`, `BUFFER 512`)

---

## 4. Mandatory Signature UI Elements

Every application under `*.nixlabs.tech` must include these two canonical signature components:

### 4.1. The Brand Header Badge
Located at the top left of the header layout:
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
  - `4px`: Micro-controls, stem index tags, solo/mute pills, icon buttons, VU meter segments.
  - `6px`: Standard buttons (`.btn`), dropdown selects, text inputs, search filters.
  - `8px`: Panels, stem rack cards, master visualizer canvas frame.
  - `9999px`: Floating theme toggle button ONLY. (Do not use full-pill rounded buttons for standard actions).

### Shadows
- **Shadow policy**: Minimalist to none.
- Default: `box-shadow: none;`
- Subtle container elevation (optional): `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);`
- Focus ring: `box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15); border-color: var(--border-focus);`

### Custom Scrollbars
To prevent unsightly default OS scrollbars from destroying the engineering feel:
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

## 6. Specific Design Standards for the 28-Stem Visualizer

When designing the visualizer UI and stem mixing/viewing rack:

### 6.1. Stem Density & Layout Architecture
28 stems represent a high-density audio workflow.
- **Stem Rack / Mixer Board**:
  - Arrange stems in clean, compact horizontal strips or an organized matrix grid.
  - Group stems logically where appropriate (e.g. Drums / Percussion, Bass, Guitars / Keys, Synths, Vocals, FX).
  - Each stem row/card must display:
    - Channel Number: `01` - `28` in `var(--mono)`, color `var(--text-muted)`.
    - Stem Name: Monospace text, truncated cleanly if long with ellipsis.
    - Mini Signal Level / Meter: Utilitarian horizontal or vertical bar.
    - Quick Controls: Solo (`[S]`), Mute (`[M]`), Volume Slider, Pan Indicator.
    - Active waveform / spectrum preview.

### 6.2. Visualizer Canvas Aesthetics
- **Canvas Backdrop**: Must match `var(--bg)` or `var(--bg-card)`. Never use a disconnected pure `#000000` pitch box inside a light theme. Dynamically sample `--bg` and `--border-focus` for canvas drawing.
- **Waveform & Spectral Lines**:
  - Use crisp 1px or 2px vector paths.
  - Primary signal color: `var(--border-focus)` (`#38bdf8` in dark / `#0284c7` in light) or `var(--text)`.
  - Secondary/harmonic lines: `var(--text-muted)` with opacity `0.4` - `0.7`.
  - Overload / Clipping indicator: `var(--danger)` (`#ef4444`).
- **NO Rainbow Neons**: Avoid generic music visualizer rainbow spectrums, spinning 3D rave spheres, or hyper-saturated disco effects. Keep the visualization scientific, like an oscilloscope, spectrum analyzer, or multitrack studio console.

### 6.3. Solo & Mute Button States
- **Solo Button (`S`)**:
  - Inactive: Background `transparent`, border `1px solid var(--border)`, color `var(--text-muted)`.
  - Hover: Border `var(--text-muted)`, color `var(--text)`.
  - Active: Background `rgba(34, 197, 94, 0.15)`, border `1px solid var(--success)`, color `var(--success)`.
- **Mute Button (`M`)**:
  - Inactive: Background `transparent`, border `1px solid var(--border)`, color `var(--text-muted)`.
  - Hover: Border `var(--text-muted)`, color `var(--text)`.
  - Active: Background `rgba(239, 68, 68, 0.15)`, border `1px solid var(--danger)`, color `var(--danger)`.
  - When muted, the stem's meter and waveform should drop to opacity `0.3`.

### 6.4. Sliders (Volume, Panning, Scrubbing)
Custom styled range inputs matching the theme:
- Track: Height `3px`, `background: var(--border)`, border-radius `2px`.
- Thumb: `12px` x `12px` square or slightly rounded (`3px`), `background: var(--text)`, border `1px solid var(--border)`.
- Active fill: `background: var(--border-focus)`.

---

## 7. Negative Constraints (What NEVER to Do)

1. **NO External Heavy UI Libraries**: Do NOT install Tailwind, Material UI, Bootstrap, Mantine, or styled-components. The project is designed with zero-overhead vanilla CSS and CSS variables.
2. **NO Hardcoded Colors**: Do not write `style={{ color: '#fff' }}` or `background: black`. Always use `var(--...)`.
3. **NO Neon Rave Visuals**: Do not implement bright purple/pink rave lasers or chaotic particles. Adhere to the Nixlabs oscilloscope/scientific instrument look.
4. **NO Arbitrary Fonts**: Do not load Roboto, Inter, Arial, or decorative script fonts. Use ONLY `Ubuntu` and `Ubuntu Mono`.
5. **NO Bubble Buttons**: Buttons must use `4px` or `6px` radius. Never `border-radius: 25px` or `50px` on standard buttons.
6. **DO NOT Break Light Mode**: Even though dark mode is preferred for audio production, light mode MUST look crisp, balanced, and readable with the warm cream paper tokens.
