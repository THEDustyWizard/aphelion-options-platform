# APHELION — UI/UX Design Specification
**Version:** 0.1 | **Designer:** UI Rex | **Date:** 2026-03-12

---

## Layout Decision (Pending APHELION Confirmation)

Three options were evaluated:

| Layout | Primary Panel | Best For |
|--------|--------------|----------|
| **Research Station** ← recommended | Options Analysis | Deep-dive, thesis-driven traders |
| **News-First** | News Feed | Reactive, catalyst-driven traders |
| **Recommendation Hub** | AI Picks | Passive, signal-following traders |

**Chosen Default:** Research Station — fits "research/recommendation + news aggregation" framing best. Modular panels allow any layout to be user-configurable via drag-and-drop.

---

## Color Palette & Design Language

```
Primary Background:    #0D0F14  (near-black navy)
Secondary Background:  #141720  (dark slate)
Card/Panel Background: #1C2030  (charcoal)
Border/Divider:        #2A3050  (subtle blue-grey)

Accent — Bullish:      #00E5A0  (cyan-green)
Accent — Bearish:      #FF4D6D  (coral red)
Accent — Neutral:      #6C8EEF  (periwinkle blue)
Accent — Warning:      #FFB547  (amber)
Accent — Primary CTA:  #7C6FF7  (violet)

Text Primary:          #E8EAF0  (near-white)
Text Secondary:        #8892A4  (muted grey)
Text Muted:            #4A5568  (dark grey)

Font — Display:        "Inter" or "DM Sans"
Font — Mono (data):    "JetBrains Mono" or "Fira Code"
Font — Body:           "Inter"
```

**Design Tokens:**
- Border radius: 8px (cards), 4px (chips/tags), 16px (modals)
- Spacing unit: 8px base grid
- Shadow: `0 2px 12px rgba(0,0,0,0.4)`
- Transitions: 150ms ease-out

---

## Application Shell

