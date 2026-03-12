/**
 * APHELION // Schwab API Routes
 * OAuth, quotes, options chain, market data, account positions
 * Full persistent token storage with AES-256-GCM encryption
 */
import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { SchwabService } from '../services/schwab.service';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('SchwabRoutes');

// ─── Encrypted Persistence ───────────────────────────────────────────────────

const STATE_DIR  = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(STATE_DIR, 'schwab_state.enc');

/** Machine-derived key: node version + machine hostname + static salt */
function getDerivedKey(): Buffer {
  const base = `APHELION::${process.version}::${require('os').hostname()}::SCHWAB_VAULT_2025`;
  return crypto.createHash('sha256').update(base).digest();
}

function encryptData(data: object): string {
  const key   = getDerivedKey();
  const iv    = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc   = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag   = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decryptData(encoded: string): object | null {
  try {
    const buf   = Buffer.from(encoded, 'base64');
    const iv    = buf.slice(0, 12);
    const tag   = buf.slice(12, 28);
    const enc   = buf.slice(28);
    const key   = getDerivedKey();
    const dec   = crypto.createDecipheriv('aes-256-gcm', key, iv);
    dec.setAuthTag(tag);
    const plain = Buffer.concat([dec.update(enc), dec.final()]).toString('utf8');
    return JSON.parse(plain);
  } catch {
    return null;
  }
}

function saveState(state: object): void {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, encryptData(state), 'utf8');
  } catch (e) {
    logger.warn('Could not persist Schwab state:', e);
  }
}

function loadState(): object | null {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    return decryptData(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// ─── Error Log ────────────────────────────────────────────────────────────────

interface ErrorEntry {
  ts: string;
  endpoint: string;
  error: string;
  code?: number;
}

const ERROR_LOG: ErrorEntry[] = [];
const MAX_ERRORS = 50;

function logError(endpoint: string, error: any, code?: number) {
  ERROR_LOG.unshift({
    ts: new Date().toISOString(),
    endpoint,
    error: error?.message || String(error),
    code,
  });
  if (ERROR_LOG.length > MAX_ERRORS) ERROR_LOG.pop();
}

// ─── Rate Limit Tracking ──────────────────────────────────────────────────────

interface RateLimitInfo {
  used: number;
  remaining: number;
  resetAt: string | null;
  max: number;
}

let rateLimitInfo: RateLimitInfo = { used: 0, remaining: 120, resetAt: null, max: 120 };

function extractRateLimits(headers: Record<string, any>) {
  const used      = parseInt(headers['x-ratelimit-used']      || '0', 10);
  const remaining = parseInt(headers['x-ratelimit-remaining'] || '120', 10);
  const max       = parseInt(headers['x-ratelimit-limit']     || '120', 10);
  const reset     = headers['x-ratelimit-reset'] || null;
  rateLimitInfo = { used, remaining, resetAt: reset, max };
}

// ─── Connection State ─────────────────────────────────────────────────────────

interface ConnectionState {
  connected: boolean;
  authenticated: boolean;
  appKey: string;
  appSecret: string;
  callbackUrl: string;
  lastConnected: string | null;
  accountId: string | undefined;
  lastFetch: string | null;
  activeProfileId: string | null;
}

let connectionState: ConnectionState = {
  connected: false,
  authenticated: false,
  appKey: '',
  appSecret: '',
  callbackUrl: 'https://127.0.0.1',
  lastConnected: null,
  accountId: undefined,
  lastFetch: null,
  activeProfileId: null,
};

// ─── Profile Storage ──────────────────────────────────────────────────────────

const PROFILES_FILE = path.join(STATE_DIR, 'schwab_profiles.json');

interface SchwabProfile {
  id: string;
  name: string;
  appKeyMasked: string;   // e.g. "Ab12••••••••••••Xy"
  callbackUrl: string;
  environment: 'production' | 'sandbox';
  isLive: boolean;
  accountNumber?: string;
  createdAt: string;
}

function loadProfiles(): SchwabProfile[] {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return [];
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
  } catch { return []; }
}

function saveProfiles(profiles: SchwabProfile[]) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
  } catch (e) { logger.warn('Could not save profiles:', e); }
}

