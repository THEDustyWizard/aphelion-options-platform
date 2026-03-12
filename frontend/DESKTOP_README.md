# APHELION Desktop
## OPTIONS INTELLIGENCE TERMINAL
### ██████████████████████ CLASSIFICATION: SECRET ██████████████████████

```
  █████╗ ██████╗ ██╗  ██╗███████╗██╗     ██╗ ██████╗ ███╗   ██╗
 ██╔══██╗██╔══██╗██║  ██║██╔════╝██║     ██║██╔═══██╗████╗  ██║
 ███████║██████╔╝███████║█████╗  ██║     ██║██║   ██║██╔██╗ ██║
 ██╔══██║██╔═══╝ ██╔══██║██╔══╝  ██║     ██║██║   ██║██║╚██╗██║
 ██║  ██║██║     ██║  ██║███████╗███████╗██║╚██████╔╝██║ ╚████║
 ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝
```

Electron-based desktop options trading intelligence platform. CIA terminal aesthetic.
Mac/Linux only. Schwab API integration.

---

## Quick Start

### Development
```bash
cd aphelion/frontend

# Install deps (first time)
npm install

# Launch dev mode (Vite + Electron)
npm run electron:dev
```

This starts Vite dev server on port 5173 and opens the Electron window.

### Production Build
```bash
# Build + package
npm run electron:build

# Mac only
npm run electron:build:mac

# Linux only
npm run electron:build:linux
```

Packaged app output: `aphelion/frontend/release/`

---

## Architecture

```
aphelion/frontend/
├── electron/
│   ├── main.js        # Electron main process (window, IPC, Schwab bridge)
│   └── preload.js     # Context bridge (exposes window.electron to renderer)
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx       # Custom frameless titlebar + clock
│   │   │   ├── Topbar.tsx         # Terminal nav bar
│   │   │   └── MarketStatusBar.tsx # Live market data strip
│   │   └── ui/
│   │       ├── BootScreen.tsx     # CIA terminal boot animation
│   │       └── TosButton.tsx      # Schwab OCC symbol copy button
│   └── utils/
│       └── schwab.ts              # Schwab API client stubs
├── package.json        # Electron + Vite config
├── vite.config.ts      # base: './' required for Electron file:// loading
└── tailwind.config.js  # Terminal color palette
```

---

## Aesthetic

**Colors**
- Background: `#000000` — pure black
- Primary text: `#00ff41` — phosphor green
- Secondary: `#007722` — dim green
- Alerts/bear: `#ff0055` — red alert
- Warnings: `#ffaa00` — amber
- Info: `#00aaff` — terminal blue

**Fonts**
- `VT323` — large headers, ASCII art style
- `Share Tech Mono` — body text, all monospaced

**Effects**
- CRT scanlines overlay (CSS `body::before`)
- Phosphor glow on active text
- Boot sequence animation on launch
- Hard 0px border-radius everywhere (no rounded corners)
- Blinking cursor

---

## Schwab API Integration

The renderer communicates with the backend via:

1. **Direct backend HTTP** (`VITE_BACKEND_URL` env var, default `http://localhost:8000`)
2. **Electron IPC bridge** (for main process auth/credential management)

Configure `VITE_BACKEND_URL` to point to Backend Rex's API server.

Schwab auth flow:
1. Settings → Data Sources → Enter Schwab Client ID + Secret
2. Click "Initialize Auth" → opens browser to Schwab OAuth
3. Paste callback URL code → backend stores tokens

---

## Window Controls

Frameless window uses custom controls in TitleBar:
- `_` — minimize
- `□` — maximize/restore
- `×` — close

Draggable region: entire titlebar except buttons

---

## Environment Variables

```env
VITE_BACKEND_URL=http://localhost:8000   # Backend Rex API
```

---

## Changes from Web Version

| Feature | Before | After |
|---------|--------|-------|
| Platform | Browser/Web | Electron desktop |
| Broker | ThinkOrSwim | Charles Schwab |
| Symbol format | `.AAPL260418C195` (TOS) | `AAPL  260418C00195000` (OCC/Schwab) |
| Window | Browser chrome | Custom frameless terminal titlebar |
| Theme | Dark purple/blue | CIA terminal green/black |
| Font | Inter/JetBrains | VT323/Share Tech Mono |
| Boot | Instant | CIA terminal boot animation |