```
┌─────────────────────────────────────────────────────────────────────────┐
│ NAVBAR (56px, sticky)                                                    │
│ [🦅 APHELION]  [Dashboard] [Screener] [Watchlist] [News] [Settings]    │
│                                          [Search...........] [👤 APHELION]│
└─────────────────────────────────────────────────────────────────────────┘
│                                                                          │
│  MAIN CONTENT AREA (flex, scrollable per-panel)                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
│ STATUS BAR (28px, fixed bottom)                                          │
│ [● LIVE] SPY: 598.23 ▲0.4%  QQQ: 512.10 ▼0.1%  VIX: 18.4  [Last Sync: 14s ago]│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Page 1: Dashboard (Research Station Layout)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                                        │
├─────────────────┬────────────────────────────────┬───────────────────────────┤
│                 │                                │                           │
│  LEFT SIDEBAR   │     CENTER — RESEARCH CANVAS   │   RIGHT SIDEBAR           │
│  (280px, fixed) │     (flex, fills remaining)    │   (320px, fixed)          │
│                 │                                │                           │
├─────────────────┼────────────────────────────────┼───────────────────────────┤
│                 │                                │                           │
│ WATCHLIST PANEL │  TOP ROW: Recommendation Cards │  NEWS FEED PANEL          │
│                 │                                │                           │
│ ┌─────────────┐ │ ┌──────────┐ ┌──────────┐     │ ┌─────────────────────┐   │
│ │ My Lists ▾  │ │ │🔥 HIGH   │ │📊 MEDIUM │     │ │ 📰 Market News      │   │
│ └─────────────┘ │ │CONVICTION│ │CONVICTION│ ... │ │ ─────────────────── │   │
│                 │ │          │ │          │     │ │ [Filters: All Sectors│   │
│ ● Tech Plays   │ │ AAPL     │ │ MSFT     │     │ │  ▾] [Options ●]     │   │
│   AAPL  ▲2.1%  │ │ Call 195 │ │ Put 420  │     │ │ ─────────────────── │   │
│   NVDA  ▲0.8%  │ │ Apr 18   │ │ May 16   │     │ │ ● Fed signals pause │   │
│   META  ▼0.3%  │ │ ⭐⭐⭐⭐⭐  │ │ ⭐⭐⭐⭐   │     │ │   12m ago · Reuters │   │
│   GOOGL ▲1.2%  │ │ Conf: 87%│ │ Conf: 72%│     │ │   [AAPL] [RATES]    │   │
│ ─────────────  │ └──────────┘ └──────────┘     │ │ ─────────────────── │   │
│ ● Macro Hedges │                                │ │ ● NVDA earnings beat│   │
│   SPY   ▲0.4%  │  BOTTOM SECTION: Analysis      │ │   34m ago · Bloomberg│   │
│   QQQ   ▼0.1%  │  ┌─────────────┬────────────┐ │ │   [NVDA] [EARNINGS] │   │
│   TLT   ▲0.6%  │  │ SELECTED:   │ OPTIONS    │ │ │ ─────────────────── │   │
│ ─────────────  │  │ AAPL        │ CHAIN SNAP │ │ │ ● VIX spikes above  │   │
│ + New List     │  │ ─────────── │ ─────────  │ │ │   20 on macro fear  │   │
│                 │  │ Chart (1D) │ Strike│IV  │ │ │   1h ago · CNBC     │   │
│ SECTOR HEAT    │  │ [sparkline]│ 185C  │32% │ │ │   [VIX] [MACRO]     │   │
│ ┌───────────┐  │  │            │ 190C  │28% │ │ │ ─────────────────── │   │
│ │ Tech  ▲2% │  │  │ Vol: 48M  │ 195C ●│26% │ │ │ ● TSLA downgrade    │   │
│ │ Fin   ▲1% │  │  │ IV Rank:68│ 200C  │24% │ │ │   2h ago · MS       │   │
│ │ Health▼1% │  │  │ Earn: Apr9│ 205C  │22% │ │ │   [TSLA] [RATINGS]  │   │
│ │ Energy▲3% │  │  │            │ ─────────  │ │ └─────────────────────┘   │
│ │ Util  ▼2% │  │  │ Greeks:   │ Exp: Apr18│ │                           │
│ └───────────┘  │  │ Δ:+0.52   │ OI: 12,400│ │ AI CATALYST DIGEST        │
│                 │  │ Γ:+0.08   │ Vol:  3,200│ │ ┌─────────────────────┐   │
│ ALERTS         │  │ θ:-0.18   └────────────┘ │ │ 🤖 3 high-impact     │   │
│ ┌───────────┐  │  │ Vega:+0.31              │ │ │ catalysts detected  │   │
│ │⚡ AAPL IV │  │  └─────────────────────────┘ │ │ for your watchlist  │   │
│ │  spike >30│  │                                │ │ [View Digest →]     │   │
│ │⚡ VIX >20 │  │  [Export to TOS] [Save Thesis]│ │ └─────────────────────┘   │
│ └───────────┘  │                                │                           │
└─────────────────┴────────────────────────────────┴───────────────────────────┘
```

---