function maskKey(key: string): string {
  if (key.length <= 6) return '••••••';
  return key.slice(0, 3) + '•'.repeat(key.length - 6) + key.slice(-3);
}

// ─── Service Init ─────────────────────────────────────────────────────────────

const schwabService = new SchwabService();

// Restore persisted state on startup
const persisted = loadState() as any;
if (persisted?.authenticated && persisted?.appKey) {
  process.env.SCHWAB_API_KEY      = persisted.appKey;
  process.env.SCHWAB_API_SECRET   = persisted.appSecret || '';
  process.env.SCHWAB_REDIRECT_URI = persisted.callbackUrl || 'https://127.0.0.1';
  connectionState = { ...connectionState, ...persisted };
  logger.info('Restored Schwab auth state from encrypted storage');
}

// ─── Status ──────────────────────────────────────────────────────────────────

router.get('/status', (_req: Request, res: Response) => {
  res.json({
    connected:     connectionState.connected,
    authenticated: connectionState.authenticated,
    message:       connectionState.authenticated
      ? 'SCHWAB API AUTHENTICATED'
      : connectionState.connected
      ? 'SCHWAB CONNECTED — AUTH PENDING'
      : 'SCHWAB API DISCONNECTED',
    accountId:     connectionState.accountId,
    lastConnected: connectionState.lastConnected,
    lastFetch:     connectionState.lastFetch,
    rateLimits:    rateLimitInfo,
    errorCount:    ERROR_LOG.length,
  });
});

// ─── API Diagnostics ──────────────────────────────────────────────────────────

router.get('/diagnostics', (_req: Request, res: Response) => {
  res.json({
    status: {
      connected:     connectionState.connected,
      authenticated: connectionState.authenticated,
      accountId:     connectionState.accountId,
      lastConnected: connectionState.lastConnected,
      lastFetch:     connectionState.lastFetch,
    },
    rateLimits: rateLimitInfo,
    errors:     ERROR_LOG.slice(0, 20),
    profiles:   loadProfiles(),
  });
});

// ─── Error Log ────────────────────────────────────────────────────────────────

router.get('/errors', (_req: Request, res: Response) => {
  res.json({ errors: ERROR_LOG });
});

router.delete('/errors', (_req: Request, res: Response) => {
  ERROR_LOG.length = 0;
  res.json({ success: true });
});

// ─── OAuth Init ───────────────────────────────────────────────────────────────

router.post('/auth/init', (req: Request, res: Response) => {
  const { clientId, clientSecret, callbackUrl } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId and clientSecret are required' });
  }

  process.env.SCHWAB_API_KEY      = clientId;
  process.env.SCHWAB_API_SECRET   = clientSecret;
  process.env.SCHWAB_REDIRECT_URI = callbackUrl || 'https://127.0.0.1';

  connectionState.appKey      = clientId;
  connectionState.appSecret   = clientSecret;
  connectionState.callbackUrl = callbackUrl || 'https://127.0.0.1';
  connectionState.connected   = true;

  const authUrl = schwabService.getAuthorizationUrl();
  logger.info('Schwab auth initialized');
  res.json({ authUrl });
});

// ─── OAuth Callback ───────────────────────────────────────────────────────────

