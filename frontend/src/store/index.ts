import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WatchlistGroup, WatchlistAlert, MarketStatus, SchwabConnectionStatus } from '../types';
import { mockWatchlists, mockMarketStatus } from '../data/mockData';

// ─── Schwab Store ─────────────────────────────────────────────────────────────

export interface SchwabErrorEntry {
  ts: string;
  endpoint: string;
  error: string;
  code?: number;
}

export interface SchwabProfile {
  id: string;
  name: string;
  appKeyMasked: string;
  callbackUrl: string;
  environment: 'production' | 'sandbox';
  isLive: boolean;
  accountNumber?: string;
  createdAt: string;
}

/** Light obfuscation for localStorage (not real encryption — backend handles real crypto) */
const ob   = (s: string) => { try { return btoa(unescape(encodeURIComponent(s))); } catch { return s; } };
const deob = (s: string) => { try { return decodeURIComponent(escape(atob(s)));   } catch { return s; } };

interface SchwabStore {
  // Obfuscated credential storage
  _appKeyOb:    string;
  _appSecretOb: string;
  callbackUrl:  string;

  // Connection status (hydrated from backend)
  status:   SchwabConnectionStatus;
  liveMode: boolean;

  // Auto-refresh interval in seconds
  refreshInterval: number;

  // Saved profiles
  profiles:        SchwabProfile[];
  activeProfileId: string | null;

  // In-memory error log (not persisted)
  errorLog: SchwabErrorEntry[];

  // Last successful Schwab data fetch
  lastFetch: string | null;

  // Rate limit tracking
  rateLimitUsed: number;
  rateLimitMax:  number;

  // Session timeout in minutes (0 = disabled)
  sessionTimeoutMins: number;

  // ── Actions ──
  saveCredentials:    (appKey: string, appSecret: string, callbackUrl: string) => void;
  clearCredentials:   () => void;
  getAppKey:          () => string;
  getAppSecret:       () => string;
  hasCredentials:     () => boolean;

  setStatus:          (s: SchwabConnectionStatus) => void;
  setLiveMode:        (v: boolean)  => void;
  setRefreshInterval: (s: number)   => void;
  setLastFetch:       (ts: string)  => void;
  setRateLimits:      (used: number, max: number) => void;
  setSessionTimeout:  (mins: number) => void;

  addProfile:       (p: Omit<SchwabProfile, 'id' | 'createdAt'>) => void;
  removeProfile:    (id: string) => void;
  updateProfile:    (id: string, patch: Partial<SchwabProfile>) => void;
  setActiveProfile: (id: string | null) => void;

  addError:    (e: SchwabErrorEntry) => void;
  clearErrors: () => void;
}

