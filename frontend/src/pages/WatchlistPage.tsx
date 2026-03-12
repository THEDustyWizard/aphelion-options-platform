import { useState } from 'react';
import { Plus, Settings, ArrowRight, Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWatchlistStore } from '../store';
import { fmtPrice, fmtPct, scoreColor } from '../utils';

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { groups, activeGroupId, setActiveGroup, toggleAlert } = useWatchlistStore();
  const [newTicker, setNewTicker] = useState('');

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: List sidebar */}
      <div className="w-60 border-r border-border flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold text-[#E8EAF0]">My Watchlists</span>
          <button className="btn-ghost p-1">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-colors
                          ${g.id === activeGroupId
                            ? 'bg-primary/10 text-primary border-l-2 border-primary'
                            : 'text-[#8892A4] hover:text-[#E8EAF0] hover:bg-hover'
                          }`}
            >
              <div className="flex items-center gap-2">
                <span className={g.id === activeGroupId ? '●' : '○'} />
                <span>{g.name}</span>
              </div>
              <span className="text-[#4A5568]">{g.items.length}</span>
            </button>
          ))}
          <button className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#4A5568] hover:text-[#8892A4]">
            <Plus className="w-3 h-3" />
            New List
          </button>
        </nav>

        {/* Alert summary */}
        <div className="border-t border-border p-3">
          <div className="text-[10px] font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
            Active Alerts
          </div>
          {groups
            .flatMap((g) => g.alerts.filter((a) => a.isActive))
            .slice(0, 4)
            .map((a) => (
              <div key={a.id} className="flex items-center justify-between text-[10px] py-1 border-b border-border/30">
                <span className="text-warning">⚡ {a.ticker}: {a.condition}</span>
                <button className="text-[#4A5568] hover:text-primary text-[9px]">Edit</button>
              </div>
            ))}
          <button className="w-full flex items-center gap-1 text-[10px] text-[#4A5568] hover:text-primary mt-2">
            <Plus className="w-3 h-3" />
            Add Alert
          </button>
        </div>
      </div>

      {/* Right: Active list contents */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#E8EAF0]">
              My Lists › {activeGroup?.name}
            </h2>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs gap-1">
              <Plus className="w-3 h-3" />
              Add Ticker
            </button>
            <button className="btn-ghost text-xs gap-1">
              <Settings className="w-3 h-3" />
              Settings
            </button>
          </div>
        </div>

        {/* Ticker table */}
        {activeGroup && (
          <div className="card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[#4A5568] text-[10px] uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Ticker</th>
                  <th className="px-4 py-2.5 text-right">Price</th>
                  <th className="px-4 py-2.5 text-right">Change</th>
                  <th className="px-4 py-2.5 text-right">Score</th>
                  <th className="px-4 py-2.5 text-right">IV Rank</th>
                  <th className="px-4 py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {activeGroup.items.map((item) => {
                  const pos = item.changePct >= 0;
                  const scoreClr = item.topRecScore ? scoreColor(item.topRecScore) : '#4A5568';
                  return (
                    <tr
                      key={item.ticker}
                      className="border-b border-border/50 hover:bg-hover/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/research/${item.ticker}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#E8EAF0]">{item.ticker}</div>
                        <div className="text-[10px] text-[#4A5568]">{item.companyName}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#E8EAF0]">
                        ${fmtPrice(item.price)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${pos ? 'text-bull' : 'text-bear'}`}>
                        {pos ? '▲' : '▼'}{fmtPct(Math.abs(item.changePct), 2, false)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.topRecScore ? (
                          <span className="font-mono font-bold text-sm" style={{ color: scoreClr }}>
                            {item.topRecConviction === 'high' ? '🔥' : '📊'} {item.topRecScore}
                          </span>
                        ) : (
                          <span className="text-[#4A5568]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#8892A4]">
                        {item.ivRank ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/research/${item.ticker}`); }}
                          className="btn-ghost text-[10px] gap-0.5 py-1"
                        >
                          Research <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Add ticker input */}
            <div className="px-4 py-3 border-t border-border flex items-center gap-2">
              <input
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                placeholder="+ Add ticker (e.g. TSLA)"
                className="flex-1 bg-app border border-border rounded-sm px-3 py-1.5 text-xs
                           text-[#E8EAF0] placeholder-[#4A5568] focus:outline-none focus:border-primary"
                onKeyDown={(e) => e.key === 'Enter' && newTicker && setNewTicker('')}
              />
              <button className="btn-primary text-xs py-1.5">Add</button>
            </div>
          </div>
        )}

        {/* Alert panel */}
        {activeGroup && (
          <div className="card">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-xs font-semibold text-[#E8EAF0]">
                ⚡ Alerts for {activeGroup.name}
              </span>
              <button className="btn-ghost text-xs gap-1">
                <Plus className="w-3 h-3" />
                Add Alert
              </button>
            </div>
            <div className="divide-y divide-border/30">
              {activeGroup.alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {a.isActive
                      ? <Bell className="w-3 h-3 text-warning" />
                      : <BellOff className="w-3 h-3 text-[#4A5568]" />
                    }
                    <div>
                      <span className={`text-xs ${a.isActive ? 'text-[#E8EAF0]' : 'text-[#4A5568]'}`}>
                        {a.ticker}: {a.condition}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] ${a.isActive ? 'badge-warn' : 'bg-hover text-[#4A5568]'}`}>
                      {a.isActive ? '✓ ACTIVE' : '○ inactive'}
                    </span>
                    <button
                      onClick={() => toggleAlert(activeGroup.id, a.id)}
                      className="btn-ghost text-[10px] py-0.5"
                    >
                      {a.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