router.post('/auth/callback', async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Authorization code required' });
  }

  try {
    await schwabService.exchangeCodeForToken(code);
    connectionState.authenticated = true;
    connectionState.lastConnected = new Date().toISOString();

    try {
      const accounts = await schwabService.getAccounts();
      if (accounts.length > 0) {
        connectionState.accountId = accounts[0].accountNumber;
      }
    } catch { logger.warn('Could not fetch accounts after auth'); }

    // Persist encrypted state
    saveState({
      authenticated: true,
      appKey:        connectionState.appKey,
      appSecret:     connectionState.appSecret,
      callbackUrl:   connectionState.callbackUrl,
      lastConnected: connectionState.lastConnected,
      accountId:     connectionState.accountId,
    });

    // Add to profiles if new
    const profiles = loadProfiles();
    const exists = profiles.some(p => p.appKeyMasked === maskKey(connectionState.appKey));
    if (!exists) {
      const newProfile: SchwabProfile = {
        id:          crypto.randomUUID(),
        name:        `Account ${profiles.length + 1}`,
        appKeyMasked: maskKey(connectionState.appKey),
        callbackUrl: connectionState.callbackUrl,
        environment: 'production',
        isLive:      true,
        accountNumber: connectionState.accountId,
        createdAt:   new Date().toISOString(),
      };
      profiles.push(newProfile);
      saveProfiles(profiles);
      connectionState.activeProfileId = newProfile.id;
    }

    logger.info('Schwab OAuth complete — authenticated');
    res.json({ success: true, message: 'SCHWAB API AUTHENTICATED', accountId: connectionState.accountId });
  } catch (err: any) {
    logError('/auth/callback', err);
    logger.error('OAuth callback failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Authentication failed' });
  }
});

// ─── Disconnect ───────────────────────────────────────────────────────────────

router.post('/disconnect', (_req: Request, res: Response) => {
  connectionState = {
    connected: false, authenticated: false,
    appKey: '', appSecret: '', callbackUrl: 'https://127.0.0.1',
    lastConnected: null, accountId: undefined,
    lastFetch: null, activeProfileId: null,
  };
  delete process.env.SCHWAB_API_KEY;
  delete process.env.SCHWAB_API_SECRET;
  delete process.env.SCHWAB_REDIRECT_URI;
  try { if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE); } catch {}
  logger.info('Schwab API disconnected + state cleared');
  res.json({ success: true });
});

// ─── Rate Limits ─────────────────────────────────────────────────────────────

router.get('/rate-limits', (_req: Request, res: Response) => {
  res.json(rateLimitInfo);
});

// ─── Profiles ────────────────────────────────────────────────────────────────

router.get('/profiles', (_req: Request, res: Response) => {
  res.json({ profiles: loadProfiles(), activeProfileId: connectionState.activeProfileId });
});

router.post('/profiles', (req: Request, res: Response) => {
  const { name, environment, isLive } = req.body;
  const profiles = loadProfiles();
  const newProfile: SchwabProfile = {
    id:           crypto.randomUUID(),
    name:         name || `Profile ${profiles.length + 1}`,
    appKeyMasked: connectionState.appKey ? maskKey(connectionState.appKey) : '(not set)',
    callbackUrl:  connectionState.callbackUrl,
    environment:  environment || 'production',
    isLive:       isLive ?? true,
    accountNumber: connectionState.accountId,
    createdAt:    new Date().toISOString(),
  };
  profiles.push(newProfile);
  saveProfiles(profiles);
  res.json({ success: true, profile: newProfile });
});

router.delete('/profiles/:id', (req: Request, res: Response) => {
  const profiles = loadProfiles().filter(p => p.id !== req.params.id);
  saveProfiles(profiles);
  res.json({ success: true });
});

router.patch('/profiles/:id', (req: Request, res: Response) => {
  const profiles = loadProfiles().map(p =>
    p.id === req.params.id ? { ...p, ...req.body } : p
  );
  saveProfiles(profiles);
  res.json({ success: true });
});

router.post('/profiles/:id/activate', (req: Request, res: Response) => {
  connectionState.activeProfileId = req.params.id;
  res.json({ success: true, activeProfileId: req.params.id });
});

// ─── Quote ───────────────────────────────────────────────────────────────────