export const useSchwabStore = create<SchwabStore>()(
  persist(
    (set, get) => ({
      _appKeyOb:    '',
      _appSecretOb: '',
      callbackUrl:  'https://127.0.0.1',

      status: {
        connected:     false,
        authenticated: false,
        message:       'SCHWAB API DISCONNECTED',
      },
      liveMode:        false,
      refreshInterval: 30,

      profiles:        [],
      activeProfileId: null,

      errorLog:           [],
      lastFetch:          null,
      rateLimitUsed:      0,
      rateLimitMax:       120,
      sessionTimeoutMins: 0,

      saveCredentials: (appKey, appSecret, callbackUrl) =>
        set({ _appKeyOb: ob(appKey), _appSecretOb: ob(appSecret), callbackUrl }),

      clearCredentials: () =>
        set({
          _appKeyOb: '', _appSecretOb: '', callbackUrl: 'https://127.0.0.1',
          status: { connected: false, authenticated: false, message: 'SCHWAB API DISCONNECTED' },
          liveMode: false, lastFetch: null, activeProfileId: null,
        }),

      getAppKey:      () => deob(get()._appKeyOb),
      getAppSecret:   () => deob(get()._appSecretOb),
      hasCredentials: () => !!get()._appKeyOb,

      setStatus:          (s)     => set({ status: s }),
      setLiveMode:        (v)     => set({ liveMode: v }),
      setRefreshInterval: (s)     => set({ refreshInterval: s }),
      setLastFetch:       (ts)    => set({ lastFetch: ts }),
      setRateLimits:      (u, m)  => set({ rateLimitUsed: u, rateLimitMax: m }),
      setSessionTimeout:  (mins)  => set({ sessionTimeoutMins: mins }),

      addProfile: (p) =>
        set((s) => ({
          profiles: [
            ...s.profiles,
            { ...p, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),

      removeProfile:  (id)      => set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),
      updateProfile:  (id, patch) =>
        set((s) => ({ profiles: s.profiles.map((p) => p.id === id ? { ...p, ...patch } : p) })),
      setActiveProfile: (id)   => set({ activeProfileId: id }),

      addError:    (e) => set((s) => ({ errorLog: [e, ...s.errorLog].slice(0, 50) })),
      clearErrors: ()  => set({ errorLog: [] }),
    }),
    {
      name: 'aphelion-schwab',
      // Exclude in-memory error log from localStorage
      partialize: (s) => ({
        _appKeyOb:          s._appKeyOb,
        _appSecretOb:       s._appSecretOb,
        callbackUrl:        s.callbackUrl,
        liveMode:           s.liveMode,
        refreshInterval:    s.refreshInterval,
        profiles:           s.profiles,
        activeProfileId:    s.activeProfileId,
        sessionTimeoutMins: s.sessionTimeoutMins,
      }),
    }
  )
);

// ─── Market Store ─────────────────────────────────────────────────────────────
interface MarketStore {
  status: MarketStatus;
  setStatus: (s: MarketStatus) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  status: mockMarketStatus,
  setStatus: (s) => set({ status: s }),
}));

// ─── Watchlist Store ──────────────────────────────────────────────────────────
interface WatchlistStore {
  groups: WatchlistGroup[];
  activeGroupId: string;
  setActiveGroup: (id: string) => void;
  addAlert: (groupId: string, alert: WatchlistAlert) => void;
  toggleAlert: (groupId: string, alertId: string) => void;
  addTicker: (groupId: string, ticker: string) => void;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set) => ({
      groups: mockWatchlists,
      activeGroupId: mockWatchlists[0].id,
      setActiveGroup: (id) => set({ activeGroupId: id }),
      addAlert: (groupId, alert) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, alerts: [...g.alerts, alert] } : g
          ),
        })),
      toggleAlert: (groupId, alertId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  alerts: g.alerts.map((a) =>
                    a.id === alertId ? { ...a, isActive: !a.isActive } : a
                  ),
                }
              : g
          ),
        })),
      addTicker: (groupId, ticker) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  items: [
                    ...g.items,
                    { ticker, companyName: ticker, price: 0, changePct: 0 },
                  ],
                }
              : g
          ),
        })),
    }),
    { name: 'aphelion-watchlists' }
  )
);

// ─── UI Preferences Store ─────────────────────────────────────────────────────
interface UIStore {
  theme: 'dark' | 'light';
  newsViewMode: 'compact' | 'expanded';
  savedRecIds: string[];
  actedOnRecIds: string[];
  savedNewsIds: string[];
  toggleTheme: () => void;
  toggleNewsViewMode: () => void;
  saveRec: (id: string) => void;
  markActedOn: (id: string) => void;
  saveNews: (id: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      newsViewMode: 'compact',
      savedRecIds: [],
      actedOnRecIds: [],
      savedNewsIds: [],
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('dark', next === 'dark');
          return { theme: next };
        }),
      toggleNewsViewMode: () =>
        set((s) => ({
          newsViewMode: s.newsViewMode === 'compact' ? 'expanded' : 'compact',
        })),
      saveRec: (id) =>
        set((s) => ({
          savedRecIds: s.savedRecIds.includes(id)
            ? s.savedRecIds.filter((x) => x !== id)
            : [...s.savedRecIds, id],
        })),
      markActedOn: (id) =>
        set((s) => ({
          actedOnRecIds: s.actedOnRecIds.includes(id)
            ? s.actedOnRecIds
            : [...s.actedOnRecIds, id],
        })),
      saveNews: (id) =>
        set((s) => ({
          savedNewsIds: s.savedNewsIds.includes(id)
            ? s.savedNewsIds.filter((x) => x !== id)
            : [...s.savedNewsIds, id],
        })),
    }),
    { name: 'aphelion-ui-prefs' }
  )
);

// ─── Screener Filter Store ────────────────────────────────────────────────────
interface ScreenerFilters {
  sectors: string[];
  strategy: string;
  dteMin: number;
  dteMax: number;
  ivRankMin: number;
  scoreMin: number;
  optionTypes: { calls: boolean; puts: boolean; spreads: boolean };
}

interface ScreenerStore {
  filters: ScreenerFilters;
  setFilters: (f: Partial<ScreenerFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: ScreenerFilters = {
  sectors: [],
  strategy: 'all',
  dteMin: 14,
  dteMax: 60,
  ivRankMin: 40,
  scoreMin: 70,
  optionTypes: { calls: true, puts: true, spreads: true },
};

export const useScreenerStore = create<ScreenerStore>()((set) => ({
  filters: defaultFilters,
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: defaultFilters }),
}));
