/**
 * APHELION // Schwab API Client
 * Bridges renderer → Electron main → Backend API
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

// ─── Types ─────────────────────────────────────────────────────────────────
export interface SchwabQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest?: number;
  impliedVolatility?: number;
  delta?: number;
  theta?: number;
  gamma?: number;
  vega?: number;
}

export interface SchwabStatus {
  connected: boolean;
  authenticated: boolean;
  message: string;
  accountId?: string;
}

// ─── API Calls ─────────────────────────────────────────────────────────────
export async function getSchwabStatus(): Promise<SchwabStatus> {
  // First check Electron bridge if available
  if (typeof window !== 'undefined' && (window as any).electron?.schwab) {
    return (window as any).electron.schwab.status();
  }
  try {
    const res = await fetch(`${API_BASE}/api/schwab/status`);
    return res.json();
  } catch {
    return { connected: false, authenticated: false, message: 'BACKEND OFFLINE' };
  }
}

export async function getQuote(symbol: string): Promise<SchwabQuote | null> {
  try {
    const res = await fetch(`${API_BASE}/api/schwab/quote/${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getOptionChain(ticker: string, expiry?: string): Promise<SchwabQuote[]> {
  try {
    const params = new URLSearchParams({ ticker });
    if (expiry) params.set('expiry', expiry);
    const res = await fetch(`${API_BASE}/api/schwab/options?${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getMarketHours(): Promise<{ isOpen: boolean; session: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/schwab/market-hours`);
    if (!res.ok) return { isOpen: false, session: 'unknown' };
    return res.json();
  } catch {
    return { isOpen: false, session: 'offline' };
  }
}

// ─── Schwab OAuth helpers (used by settings page) ──────────────────────────
export async function initSchwabAuth(clientId: string, clientSecret: string): Promise<{ authUrl: string }> {
  const res = await fetch(`${API_BASE}/api/schwab/auth/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  return res.json();
}

export async function completeSchwabAuth(code: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/schwab/auth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  return res.json();
}
