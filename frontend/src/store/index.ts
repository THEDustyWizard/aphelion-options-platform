import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WatchlistGroup, WatchlistAlert, MarketStatus } from '../types';
import { mockWatchlists, mockMarketStatus } from '../data/mockData';

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
