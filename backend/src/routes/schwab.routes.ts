/**
 * APHELION // Schwab API Routes
 * OAuth, quotes, options chain, market hours
 */
import { Router, Request, Response } from 'express';
import { SchwabService } from '../services/schwab.service';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('SchwabRoutes');

// Singleton service instance (holds auth tokens in memory)
const schwabService = new SchwabService();

// Track connection state
let connectionState = {
  connected: false,
  authenticated: false,
  appKey: '',
  appSecret: '',
  callbackUrl: '',
  lastConnected: null as string | null,
  accountId: undefined as string | undefined,
};

// ─── Status ─────────────────────────────────────────────────────────────────

/**
 * GET /api/schwab/status
 * Returns current Schwab API connection status
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    connected: connectionState.connected,
    authenticated: connectionState.authenticated,
    message: connectionState.authenticated
      ? 'SCHWAB API AUTHENTICATED'
      : connectionState.connected
      ? 'SCHWAB API CONNECTED — AUTH PENDING'
      : 'SCHWAB API DISCONNECTED',
    accountId: connectionState.accountId,
    lastConnected: connectionState.lastConnected,
  });
});

// ─── OAuth Init ──────────────────────────────────────────────────────────────

/**
 * POST /api/schwab/auth/init
 * Store credentials + generate auth URL
 */
router.post('/auth/init', (req: Request, res: Response) => {
  const { clientId, clientSecret, callbackUrl } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId and clientSecret are required' });
  }

  // Store credentials in env-like memory (not persisted to disk here)
  process.env.SCHWAB_API_KEY    = clientId;
  process.env.SCHWAB_API_SECRET = clientSecret;
  process.env.SCHWAB_REDIRECT_URI = callbackUrl || 'https://127.0.0.1';

  connectionState.appKey      = clientId;
  connectionState.appSecret   = clientSecret;
  connectionState.callbackUrl = callbackUrl || 'https://127.0.0.1';
  connectionState.connected   = true;

  const authUrl = schwabService.getAuthorizationUrl();

  logger.info('Schwab auth initialized, returning auth URL');
  res.json({ authUrl });
});

// ─── OAuth Callback ──────────────────────────────────────────────────────────

/**
 * POST /api/schwab/auth/callback
 * Exchange auth code for tokens
 */
router.post('/auth/callback', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Authorization code required' });
  }

  try {
    const tokens = await schwabService.exchangeCodeForToken(code);
    connectionState.authenticated = true;
    connectionState.lastConnected = new Date().toISOString();

    // Try to get account info
    try {
      const accounts = await schwabService.getAccounts();
      if (accounts.length > 0) {
        connectionState.accountId = accounts[0].accountNumber;
      }
    } catch (accountErr) {
      logger.warn('Could not fetch account info after auth');
    }

    logger.info('Schwab OAuth complete, authenticated');
    res.json({ success: true, message: 'SCHWAB API AUTHENTICATED' });
  } catch (err: any) {
    logger.error('OAuth callback failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Authentication failed' });
  }
});

// ─── Disconnect ───────────────────────────────────────────────────────────────

/**
 * POST /api/schwab/disconnect
 */
router.post('/disconnect', (req: Request, res: Response) => {
  connectionState = {
    connected: false,
    authenticated: false,
    appKey: '',
    appSecret: '',
    callbackUrl: '',
    lastConnected: null,
    accountId: undefined,
  };
  delete process.env.SCHWAB_API_KEY;
  delete process.env.SCHWAB_API_SECRET;
  delete process.env.SCHWAB_REDIRECT_URI;
  logger.info('Schwab API disconnected');
  res.json({ success: true });
});

// ─── Quote ───────────────────────────────────────────────────────────────────

/**
 * GET /api/schwab/quote/:symbol
 */
