import { formatDistanceToNow, parseISO } from 'date-fns';
import type { ConvictionLevel, NewsSentiment, NewsImpact, DigestBias } from '../types';

// ─── OCC Option Symbol (Schwab-compatible) ────────────────────────────────────
// Format: TICKER YYMMDD C/P STRIKE (e.g., AAPL 260418C00175000)
export function buildOptionSymbol(
  ticker: string,
  expiry: string,     // ISO date: 2026-04-18
  type: 'call' | 'put',
  strike: number
): string {
  const d = new Date(expiry);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const t = type === 'call' ? 'C' : 'P';
  // OCC format: strike * 1000, padded to 8 digits
  const s = String(Math.round(strike * 1000)).padStart(8, '0');
  return `${ticker.padEnd(6)}${yy}${mm}${dd}${t}${s}`;
}

// ─── Copy symbol to clipboard ─────────────────────────────────────────────────
export async function copySymbol(symbol: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(symbol);
  } catch {
    const el = document.createElement('textarea');
    el.value = symbol;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export function fmtPrice(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(n: number, decimals = 1, includeSign = true): string {
  const sign = n >= 0 && includeSign ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

export function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1e9).toFixed(1)}T`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function fmtTimeAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function fmtIv(iv: number): string {
  return `${(iv * 100).toFixed(0)}%`;
}

// ─── Score helpers ────────────────────────────────────────────────────────────
export function scoreColor(score: number): string {
  if (score >= 85) return '#00ff41';   // phosphor green - strong
  if (score >= 70) return '#00aaff';   // terminal blue
  if (score >= 55) return '#ffaa00';   // amber warning
  return '#ff0055';                     // red alert
}

export function convictionLabel(conviction: ConvictionLevel): string {
  switch (conviction) {
    case 'high':   return '🔥 HIGH CONVICTION';
    case 'medium': return '📊 MEDIUM CONVICTION';
    case 'low':    return '📉 LOW CONVICTION';
  }
}

export function convictionStars(conviction: ConvictionLevel): number {
  switch (conviction) {
    case 'high':   return 5;
    case 'medium': return 4;
    case 'low':    return 3;
  }
}

// ─── News helpers ─────────────────────────────────────────────────────────────
export function impactColor(impact: NewsImpact): string {
  switch (impact) {
    case 'breaking': return '#ff0055';
    case 'high':     return '#ff0055';
    case 'med':      return '#ffaa00';
    case 'low':      return '#00ff41';
  }
}

export function impactLabel(impact: NewsImpact): string {
  switch (impact) {
    case 'breaking': return '🔴 BREAKING';
    case 'high':     return '🔴 HIGH';
    case 'med':      return '🟡 MED';
    case 'low':      return '🟢 LOW';
  }
}

export function sentimentLabel(s: NewsSentiment): { label: string; color: string } {
  switch (s) {
    case 'bullish':       return { label: '[BULL]',        color: '#00ff41' };
    case 'mildly_bullish':return { label: '[MILD BULL]',   color: '#00cc33' };
    case 'neutral':       return { label: '[NEUTRAL]',     color: '#00aaff' };
    case 'mildly_bearish':return { label: '[MILD BEAR]',   color: '#ff5577' };
    case 'bearish':       return { label: '[BEAR]',        color: '#ff0055' };
  }
}

export function biasLabel(b: DigestBias): { emoji: string; color: string } {
  switch (b) {
    case 'bullish': return { emoji: '▲', color: '#00ff41' };
    case 'neutral': return { emoji: '━', color: '#00aaff' };
    case 'bearish': return { emoji: '▼', color: '#ff0055' };
  }
}

// ─── P&L estimation ──────────────────────────────────────────────────────────
export function estimatePnl(params: {
  type: 'call' | 'put';
  strike: number;
  ask: number;
  currentPrice: number;
  targetPrice: number;
  dteNow: number;
  dteTarget: number;
  ivNow: number;
  ivChange: number;   // percentage points e.g. 5 = +5%
}): { optionPrice: number; pnl: number; returnPct: number } {
  const { type, strike, ask, currentPrice, targetPrice, dteNow, dteTarget, ivNow, ivChange } = params;
  const ivFuture = Math.max(0.05, ivNow + ivChange / 100);
  const intrinsic = type === 'call'
    ? Math.max(0, targetPrice - strike)
    : Math.max(0, strike - targetPrice);

  // simplified BS approximation using intrinsic + extrinsic decay factor
  const timeRatio = dteTarget / dteNow;
  const extrinsicDecay = ask * (1 - intrinsic / (ask * 2)) * Math.sqrt(timeRatio);
  const ivAdjustment = (ivFuture / ivNow) * extrinsicDecay * 0.5;
  const newOptionPrice = Math.max(0, intrinsic + extrinsicDecay + ivAdjustment - extrinsicDecay * (1 - timeRatio) * 0.3);

  // for display use a simple rough model
  const delta = type === 'call'
    ? (targetPrice > strike ? 0.5 + (targetPrice - strike) / targetPrice * 2 : 0.3)
    : (targetPrice < strike ? 0.5 + (strike - targetPrice) / strike * 2 : 0.3);

  void newOptionPrice;  // reserved for BS approximation upgrade
  const priceMoveGain = (targetPrice - currentPrice) * Math.min(0.9, delta);
  const timeDecay = ask * 0.3 * (1 - dteTarget / dteNow);
  const estimated = Math.max(0.01, ask + (type === 'call' ? priceMoveGain : -priceMoveGain) - timeDecay) * (ivFuture / ivNow);

  const pnl = (estimated - ask) * 100;
  const returnPct = ((estimated - ask) / ask) * 100;
  return { optionPrice: Math.round(estimated * 100) / 100, pnl: Math.round(pnl), returnPct: Math.round(returnPct) };
}

// ─── Misc ────────────────────────────────────────────────────────────────────
export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
