# APHELION — User Flows v2.0
*News + Recommendation Hub → Research Drill-down*

---

## Primary Flow: News-Triggered Trade (Most Common)

```
APHELION Hub (landing)
│
├─ User sees BREAKING news: "Fed holds rates"
│  [News item shows: 🤖 Triggered → SPY Apr 580P]
│
├─ User clicks linked rec card: SPY Apr 580P (score: 76)
│  Card expands inline — shows:
│    • Ask, DTE, IV Rank
│    • WHY NOW: Fed hold + VIX spike = put opportunity
│    • Linked news articles
│
├─ User satisfied → clicks [▶ Copy TOS]
│  ✅ Toast: "Copied .SPY240404P580"
│  → User opens ThinkOrSwim, pastes symbol, enters order
│
└─ Optional: [Research ▶] → Full ticker analysis for extra confirmation
```

**Time from news to TOS symbol: under 30 seconds for confident users.**

---

## Secondary Flow: Morning Scan

```
APHELION Hub (morning open)
│
├─ User checks AI Catalyst Digest (top of left column)
│  Reads 3-4 watchlist summaries in 60 seconds
│
├─ Sees AAPL is 🟢 Bullish with new catalyst
│  Clicks [AAPL 195C →] inline link
│
├─ Rec card expands or user goes to Screener
│
├─ Screener: runs fresh scan, sorts by score
│  Top result: AAPL 87/100 — clicks row to expand signal breakdown
│
├─ Reads: "Momentum 78%, Sentiment 88%, Earnings risk ⚠️"
│  Decides to research the earnings risk
│
├─ Clicks [Research ▶]
│  → Research page opens, goes to P&L Simulator tab
│  → Runs IV Crush scenario: still profitable at +$110
│  → Satisfied with risk/reward
│
└─ [▶ Copy TOS] → ThinkOrSwim
```

---

## Tertiary Flow: Deep Dive (Power User)

```
User opens Screener directly
│
├─ Sets filters: Tech sector, Long Call, DTE 30-45, IV Rank >60, Score >75
│
├─ Gets 6 results, sorted by score
│
├─ Clicks each row to expand signal breakdown inline
│  Reviews momentum, flow, earnings risk for each
│
├─ Selects top 2: AAPL 195C and NVDA 900C
│
├─ Opens each in Research: checks P&L simulator, options chain, news
│
├─ Saves both to watchlist with alerts:
│  AAPL: alert if IV Rank crosses 75
│  NVDA: alert if score drops below 70
│
└─ [▶ Copy TOS] for both → enters both orders in TOS
```

---

## Alert Flow

```
Alert fires: "AAPL IV Rank crossed 70"
│
├─ Toast notification appears (if app open)
│  or Push notification (if implemented)
│
├─ User clicks [View AAPL →]
│  → Hub filters to AAPL news + recommendation
│  → OR goes directly to Research/AAPL
│
└─ Decision → TOS or dismiss
```

---

## Hub → Research Navigation Map

```
Hub (News + Recs)
├─→ News item [Research Tickers ▶]   → Research/{TICKER}
├─→ Rec card [Research ▶]            → Research/{TICKER} (pre-selected strike)
├─→ Sector Pulse [Drill into sector →] → Screener (pre-filtered by sector)
├─→ Alert [View →]                   → Research/{TICKER} or Hub filtered

Screener
├─→ Row click (expand)               → inline breakdown
├─→ [Research ▶]                     → Research/{TICKER}

Watchlist
├─→ Ticker row [→]                   → Research/{TICKER}
└─→ Alert [Edit]                     → Alert config modal

Research/{TICKER}
├─→ [← Back to Hub]                  → Hub (preserves scroll position)
├─→ [↗ Open in TOS]                  → TOS deep link (if available)
└─→ [▶ Copy TOS]                     → Clipboard copy + toast
```

---

## State Persistence

- Hub scroll position preserved on back navigation
- Last selected screener filters saved per session
- Watchlist lists remembered across sessions
- Research tab (Overview/Chain/Simulator/News) remembered per ticker
- News read/unread state tracked per session
- Alert states persist across sessions (stored in backend)
