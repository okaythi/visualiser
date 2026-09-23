# Nixlabs Project & Design System Directives

This project is part of the Nixlabs ecosystem (`*.nixlabs.tech`). All code and styling must adhere strictly to the following rules:

## Design Rules & CSS Variables
- **NO HARDCODED COLORS**: Never use raw hex values (`#101010`, `#ffffff`), RGB, or utility framework colors in CSS or JSX.
- Always use semantic CSS variables:
  - `--bg`: Root canvas background
  - `--bg-card`: Elevated cards, panels, modules
  - `--bg-subtle`: Inputs, troughs, sunken areas
  - `--code-bg`: Monospace code chips, technical readouts
  - `--text`: Primary high-contrast readable text
  - `--text-muted`: Secondary labels, metadata
  - `--border`: Hairline 1px border (`#262626` dark, `#dfd8c8` light)
  - `--border-focus`: Cyan accent / focus highlight (`#38bdf8` dark, `#0284c7` light)
  - `--success`: Active running state / confirmation (`#22c55e` dark, `#16a34a` light)
  - `--danger`: Error, warning, destructive state (`#ef4444` dark, `#dc2626` light)

## Typography
- `--sans`: `Ubuntu`, sans-serif (used for UI copy, general prose, headers, buttons)
- `--mono`: `Ubuntu Mono`, monospace (used for ALL technical telemetry, timestamps, identifiers, numeric metrics, brand subdomain badges)

## Geometry
- Borders: Strictly `1px solid var(--border)`. No thick 2px borders.
- Radii:
  - `4px`: Chips, badges, tags
  - `6px`: Standard buttons, inputs, dropdowns
  - `8px`: Cards, panels, modal dialogs, menus
  - `9999px`: Avatar circles and floating circular control buttons only

## Ecosystem Continuity & Auth Separation
- `accounts.nixlabs.tech`: The ecosystem Identity Provider (IdP). Manages `_nixlabs_session` domain cookie for SSO across subdomains.
- `security.nixlabs.tech`: The sovereign Master Vault. Protected by Master PIN, Security Questions, Turnstile, and Host-Only cookie (`__Host-_sec_vault`). Ecosystem login DOES NOT automatically unseal the vault.
- Non-apex subdomains feature the floating top-right profile avatar.
