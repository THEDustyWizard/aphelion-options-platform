# APHELION — Design Tokens & Component Specs
**For implementation by Backend Rex / Frontend dev**

## CSS Custom Properties

```css
:root {
  /* Backgrounds */
  --bg-app:      #0D0F14;
  --bg-secondary:#141720;
  --bg-card:     #1C2030;
  --bg-hover:    #222640;

  /* Borders */
  --border:      #2A3050;
  --border-focus:#7C6FF7;

  /* Accent Colors */
  --bull:        #00E5A0;  /* bullish / positive */
  --bear:        #FF4D6D;  /* bearish / negative */
  --neutral:     #6C8EEF;  /* neutral / info */
  --warning:     #FFB547;  /* warning / caution */
  --primary:     #7C6FF7;  /* CTA buttons, links */
  --high:        #FF4D6D;  /* high impact */
  --med:         #FFB547;  /* medium impact */
  --low:         #00E5A0;  /* low impact */

  /* Text */
  --text-primary:   #E8EAF0;
  --text-secondary: #8892A4;
  --text-muted:     #4A5568;

  /* Typography */
  --font-display: 'Inter', 'DM Sans', sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  /* Spacing (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;

  /* Radius */
  --radius-sm:  4px;   /* chips, tags, badges */
  --radius-md:  8px;   /* cards, panels */
  --radius-lg: 16px;   /* modals, drawers */

  /* Shadows */
  --shadow-card: 0 2px 12px rgba(0,0,0,0.4);
  --shadow-modal: 0 8px 32px rgba(0,0,0,0.6);

  /* Transitions */
  --transition: 150ms ease-out;
  --transition-slow: 300ms ease-out;
}
```

## Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        app: '#0D0F14',
        secondary: '#141720',
        card: '#1C2030',
        hover: '#222640',
        border: '#2A3050',
        bull: '#00E5A0',
        bear: '#FF4D6D',
        neutral: '#6C8EEF',
        warning: '#FFB547',
        primary: '#7C6FF7',
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
};
```

## Score Bar Component

```tsx
// ScoreBar.tsx
interface ScoreBarProps {
  score: number;   // 0-100
  label?: string;
}

// Visual: filled bar with color coding
// 0-39:  red (#FF4D6D)
// 40-69: amber (#FFB547)
// 70-84: blue (#6C8EEF)
// 85-100: green (#00E5A0)
```

## Conviction Levels

| Score Range | Label | Color | Stars |
|-------------|-------|-------|-------|
| 85-100 | 🔥 HIGH CONVICTION | bull green | ⭐⭐⭐⭐⭐ |
| 70-84 | 📊 MEDIUM CONVICTION | neutral blue | ⭐⭐⭐⭐ |
| 55-69 | 📉 LOW CONVICTION | warning amber | ⭐⭐⭐ |
| < 55 | (filtered out by default) | — | — |

## Sentiment Labels

| Value | Label | Icon | Color |
|-------|-------|------|-------|
| > +0.5 | Strongly Bullish | 🟢🟢 | bull |
| +0.2 to +0.5 | Bullish | 🟢 | bull muted |
| -0.2 to +0.2 | Neutral | ⚖️ | neutral |
| -0.5 to -0.2 | Bearish | 🔴 | bear muted |
| < -0.5 | Strongly Bearish | 🔴🔴 | bear |

## News Impact Badges

```
🔴 HIGH  → bg: rgba(255,77,109,0.15)  border: #FF4D6D
🟡 MED   → bg: rgba(255,181,71,0.15)  border: #FFB547
🟢 LOW   → bg: rgba(0,229,160,0.15)   border: #00E5A0
```

## Options Strike Row Highlighting

```
ITM calls:  subtle bull green background
ATM (±1%):  border: primary violet, bold text
OTM:        default styling
Recommended strike: left border accent violet
```

## Layout Grid

```
Dashboard: 280px | flex-1 | 320px
3 columns, all fixed height vh - navbar - statusbar
Each column independently scrollable

Screener: full width, no sidebars
News: 60% | 40% split
Analysis: 60% chart | 40% data
```

## Animation Specs

```
Panel load: fade in 200ms + translate-y 8px → 0
Card hover: scale 1.01, shadow increase, 150ms
Score bar fill: width animation 600ms ease-out on mount
News item new: slide in from top, highlight 2s then fade
Toast: slide in from right, auto-dismiss 5s
```
