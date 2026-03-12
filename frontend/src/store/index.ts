import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WatchlistGroup, WatchlistAlert, MarketStatus, SchwabConnectionStatus } from '../types';
import { mockWatchlists, mockMarketStatus } from '../data/mockData';

// ─── Simple obfuscation for credential storage ────────────────────────────────
// Note: This is obfuscation, not true encryption. For a production Electron app,
// use node's crypto module or Keytar. This prevents casual localStorage inspection.
function obfuscate(s: string): string {
  if (!s) return '';
  return btoa(
    s.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ ((i % 7) + 11))).join('')
  );
}
function deobfuscate(s: string): string {
  if (!s) return '';
  try {
    const decoded = atob(s);
    return decoded.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ ((i % 7) + 11))).join('');
  } catch { return ''; }
}

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
                    {
                      ticker,
                      companyName: ticker,
                      price: 0,
                      changePct: 0,
                    },
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

// ─── Schwab API Store ─────────────────────────────────────────────────────────
interface SchwabStore {
  // Obfuscated credentials (persisted)
  _appKeyEnc:    string;
  _appSecretEnc: string;
  callbackUrl:   string;
  // Connection state (runtime only, not persisted)
  status: SchwabConnectionStatus;
  liveMode: boolean;
  // Actions
  saveCredentials: (appKey: string, appSecret: string, callbackUrl: string) => void;
  getAppKey: () => string;
  getAppSecret: () => string;
  clearCredentials: () => void;
  setStatus: (s: SchwabConnectionStatus) => void;
  setLiveMode: (v: boolean) => void;
  hasCredentials: () => boolean;
}

export const useSchwabStore = create<SchwabStore>()(
  persist(
    (set, get) => ({
      _appKeyEnc:    '',
      _appSecretEnc: '',
      callbackUrl:   'https://127.0.0.1',
      status: { connected: false, authenticated: false, message: 'NOT CONNECTED' },
      liveMode: false,

      saveCredentials: (appKey, appSecret, callbackUrl) =>
        set({
          _appKeyEnc:    obfuscate(appKey),
          _appSecretEnc: obfuscate(appSecret),
          callbackUrl,
        }),

      getAppKey:    () => deobfuscate(get()._appKeyEnc),
      getAppSecret: () => deobfuscate(get()._appSecretEnc),

      clearCredentials: () =>
        set({
          _appKeyEnc:    '',
          _appSecretEnc: '',
          callbackUrl:   'https://127.0.0.1',
          status: { connected: false, authenticated: false, message: 'NOT CONNECTED' },
          liveMode: false,
        }),

      setStatus: (s) => set({ status: s }),
      setLiveMode: (v) => set({ liveMode: v }),
      hasCredentials: () => !!get()._appKeyEnc,
    }),
    {
      name: 'aphelion-schwab',
      // Only persist credentials + callbackUrl, not runtime status
      partialize: (s) => ({
        _appKeyEnc:    s._appKeyEnc,
        _appSecretEnc: s._appSecretEnc,
        callbackUrl:   s.callbackUrl,
      }),
    }
  )
);