router.get('/quote/:symbol', async (req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }

  try {
    const quote = await schwabService.getQuote(req.params.symbol.toUpperCase());
    res.json({
      symbol: req.params.symbol.toUpperCase(),
      bid: quote?.quote?.bidPrice ?? 0,
      ask: quote?.quote?.askPrice ?? 0,
      last: quote?.quote?.lastPrice ?? 0,
      volume: quote?.quote?.totalVolume ?? 0,
      openInterest: quote?.reference?.openInterest ?? 0,
      impliedVolatility: quote?.quote?.volatility ?? null,
      delta: quote?.quote?.delta ?? null,
      theta: quote?.quote?.theta ?? null,
      gamma: quote?.quote?.gamma ?? null,
      vega: quote?.quote?.vega ?? null,
    });
  } catch (err: any) {
    logger.error(`Quote failed for ${req.params.symbol}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Options Chain ────────────────────────────────────────────────────────────

/**
 * GET /api/schwab/options?ticker=AAPL&expiry=2026-04-18
 */
router.get('/options', async (req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }

  const { ticker, expiry } = req.query as Record<string, string>;
  if (!ticker) {
    return res.status(400).json({ error: 'ticker is required' });
  }

  try {
    const params: any = { strikeCount: 20, includeQuotes: true };
    if (expiry) {
      params.fromDate = expiry;
      params.toDate = expiry;
    }

    const chain = await schwabService.getOptionChain(ticker.toUpperCase(), params);

    // Flatten the chain into an array for easy consumption
    const results: any[] = [];
    const processMap = (map: Record<string, Record<string, any[]>>, type: 'call' | 'put') => {
      for (const [dateKey, strikes] of Object.entries(map)) {
        for (const [strikeKey, contracts] of Object.entries(strikes)) {
          for (const c of contracts) {
            results.push({
              symbol: c.symbol,
              type,
              strike: parseFloat(strikeKey),
              expiry: dateKey.split(':')[0],
              bid: c.bid ?? 0,
              ask: c.ask ?? 0,
              last: c.last ?? 0,
              volume: c.totalVolume ?? 0,
              openInterest: c.openInterest ?? 0,
              impliedVolatility: c.volatility ?? null,
              delta: c.delta ?? null,
              theta: c.theta ?? null,
              gamma: c.gamma ?? null,
              vega: c.vega ?? null,
              rho: c.rho ?? null,
              inTheMoney: c.inTheMoney ?? false,
            });
          }
        }
      }
    };

    processMap(chain.callExpDateMap || {}, 'call');
    processMap(chain.putExpDateMap || {}, 'put');

    res.json(results);
  } catch (err: any) {
    logger.error(`Options chain failed for ${ticker}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Market Hours ─────────────────────────────────────────────────────────────

/**
 * GET /api/schwab/market-hours
 */
router.get('/market-hours', async (req: Request, res: Response) => {
  try {
    const hours = await schwabService.getMarketHours();
    const equity = hours?.equity?.EQ;
    const isOpen = equity?.isOpen ?? false;
    const session = isOpen ? 'open' : 'closed';
    res.json({ isOpen, session, raw: hours });
  } catch {
    // Fallback based on time if API not connected
    const now = new Date();
    const hour = now.getUTCHours();
    // NYSE: 14:30-21:00 UTC
    const isOpen = hour >= 14 && hour < 21 && [1, 2, 3, 4, 5].includes(now.getUTCDay());
    res.json({ isOpen, session: isOpen ? 'open' : 'closed' });
  }
});

// ─── Refresh Live Data ────────────────────────────────────────────────────────

/**
 * POST /api/schwab/refresh
 * Trigger a live data refresh for a set of symbols
 */
router.post('/refresh', async (req: Request, res: Response) => {
  if (!connectionState.authenticated) {
    return res.status(401).json({ error: 'Not authenticated with Schwab API' });
  }

  const { symbols } = req.body as { symbols: string[] };
  if (!symbols?.length) {
    return res.status(400).json({ error: 'symbols array required' });
  }

  try {
    const quotes = await Promise.allSettled(
      symbols.map((s) => schwabService.getQuote(s.toUpperCase()))
    );

    const result: Record<string, any> = {};
    symbols.forEach((sym, i) => {
      const q = quotes[i];
      if (q.status === 'fulfilled' && q.value) {
        const d = q.value;
        result[sym] = {
          bid: d?.quote?.bidPrice ?? null,
          ask: d?.quote?.askPrice ?? null,
          last: d?.quote?.lastPrice ?? null,
          iv: d?.quote?.volatility ?? null,
          delta: d?.quote?.delta ?? null,
          theta: d?.quote?.theta ?? null,
          gamma: d?.quote?.gamma ?? null,
          vega: d?.quote?.vega ?? null,
        };
      } else {
        result[sym] = null;
      }
    });

    res.json({ success: true, quotes: result, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
