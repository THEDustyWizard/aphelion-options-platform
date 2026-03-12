/**
 * APHELION // Market Intel Feed
 * Terminal-style scrolling market data bar
 */
import { useMarketStore } from '../../store';
import { fmtPrice, fmtPct, fmtTimeAgo } from '../../utils';

const SESSION_CONF: Record<string, { label: string; color: string; dotClass: string }> = {
  pre:    { label: '◈ PRE-MKT',   color: '#ffaa00', dotClass: 'status-dot-warn'     },
  open:   { label: '◈ MKT OPEN',  color: '#00ff41', dotClass: 'status-dot-active'   },
  post:   { label: '◈ AFTER-HRS', color: '#00aaff', dotClass: 'status-dot-active'   },
  closed: { label: '○ CLOSED',    color: '#003300', dotClass: 'status-dot-inactive' },
};

function TickerReadout({ label, price, change, changePct }: {
  label: string; price: number; change: number; changePct: number;
}) {
  const up = change >= 0;
  return (
    <span
      className="flex items-center gap-1 tabular-nums"
      style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11px' }}
    >
      <span className="text-[#005522]">{label}:</span>
      <span className="text-[#00cc33]">{fmtPrice(price)}</span>
      <span style={{ color: up ? '#00ff41' : '#ff0055' }}>
        {up ? '▲' : '▼'}{fmtPct(Math.abs(changePct), 2, false)}
      </span>
    </span>
  );
}

export default function MarketStatusBar() {
  const { status } = useMarketStore();
  const { session, spy, qqq, vix, lastSync, newRecCount, newArticleCount } = status;
  const conf = SESSION_CONF[session] ?? SESSION_CONF.closed;

  return (
    <div
      className="h-7 bg-black border-b border-[#003300] flex items-center px-3 gap-3 overflow-x-auto shrink-0"
      style={{ boxShadow: 'inset 0 -1px 0 #00ff4108' }}
    >
      {/* Session status */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={conf.dotClass} />
        <span
          className="tracking-widest font-bold shrink-0"
          style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: conf.color, textShadow: `0 0 6px ${conf.color}66` }}
        >
          {conf.label}
        </span>
      </div>

      <span className="text-[#002200] shrink-0">│</span>

      {/* Tickers */}
      <TickerReadout label="SPY" {...spy} />
      <span className="text-[#002200] shrink-0">·</span>
      <TickerReadout label="QQQ" {...qqq} />
      <span className="text-[#002200] shrink-0">·</span>
      <TickerReadout label="VIX" {...vix} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side info */}
      <span className="text-[#002200] shrink-0">│</span>

      {newRecCount > 0 && (
        <span
          className="badge-bull shrink-0"
        >
          {newRecCount} NEW RECS
        </span>
      )}
      {newArticleCount > 0 && (
        <span
          className="badge-neutral shrink-0"
        >
          {newArticleCount} DISPATCHES
        </span>
      )}

      <span
        className="text-[#003300] shrink-0"
        style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px' }}
      >
        LAST SYNC: {fmtTimeAgo(lastSync)}
      </span>
    </div>
  );
}
