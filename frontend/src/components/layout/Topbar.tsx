/**
 * APHELION // Navigation Terminal
 * Retro CIA terminal nav bar
 */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/',          label: '[ HUB ]',       shortcut: 'F1' },
  { to: '/screener',  label: '[ SCREENER ]',   shortcut: 'F2' },
  { to: '/watchlist', label: '[ WATCHLIST ]',  shortcut: 'F3' },
  { to: '/news',      label: '[ INTEL ]',      shortcut: 'F4' },
  { to: '/settings',  label: '[ CONFIG ]',     shortcut: 'F5' },
];

export default function Topbar() {
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header
      className="h-10 bg-black border-b border-[#003300] flex items-center px-3 gap-3 shrink-0"
      style={{ boxShadow: '0 1px 0 #00ff4111' }}
    >
      {/* Nav links */}
      <nav className="flex items-center gap-0">
        {NAV_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `px-3 py-1 text-xs tracking-wider transition-all duration-100 border-x border-transparent ` +
              (isActive
                ? 'bg-[#001100] border-[#003300] text-[#00ff41] glow-green'
                : 'text-[#005522] hover:text-[#00cc33] hover:bg-[#001100] hover:border-[#002200]')
            }
            style={{ fontFamily: 'Share Tech Mono, monospace' }}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <span className="text-[#002200] select-none">│</span>

      {/* Search / ticker lookup */}
      <div className="flex items-center gap-1 relative">
        <span
          className="text-[#005522] text-xs select-none"
          style={{ fontFamily: 'Share Tech Mono, monospace' }}
        >
          LOOKUP:&gt;
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="TICKER..."
          maxLength={10}
          className="w-28 bg-black border-b px-1 py-0.5 text-xs tracking-widest text-[#00ff41]
                     placeholder-[#003300] outline-none transition-all"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            borderColor: searchFocused ? '#00ff41' : '#003300',
            boxShadow: searchFocused ? '0 0 6px #00ff4133' : 'none',
          }}
        />
        {searchFocused && search && (
          <span className="text-[#00ff41] text-xs animate-blink">█</span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status indicators */}
      <div className="flex items-center gap-3">
        {/* API status */}
        <div className="flex items-center gap-1.5">
          <span className="status-dot-active" />
          <span
            className="text-[10px] text-[#005522] tracking-wider"
            style={{ fontFamily: 'Share Tech Mono, monospace' }}
          >
            SCHWAB:OK
          </span>
        </div>

        {/* Separator */}
        <span className="text-[#002200] select-none">│</span>

        {/* Alert count */}
        <div className="flex items-center gap-1">
          <span
            className="text-xs border border-[#ff005544] bg-[#150005] text-[#ff0055] px-1.5 py-0 tracking-wider"
            style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px' }}
          >
            ▲ 3 ALERTS
          </span>
        </div>

        {/* User ident */}
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] text-[#005522] tracking-wider"
            style={{ fontFamily: 'Share Tech Mono, monospace' }}
          >
            USER:ALPHA
          </span>
        </div>
      </div>
    </header>
  );
}