## Page 2: Screener / Recommendation Engine

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ SCREENER HEADER                                                               │
│ [🔍 Screener & Signals]  [Run Fresh Scan ▶]  [Last run: 2m ago]  [⚙ Filters]│
├──────────────────────────────────────────────────────────────────────────────┤
│ FILTER BAR (collapsible)                                                      │
│ Sectors: [All ▾]  Strategy: [All ▾]  DTE: [14-45 ▾]  IV Rank: [>50 ▾]      │
│ Min Score: [70 ─────●─── 100]  Option Type: [Calls ✓] [Puts ✓] [Spreads ✓] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ RECOMMENDATION TABLE                                                          │
│ ┌──────┬──────────────────┬────────┬────────┬──────┬───────┬──────┬────────┐ │
│ │Score │ Ticker / Trade   │ Type   │ Exp    │ IV Rk│ P&L   │ Risk │ Action │ │
│ ├──────┼──────────────────┼────────┼────────┼──────┼───────┼──────┼────────┤ │
│ │ ████ │ AAPL 195C        │ Long   │ Apr 18 │  68  │ +$340 │ LOW  │[Analyze│ │
│ │  87  │ Apple Inc        │ Call   │ 37 DTE │      │ est.  │      │  ►]    │ │
│ ├──────┼──────────────────┼────────┼────────┼──────┼───────┼──────┼────────┤ │
│ │ ███▌ │ NVDA Bull Spread │ Spread │ May 16 │  74  │ +$220 │ MED  │[Analyze│ │
│ │  82  │ Nvidia Corp      │ CS     │ 65 DTE │      │ est.  │      │  ►]    │ │
│ ├──────┼──────────────────┼────────┼────────┼──────┼───────┼──────┼────────┤ │
│ │ ███  │ SPY 580P         │ Long   │ Apr 04 │  55  │ +$180 │ MED  │[Analyze│ │
│ │  76  │ S&P 500 ETF      │ Put    │ 23 DTE │      │ est.  │      │  ►]    │ │
│ └──────┴──────────────────┴────────┴────────┴──────┴───────┴──────┴────────┘ │
│                                                                               │
│ [← Prev]  Page 1 of 4  [Next →]   Showing 3 of 14 results                  │
│                                                                               │
│ SIGNAL BREAKDOWN (selected row)                                               │
│ ┌────────────────────────────────────────────────────────────────────────┐   │
│ │ AAPL 195C — Signal Breakdown                                           │   │
│ │ ─────────────────────────────────────────────────────────────────────  │   │
│ │ Momentum Score:      ████████░░  78%   ↑ Price trend strong           │   │
│ │ IV Analysis:         ███████░░░  70%   ↑ IV Rank elevated, call cheap  │   │
│ │ News Sentiment:      █████████░  88%   ↑ 4 bullish catalysts 48h      │   │
│ │ Earnings Risk:       ████░░░░░░  40%   ⚠ Earnings Apr 9 (pre-exp)     │   │
│ │ Technical Setup:     ████████░░  80%   ↑ Breakout above 50-day MA     │   │
│ │ Options Flow:        ███████░░░  72%   ↑ Unusual call sweep detected  │   │
│ │ ─────────────────────────────────────────────────────────────────────  │   │
│ │ COMPOSITE SCORE:     87 / 100                                          │   │
│ │ THESIS: Strong momentum + elevated IV rank + bullish news = high       │   │
│ │ probability setup for April call. Risk: pre-earnings binary event.     │   │
│ │ [Save to Watchlist]  [Export TOS Order]  [Open Full Analysis ▶]        │   │
│ └────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Page 3: Full Ticker Analysis View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR                           [← Back to Dashboard]                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ TICKER HEADER                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐  │
│ │ AAPL  Apple Inc.                                                        │  │
│ │ $191.42  ▲ +$3.82 (+2.03%)   NASDAQ   Market Cap: $2.89T               │  │
│ │ [⭐ Watchlist]  [🔔 Alert]  [📋 Save Thesis]  [↗ Open in TOS]          │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────┬────────────────────────────────────────────────┤
│ CHART PANEL (60%)           │ RIGHT COLUMN (40%)                              │
│                             │                                                 │
│ [1D][1W][1M][3M][1Y][5Y]   │ RECOMMENDATION CARD                            │
│ [Indicators ▾]              │ ┌─────────────────────────────────────────┐    │
│                             │ │ 🔥 TOP PICK: AAPL Apr 18 $195 Call      │    │
│  ┌─────────────────────┐   │ │ Score: 87/100  ⭐⭐⭐⭐⭐                  │    │
│  │                     │   │ │ Ask: $2.45    Break-even: $197.45        │    │
│  │    [Price Chart]    │   │ │ Max Profit: Unlimited                    │    │
│  │                     │   │ │ Max Loss: $245/contract                  │    │
│  │  ──/\/\/─────/\/─   │   │ │ [View Full Thesis ▾]                    │    │
│  │                     │   │ └─────────────────────────────────────────┘    │
│  └─────────────────────┘   │                                                 │
│                             │ OPTIONS CHAIN                                   │
│ KEY METRICS                 │ ┌─────────────────────────────────────────┐    │
│ ┌──────┬──────┬──────────┐ │ │ Exp: [Apr 18 ▾]  Show: [Calls+Puts ▾] │    │
│ │ IV   │IV Rk │ HV30     │ │ │ ────────────────────────────────────── │    │
│ │ 26%  │  68  │  22%     │ │ │ Strike  Bid   Ask   Delta   IV    OI   │    │
│ ├──────┼──────┼──────────┤ │ │ 185C    7.20  7.35  +0.72  28%  8.4k  │    │
│ │ Vol  │ OI   │ P/E      │ │ │ 190C    3.80  3.95  +0.58  27%  12.1k │    │
│ │ 58M  │ 234k │  31.2    │ │ │●195C    1.85  2.00  +0.42  26%  15.2k │    │
│ └──────┴──────┴──────────┘ │ │ 200C    0.75  0.85  +0.28  25%  9.8k  │    │
│                             │ │ 205C    0.25  0.32  +0.14  24%  6.1k  │    │
│ GREEKS (live)               │ │ ────────────────────────────────────── │    │
│ ┌────────────────────────┐ │ │ 185P    1.05  1.15  -0.28  30%  4.2k  │    │
│ │ Delta:  +0.42          │ │ │ 190P    2.40  2.55  -0.42  28%  7.8k  │    │
│ │ Gamma:  +0.08          │ │ │ 195P    4.20  4.35  -0.58  27%  5.1k  │    │
│ │ Theta:  -$0.18/day     │ │ └─────────────────────────────────────────┘    │
│ │ Vega:   +$0.31         │ │                                                 │
│ │ Rho:    +$0.04         │ │ P&L SIMULATOR                                   │
│ └────────────────────────┘ │ ┌─────────────────────────────────────────┐    │
│                             │ │ Stock Price: [$191 ─────●──────── $210] │    │
│ UPCOMING CATALYSTS          │ │ Days to Exp: [37 ●──────────────────0 ] │    │
│ ┌────────────────────────┐ │ │ IV Change:   [-10% ──●─────────── +20%] │    │
│ │ ⚡ Apr 9 - Q2 Earnings  │ │ │ ────────────────────────────────────── │    │
│ │ 📅 Apr 4 - Product Rev  │ │ │ Estimated P&L: +$340 (139% return)     │    │
│ │ 📊 Apr 2 - WWDC teaser  │ │ │ [Chart P&L Surface ▾]                  │    │
│ └────────────────────────┘ │ └─────────────────────────────────────────┘    │
├─────────────────────────────┴────────────────────────────────────────────────┤
│ NEWS FEED (ticker-filtered)                                                   │
│ ┌─────────────────────────────────────────────────────────────────────────┐  │
│ │ [All] [Earnings] [Analyst] [Options Flow] [SEC] [Social]               │  │
│ │ ────────────────────────────────────────────────────────────────────── │  │
│ │ ● AAPL: Analyst upgrades to Buy, raises PT to $215  — Goldman Sachs    │  │
│ │   Sentiment: 🟢 Bullish  |  Impact: HIGH  |  14m ago                  │  │
│ │ ● Apple secures new AI chip supply deal with TSMC for 2nm process...   │  │
│ │   Sentiment: 🟢 Bullish  |  Impact: MED   |  2h ago                   │  │
│ │ ● Unusual options activity: $5M+ in April 200C purchased at ask        │  │
│ │   Sentiment: 🟢 Bullish  |  Impact: HIGH  |  3h ago                   │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Page 4: News Aggregator (Full View)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ NEWS HUB HEADER                                                               │
│ [📰 Market News]  Search news... [🔍]   [⚙ Customize Feed]   [🔄 Auto-refresh ON]│
├──────────────────────────────────────────────────────────────────────────────┤
│ FILTER ROW                                                                    │
│ Sectors: [All] [Tech] [Fin] [Energy] [Health] [Macro] [Crypto]               │
│ Sources: [All] [Reuters] [Bloomberg] [CNBC] [WSJ] [SEC] [Benzinga] [Options] │
│ Impact:  [All] [🔴 HIGH] [🟡 MED] [🟢 LOW]   Watchlist Only: [○]             │
├─────────────────────────────┬────────────────────────────────────────────────┤
│ FEED COLUMN (60%)           │ AI DIGEST PANEL (40%)                           │
│                             │                                                 │
│ ● BREAKING: Fed holds rates │ 🤖 AI Catalyst Digest                          │
│   🔴 HIGH | Reuters | 2m    │ ┌─────────────────────────────────────────┐    │
│   Tickers: [SPY] [TLT] [GLD]│ │ Generated 15m ago for YOUR watchlist    │    │
│   ─────────────────────── │ │ ─────────────────────────────────────── │    │
│ ● NVDA beats Q4 by 18%     │ │ 📌 AAPL — Bullish bias                  │    │
│   🔴 HIGH | Bloomberg | 8m  │ │ 3 bullish signals in last 24h:          │    │
│   Tickers: [NVDA] [AMD]    │ │ analyst upgrade, options flow, supply   │    │
│   ─────────────────────── │ │ chain news. Pre-earnings caution Apr 9. │    │
│ ● VIX spikes above 20       │ │ ─────────────────────────────────────── │    │
│   🟡 MED | CNBC | 22m       │ │ 📌 NVDA — Bullish bias                  │    │
│   Tickers: [VIX] [SPY] [QQQ]│ │ Earnings beat removes uncertainty.     │    │
│   ─────────────────────── │ │ IV likely to contract. Watch 900C.     │    │
│ ● TSLA China sales miss Q1  │ │ ─────────────────────────────────────── │    │
│   🔴 HIGH | Reuters | 45m   │ │ 📌 TLT — Neutral/Bearish               │    │
│   Tickers: [TSLA]          │ │ Fed hold removes rate cut catalyst.    │    │
│   ─────────────────────── │ │ Watch 10Y yield for direction.         │    │
│ ● META releases AI video    │ │ ─────────────────────────────────────── │    │
│   🟡 MED | Verge | 1h       │ │ [Regenerate] [Customize Tickers]       │    │
│   Tickers: [META] [GOOGL]  │ └─────────────────────────────────────────┘    │
│   ─────────────────────── │                                                 │
│ ● Options: $12M sweep MSFT  │ TRENDING TICKERS (by news volume)              │
│   🟡 MED | Unusual Whales   │ ┌─────────────────────────────────────────┐    │
│   Tickers: [MSFT]          │ │ 1. NVDA  ████████████  47 articles      │    │
│   ─────────────────────── │ │ 2. AAPL  ████████░░░░  31 articles      │    │
│                             │ │ 3. TSLA  ██████░░░░░░  22 articles      │    │
│ [Load More ▾]              │ │ 4. SPY   ████░░░░░░░░  18 articles      │    │
│                             │ │ 5. META  ███░░░░░░░░░  14 articles      │    │
│                             │ └─────────────────────────────────────────┘    │
│                             │                                                 │
│                             │ SECTOR SENTIMENT (24h)                          │
│                             │ ┌─────────────────────────────────────────┐    │
│                             │ │ Tech    🟢 Bullish  (score: +0.72)      │    │
│                             │ │ Finance 🟢 Bullish  (score: +0.45)      │    │
│                             │ │ Energy  🟡 Neutral  (score: +0.08)      │    │
│                             │ │ Health  🔴 Bearish  (score: -0.31)      │    │
│                             │ │ Macro   🔴 Bearish  (score: -0.55)      │    │
│                             │ └─────────────────────────────────────────┘    │
└─────────────────────────────┴────────────────────────────────────────────────┘
```

---

## Component Library

### Recommendation Card (reused across app)
```
┌──────────────────────────────────────┐
│ 🔥 HIGH CONVICTION                   │
│ AAPL Apr 18 $195 Call                │
│ ────────────────────────────────────  │
│ Score:    ████████▌░  87/100         │
│ Sentiment ████████░░  🟢 Bullish     │
│ IV Setup: ███████░░░  Favorable      │
│ ────────────────────────────────────  │
│ Ask: $2.45   Break-even: $197.45     │
│ DTE: 37 days   IV Rank: 68           │
│ ────────────────────────────────────  │
│ [Analyze ►]        [Save ⭐]         │
└──────────────────────────────────────┘
```

### News Item (compact)
```
┌──────────────────────────────────────┐
│ 🔴 HIGH  │ Reuters │ 4m ago          │
│ Fed holds rates at 5.25-5.50%        │
│ Short summary of article here...      │
│ [SPY] [TLT] [GLD] [MACRO]            │
│ Sentiment: ⚖️ Neutral for equities   │
└──────────────────────────────────────┘
```

### Sector Heatmap Cell
```
┌────────┐  ┌────────┐  ┌────────┐
│ TECH   │  │  FIN   │  │ HEALTH │
│ +2.1%  │  │ +0.9%  │  │ -0.8%  │
│🟢 dark │  │🟢 mid  │  │🔴 mid  │
└────────┘  └────────┘  └────────┘
```

### Alert Toast
```
┌────────────────────────────────────────┐
│ ⚡ Alert: AAPL IV Rank crossed 70      │
│ Current: 71  |  Your threshold: 70     │
│ [View AAPL ►]              [Dismiss ✕] │
└────────────────────────────────────────┘
```

---

## Navigation & Workflow

### Primary Navigation
```
Dashboard → entry point, overview + quick access
Screener  → AI recommendation engine, filter + scan
Watchlist → manage lists, set alerts
News      → full news aggregator
Settings  → alert thresholds, data sources, preferences
```

### Key User Flows

**Flow 1: Morning Research Session**
```
Open Dashboard → Check AI Digest → Review top recs → 
Click ticker → Full Analysis → Options chain → P&L simulator → 
"Export to TOS" → Trade on ThinkOrSwim
```

**Flow 2: News-Driven Opportunity**
```
News alert fires → Click news item → See affected tickers → 
Click ticker → Check recommendation score → 
Verify options chain → Export to TOS
```

**Flow 3: Screener-Driven Scan**
```
Open Screener → Set filters (sector/DTE/IV Rank) → 
Run scan → Sort by score → Click best setup → 
Full analysis → Save to watchlist
```

---

## Export to ThinkOrSwim (Key Integration)

Since execution is on TOS, not APHELION, the export flow matters:

```
On any recommendation or options chain row:
[Export to TOS] button