router.get('/quote/:symbol', async (req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }
  try {
    const quote = await schwabService.getQuote(req.params.symbol.toUpperCase());
    connectionState.lastFetch = new Date().toISOString();
    // Extract rate limit headers if present
    if ((quote as any)?._headers) extractRateLimits((quote as any)._headers);

    res.json({
      symbol:            req.params.symbol.toUpperCase(),
      bid:               quote?.quote?.bidPrice       ?? 0,
      ask:               quote?.quote?.askPrice       ?? 0,
      last:              quote?.quote?.lastPrice      ?? 0,
      volume:            quote?.quote?.totalVolume    ?? 0,
      openInterest:      quote?.reference?.openInterest ?? 0,
      impliedVolatility: quote?.quote?.volatility     ?? null,
      delta:             quote?.quote?.delta          ?? null,
      theta:             quote?.quote?.theta          ?? null,
      gamma:             quote?.quote?.gamma          ?? null,
      vega:              quote?.quote?.vega           ?? null,
      fetchedAt:         connectionState.lastFetch,
    });
  } catch (err: any) {
    logError(`/quote/${req.params.symbol}`, err, err?.response?.status);
    logger.error(`Quote failed for ${req.params.symbol}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Batch Quotes ─────────────────────────────────────────────────────────────

router.post('/quotes', async (req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }
  const { symbols } = req.body as { symbols: string[] };
  if (!symbols?.length) return res.status(400).json({ error: 'symbols array required' });

  const results: Record<string, any> = {};
  await Promise.allSettled(
    symbols.map(async (sym) => {
      try {
        const q = await schwabService.getQuote(sym.toUpperCase());
        results[sym] = {
          bid:   q?.quote?.bidPrice    ?? null,
          ask:   q?.quote?.askPrice    ?? null,
          last:  q?.quote?.lastPrice   ?? null,
          iv:    q?.quote?.volatility  ?? null,
          delta: q?.quote?.delta       ?? null,
          theta: q?.quote?.theta       ?? null,
          gamma: q?.quote?.gamma       ?? null,
          vega:  q?.quote?.vega        ?? null,
        };
      } catch (e: any) {
        logError(`/quotes batch ${sym}`, e);
        results[sym] = null;
      }
    })
  );
  connectionState.lastFetch = new Date().toISOString();
  res.json({ success: true, quotes: results, fetchedAt: connectionState.lastFetch });
});

// ─── Options Chain ────────────────────────────────────────────────────────────

router.get('/options', async (req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }
  const { ticker, expiry } = req.query as Record<string, string>;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });

  try {
    const params: any = { strikeCount: 20, includeQuotes: true };
    if (expiry) { params.fromDate = expiry; params.toDate = expiry; }
    const chain = await schwabService.getOptionChain(ticker.toUpperCase(), params);
    connectionState.lastFetch = new Date().toISOString();

    const results: any[] = [];
    const processMap = (map: Record<string, Record<string, any[]>>, type: 'call' | 'put') => {
      for (const [dateKey, strikes] of Object.entries(map)) {
        for (const [strikeKey, contracts] of Object.entries(strikes)) {
          for (const c of contracts) {
            results.push({
              symbol: c.symbol, type,
              strike: parseFloat(strikeKey),
              expiry: dateKey.split(':')[0],
              bid: c.bid ?? 0, ask: c.ask ?? 0, last: c.last ?? 0,
              volume: c.totalVolume ?? 0,
              openInterest: c.openInterest ?? 0,
              impliedVolatility: c.volatility ?? null,
              delta: c.delta ?? null, theta: c.theta ?? null,
              gamma: c.gamma ?? null, vega: c.vega ?? null,
              rho: c.rho ?? null, inTheMoney: c.inTheMoney ?? false,
            });
          }
        }
      }
    };
    processMap(chain.callExpDateMap || {}, 'call');
    processMap(chain.putExpDateMap || {}, 'put');
    res.json(results);
  } catch (err: any) {
    logError(`/options ${ticker}`, err, err?.response?.status);
    logger.error(`Options chain failed for ${ticker}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Market Hours ─────────────────────────────────────────────────────────────

router.get('/market-hours', async (_req: Request, res: Response) => {
  try {
    const hours  = await schwabService.getMarketHours();
    const equity = hours?.equity?.EQ;
    const isOpen = equity?.isOpen ?? false;
    connectionState.lastFetch = new Date().toISOString();
    res.json({ isOpen, session: isOpen ? 'open' : 'closed', raw: hours });
  } catch {
    const now = new Date();
    const h   = now.getUTCHours();
    const isOpen = h >= 14 && h < 21 && [1, 2, 3, 4, 5].includes(now.getUTCDay());
    res.json({ isOpen, session: isOpen ? 'open' : 'closed' });
  }
});

// ─── Accounts ────────────────────────────────────────────────────────────────

router.get('/accounts', async (_req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }
  try {
    const accounts = await schwabService.getAccounts();
    connectionState.lastFetch = new Date().toISOString();
    res.json({ accounts });
  } catch (err: any) {
    logError('/accounts', err, err?.response?.status);
    res.status(500).json({ error: err.message });
  }
});

// ─── Positions ────────────────────────────────────────────────────────────────

router.get('/positions/:accountId', async (req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }
  try {
    const positions = await schwabService.getPositions(req.params.accountId);
    connectionState.lastFetch = new Date().toISOString();
    res.json({ positions });
  } catch (err: any) {
    logError(`/positions/${req.params.accountId}`, err, err?.response?.status);
    res.status(500).json({ error: err.message });
  }
});

// ─── Batch Refresh ────────────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }
  const { symbols } = req.body as { symbols: string[] };
  if (!symbols?.length) return res.status(400).json({ error: 'symbols array required' });

  const results: Record<string, any> = {};
  await Promise.allSettled(
    symbols.map(async (sym) => {
      try {
        const q = await schwabService.getQuote(sym.toUpperCase());
        results[sym] = {
          bid:   q?.quote?.bidPrice   ?? null,
          ask:   q?.quote?.askPrice   ?? null,
          last:  q?.quote?.lastPrice  ?? null,
          iv:    q?.quote?.volatility ?? null,
          delta: q?.quote?.delta      ?? null,
          theta: q?.quote?.theta      ?? null,
          gamma: q?.quote?.gamma      ?? null,
          vega:  q?.quote?.vega       ?? null,
        };
      } catch (e: any) {
        logError(`/refresh ${sym}`, e);
        results[sym] = null;
      }
    })
  );
  connectionState.lastFetch = new Date().toISOString();
  res.json({ success: true, quotes: results, timestamp: connectionState.lastFetch });
});

