/**
 * APHELION // Backtest Stats Panel
 * Shows historical performance of similar signal setups:
 * win rate, avg return, max drawdown, Sharpe ratio.
 */
import type { BacktestStats } from '../../types';

interface Props {
  stats: BacktestStats;
  compact?: boolean;
}

function StatCell({
  label,
  value,
  sub,
  color,
  positive = true,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-2 py-1.5 border-r border-[#001800] last:border-r-0">
      <div className="text-[8px] text-[#003300] uppercase tracking-widest" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        {label}
      </div>
      <div
        className="text-[12px] font-bold"
        style={{
          fontFamily: 'Share Tech Mono, monospace',
          color: color || (positive ? '#00ff41' : '#ff0055'),
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[8px] text-[#005522]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function WinRateBar({ winRate }: { winRate: number }) {
  const pct = winRate * 100;
  const color = pct >= 60 ? '#00ff41' : pct >= 50 ? '#ffaa00' : '#ff0055';
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="flex-1 h-1 bg-[#001100] border border-[#002200]">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}88` }}
        />
      </div>
      <span
        className="text-[10px] font-bold w-10 text-right"
        style={{ fontFamily: 'Share Tech Mono, monospace', color }}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export default function BacktestStatsPanel({ stats, compact = false }: Props) {
  const winPct = stats.winRate * 100;
  const winColor = winPct >= 60 ? '#00ff41' : winPct >= 50 ? '#ffaa00' : '#ff0055';
  const returnColor = stats.avgReturn >= 0 ? '#00ff41' : '#ff0055';
  const sharpeColor = stats.sharpeRatio >= 1.5 ? '#00ff41' : stats.sharpeRatio >= 0.5 ? '#ffaa00' : '#ff0055';

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-2 py-1 border border-[#002200] bg-[#000a00]">
        <span className="text-[8px] text-[#003300] uppercase tracking-widest" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          Hist.
        </span>
        <span className="text-[9px]" style={{ fontFamily: 'Share Tech Mono, monospace', color: winColor }}>
          {winPct.toFixed(0)}% WR
        </span>
        <span className="text-[9px]" style={{ fontFamily: 'Share Tech Mono, monospace', color: returnColor }}>
          {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(0)}% avg
        </span>
        <span className="text-[9px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          n={stats.sampleSize}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-[#002200] bg-[#000a00]">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-[#001800] flex items-center justify-between">
        <span className="text-[9px] text-[#003300] uppercase tracking-widest" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          ⟳ Backtest ({stats.timeframe})
        </span>
        <span className="text-[9px] text-[#005522]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          n={stats.sampleSize} signals
        </span>
      </div>

      {/* Win rate bar */}
      <div>
        <div className="px-2 pt-1.5 pb-0 text-[8px] text-[#003300] uppercase tracking-widest" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          Win Rate
        </div>
        <WinRateBar winRate={stats.winRate} />
      </div>

      {/* Stats grid */}
      <div className="grid border-t border-[#001800]" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCell
          label="Avg Return"
          value={`${stats.avgReturn >= 0 ? '+' : ''}${stats.avgReturn.toFixed(1)}%`}
          color={returnColor}
        />
        <StatCell
          label="Max DD"
          value={`${stats.maxDrawdown.toFixed(1)}%`}
          color="#ff0055"
          positive={false}
        />
        <StatCell
          label="Sharpe"
          value={stats.sharpeRatio.toFixed(2)}
          sub={stats.sharpeRatio >= 1.5 ? 'excellent' : stats.sharpeRatio >= 0.5 ? 'acceptable' : 'weak'}
          color={sharpeColor}
        />
      </div>

      {/* Strategy label */}
      <div className="px-2 py-1 border-t border-[#001800]">
        <div className="text-[8px] text-[#005522]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          {stats.strategyLabel}
        </div>
      </div>
    </div>
  );
}