→ Generates TOS symbol format: .AAPL240418C195
→ Copy-to-clipboard with one click
→ Optional: deep link if TOS API allows (thinkorswim://symbol=...)
→ Shows "How to enter this order in TOS" tooltip for new users
```

---

## Responsive Layout Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| > 1440px  | Full 3-column (sidebar + canvas + news) |
| 1024-1440 | 2-column (canvas + collapsed news) |
| 768-1024  | 1-column + tabs for panels |
| < 768     | Mobile: stacked, drawer navigation |

---

## Data Requirements (for Backend Rex)

| Feature | Data Source | Update Freq |
|---------|------------|-------------|
| Price quotes | Yahoo Finance / Polygon | 15s delay or real-time |
| Options chain | Tradier / Tastytrade API | 1-5 min |
| News feed | NewsAPI + Alpha Vantage | Real-time |
| Sentiment analysis | NLP on news text | Per article |
| Recommendation scores | Quant Rex algorithm | On-demand / scheduled |
| IV Rank | Calculated from options history | Daily |
| Options flow (unusual) | Unusual Whales / internal | Real-time |
| Sector sentiment | Aggregated from news | Hourly |

---

## Tech Stack Recommendation (for Backend Rex)

**Frontend:**
- React 18 + TypeScript
- TailwindCSS (fits dark theme token system)
- Recharts or TradingView Lightweight Charts (price charts)
- React Query (data fetching + caching)
- Zustand (state management)
- Framer Motion (smooth panel transitions)

**Charts:**
- TradingView Lightweight Charts (price — free, professional look)
- Recharts (P&L simulator, sector heat, bar charts)

**Key UI Libraries:**
- Radix UI primitives (accessible dropdowns, modals)
- react-table (options chain, screener table)
- react-hot-toast (alert toasts)

---

## Open Questions for APHELION / ClawZilla

1. **Layout preference confirmed?** Research Station is the default recommendation but APHELION may prefer News-First or Recommendation Hub as the landing page.
2. **Data sources / budget?** Some APIs (Bloomberg, Tradier) cost money. Need to know budget or if we use free tiers (Yahoo Finance, NewsAPI free).
3. **Real-time vs delayed?** Real-time options quotes require paid API. 15-min delayed is free. Which is acceptable?
4. **Options flow (unusual activity)?** Unusual Whales costs ~$50/mo. Include or skip?
5. **Mobile priority?** Is this primarily desktop use during market hours, or mobile too?
6. **Dark mode only?** Design assumes dark — confirm no light mode needed.
7. **P&L simulator complexity?** Basic (price slider) or full (IV surface, multi-leg strategies)?

---

*Designed by UI Rex | Pending Quant Rex algorithm specs + Backend Rex implementation*