// ─── Export Encrypted Bundle ──────────────────────────────────────────────────

router.get('/export-bundle', (_req: Request, res: Response) => {
  if (!connectionState.connected) {
    return res.status(400).json({ error: 'No credentials to export' });
  }
  const bundle = encryptData({
    appKey:      connectionState.appKey,
    appSecret:   connectionState.appSecret,
    callbackUrl: connectionState.callbackUrl,
    exportedAt:  new Date().toISOString(),
    version:     '1.0',
  });
  res.json({ bundle, exportedAt: new Date().toISOString() });
});

router.post('/import-bundle', (req: Request, res: Response) => {
  const { bundle } = req.body;
  if (!bundle) return res.status(400).json({ error: 'bundle is required' });
  const data = decryptData(bundle) as any;
  if (!data?.appKey) return res.status(400).json({ error: 'Invalid or corrupted bundle' });

  process.env.SCHWAB_API_KEY      = data.appKey;
  process.env.SCHWAB_API_SECRET   = data.appSecret || '';
  process.env.SCHWAB_REDIRECT_URI = data.callbackUrl || 'https://127.0.0.1';
  connectionState.appKey      = data.appKey;
  connectionState.appSecret   = data.appSecret || '';
  connectionState.callbackUrl = data.callbackUrl || 'https://127.0.0.1';
  connectionState.connected   = true;

  logger.info('Schwab credentials imported from bundle');
  res.json({
    success: true,
    callbackUrl: data.callbackUrl,
    exportedAt:  data.exportedAt,
  });
});

export default router;
