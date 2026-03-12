# APHELION Frontend

React 18 + TypeScript + TailwindCSS options research platform.

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript (strict) |
| Styling | TailwindCSS v3 + custom design tokens |
| State | Zustand (persisted watchlists + prefs) |
| Data fetching | TanStack Query v5 |
| Charts | TradingView Widget (price) · Recharts (custom) |
| Animations | Framer Motion |
| Toasts | react-hot-toast |
| Icons | Lucide React |
| Routing | React Router v6 |

## Pages

| Route | Page | Notes |
|-------|------|-------|
| `/` | **Hub** | News feed + AI Digest + Rec cards (primary landing) |
| `/screener` | **Screener** | Filter + scan recommendation engine |
| `/research/:ticker` | **Research** | Chart, options chain, P&L simulator, news |
| `/watchlist` | **Watchlist** | Manage lists + alerts |
| `/news` | **News Hub** | Full news aggregator + sector sentiment |
| `/settings` | **Settings** | Alerts, data sources, appearance |

## Dev

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview prod build
```

## Key Components

- **RecommendationCard** — Conviction cards with score bar, signal breakdown, TOS copy
- **TosButton** — One-click TOS symbol copy with toast confirmation
- **AiDigestPanel** — AI catalyst digest with watchlist entries
- **NewsItem** — Collapsible news items with AI signal links
- **TradingViewChart** — TradingView widget integration
- **SectorPulse** — Sector sentiment bar chart

## TOS Symbol Format

```
.AAPL260418C195  →  AAPL Apr 18 2026 $195 Call
.SPY260404P580   →  SPY Apr 4 2026 $580 Put
```

## Design Tokens

See `src/index.css` and `tailwind.config.js` for full token system.
Colors, spacing, shadows all match `COMPONENT_TOKENS.md` spec.

## Backend Integration

When Backend Rex has the API ready:
1. Replace `src/data/mockData.ts` calls with React Query hooks
2. API base URL goes in `src/config.ts` (to be created)
3. WebSocket for live prices connects in `src/hooks/useMarketFeed.ts`

---
*Built by UI Rex · APHELION v0.1 · 2026-03-12*
