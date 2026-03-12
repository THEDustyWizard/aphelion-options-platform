/**
 * APHELION // Portfolio Tracker
 * Tracks recommended positions with real-time P&L, sell signals, and risk metrics.
 * Shows SELL_NOW / CUT_LOSSES alerts prominently at the top.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { PortfolioPosition, PortfolioRiskMetrics, SellSignalType } from '../../types';
import SellSignalPanel from '../recommendations/SellSignalPanel';

// ─── Signal Badge ─────────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: SellSignalType }) {
  const colors: Record<SellSignalType, string> = {
    SELL_NOW:     '#ff0055',
    CUT_LOSSES:   '#ff3300',
    TAKE_PROFITS: '#00cc33',
    ROLL_POSITION:'#ffaa00',
    HOLD:         '#00ff41',
  };
  const color = colors[signal];
  return (
    <span
      className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5"
      style={{
        fontFamily: 'Share Tech Mono, monospace',
        color,
        border: `1px solid ${color}55`,
        background: `${color}11`,
        textShadow: ['SELL_NOW', 'CUT_LOSSES'].includes(signal) ? `0 0 6px ${color}88` : 'none',
      }}
    >
      {signal.replace('_', ' ')}
    </span>
  );
}

// ─── Sector Bar ───────────────────────────────────────────────────────────────

function SectorBar({ concentration }: { concentration: Record<string, number> }) {
  const entries = Object.entries(concentration).sort((a, b) => b[1] - a[1]);
  const sectorColors: Record<string, string> = {
    defense: '#00aaff',
    energy:  '#ffaa00',
    logistics:'#cc44ff',
    medical: '#00ff99',
  };
  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="text-[9px] text-[#003300] uppercase tracking-widest mb-0.5" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        Sector Allocation
      </div>
      {entries.map(([sector, pct]) => {
        const color = sectorColors[sector] || '#888';
        return (
          <div key={sector} className="flex items-center gap-2">
            <span className="text-[9px] text-[#005522] w-16 capitalize" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
              {sector}
            </span>
            <div className="flex-1 h-1 bg-[#001100] border border-[#002200]">
              <div className="h-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
            </div>
            <span className="text-[9px] w-8 text-right" style={{ fontFamily: 'Share Tech Mono, monospace', color }}>
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Position Row ─────────────────────────────────────────────────────────────

function PositionRow({
  position,
  onExpand,
  expanded,
}: {
  position: PortfolioPosition;
  onExpand: () => void;
  expanded: boolean;
}) {
  const navigate = useNavigate();
  const pnlColor = position.pnl >= 0 ? '#00ff41' : '#ff0055';
  const isAlert = position.sellSignal.signal === 'SELL_NOW' || position.sellSignal.signal === 'CUT_LOSSES';

  return (
    <div
      className="border-b border-[#001800]"
      style={{ borderLeft: isAlert ? '2px solid #ff005566' : '2px solid transparent' }}
    >
      {/* Main row */}
      <div
        className="grid px-3 py-2 cursor-pointer hover:bg-[#001100] transition-colors"
        style={{ gridTemplateColumns: '80px 1fr 70px 80px 90px 90px' }}
        onClick={onExpand}
      >
        {/* Ticker + strategy */}
        <div>
          <div
            className="text-xs font-bold cursor-pointer hover:text-primary"
            style={{ fontFamily: 'Share Tech Mono, monospace', color: '#00ff41' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/research/${position.ticker}`); }}
          >
            {position.ticker}
          </div>
          <div className="text-[9px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            ${position.strike}{position.optionType === 'call' ? 'C' : 'P'}
          </div>
        </div>

        {/* Strategy + expiry */}
        <div>
          <div className="text-[10px] text-[#007722]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            {position.strategy}
          </div>
          <div className="text-[9px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            exp {position.expiry}
          </div>
        </div>

        {/* Contracts */}
        <div className="text-right">
          <div className="text-[10px] text-[#005522]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            {position.contracts}×
          </div>
          <div className="text-[9px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            @ ${position.entryPrice.toFixed(2)}
          </div>
        </div>

        {/* Cost basis */}
        <div className="text-right">
          <div className="text-[10px] text-[#005522]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            ${position.costBasis.toLocaleString()}
          </div>
          <div className="text-[9px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            cost basis
          </div>
        </div>

        {/* P&L */}
        <div className="text-right">
          <div
            className="text-[11px] font-bold"
            style={{ fontFamily: 'Share Tech Mono, monospace', color: pnlColor, textShadow: `0 0 6px ${pnlColor}44` }}
          >
            {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toLocaleString()}
          </div>
          <div
            className="text-[9px]"
            style={{ fontFamily: 'Share Tech Mono, monospace', color: pnlColor }}
          >
            {position.pnlPct >= 0 ? '+' : ''}{position.pnlPct.toFixed(1)}%
          </div>
        </div>

        {/* Signal */}
        <div className="flex items-center justify-end gap-1">
          <SignalBadge signal={position.sellSignal.signal} />
          <span className="text-[9px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expanded sell signal detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mx-3 mb-2"
          >
            <SellSignalPanel sellSignal={position.sellSignal} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Metrics Row ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col px-3 py-2 border-r border-[#001800] last:border-r-0">
      <div className="text-[9px] text-[#003300] uppercase tracking-widest mb-1" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        {label}
      </div>
      <div
        className="text-[13px] font-bold"
        style={{ fontFamily: 'Share Tech Mono, monospace', color: color || '#00ff41' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[9px] text-[#005522]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  positions: PortfolioPosition[];
  metrics: PortfolioRiskMetrics;
}

export default function PortfolioTracker({ positions, metrics }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSectorBreakdown, setShowSectorBreakdown] = useState(false);

  const alertPositions = positions.filter(p =>
    p.sellSignal.signal === 'SELL_NOW' || p.sellSignal.signal === 'CUT_LOSSES'
  );
  const sortedPositions = [
    ...alertPositions,
    ...positions.filter(p => !alertPositions.includes(p)).sort((a, b) => b.pnl - a.pnl),
  ];

  const pnlColor = metrics.totalPnl >= 0 ? '#00ff41' : '#ff0055';

  return (
    <div className="card flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#001800] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#00ff41]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            ◈ PORTFOLIO TRACKER
          </span>
          <span className="text-[10px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            {metrics.openPositions} positions
          </span>
          {metrics.alertCount > 0 && (
            <span
              className="text-[9px] px-1.5 py-0.5 animate-pulse"
              style={{ fontFamily: 'Share Tech Mono, monospace', color: '#ff0055', border: '1px solid #ff005544', background: '#ff000511' }}
            >
              ⚡ {metrics.alertCount} ALERT{metrics.alertCount !== 1 ? 'S' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSectorBreakdown(!showSectorBreakdown)}
          className="text-[9px] text-[#005522] hover:text-[#00ff41] transition-colors uppercase tracking-widest"
          style={{ fontFamily: 'Share Tech Mono, monospace' }}
        >
          {showSectorBreakdown ? '▲ hide' : '▼ sectors'}
        </button>
      </div>

      {/* Portfolio metrics */}
      <div className="grid border-b border-[#001800]" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <MetricCard
          label="Total Value"
          value={`$${metrics.totalValue.toLocaleString()}`}
          sub={`basis: $${metrics.totalCostBasis.toLocaleString()}`}
        />
        <MetricCard
          label="Unrealized P&L"
          value={`${metrics.totalPnl >= 0 ? '+' : ''}$${Math.abs(metrics.totalPnl).toLocaleString()}`}
          sub={`${metrics.totalPnlPct >= 0 ? '+' : ''}${metrics.totalPnlPct.toFixed(1)}%`}
          color={pnlColor}
        />
        <MetricCard
          label="Portfolio Beta"
          value={metrics.portfolioBeta.toFixed(2)}
          sub="market sensitivity"
          color={Math.abs(metrics.portfolioBeta) > 1.5 ? '#ffaa00' : '#00ff41'}
        />
        <MetricCard
          label="Avg DTE"
          value={`${metrics.avgDte.toFixed(0)}d`}
          sub={metrics.avgDte < 21 ? '⚠ theta risk' : 'time OK'}
          color={metrics.avgDte < 21 ? '#ffaa00' : '#00ff41'}
        />
        <MetricCard
          label="Max Position"
          value={`${metrics.maxPositionSize.toFixed(1)}%`}
          sub="concentration"
          color={metrics.maxPositionSize > 20 ? '#ffaa00' : '#00ff41'}
        />
      </div>

      {/* Sector breakdown */}
      <AnimatePresence>
        {showSectorBreakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-b border-[#001800]"
          >
            <SectorBar concentration={metrics.sectorConcentration} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Column headers */}
      <div
        className="grid px-3 py-1.5 border-b border-[#001800]"
        style={{ gridTemplateColumns: '80px 1fr 70px 80px 90px 90px' }}
      >
        {['Position', 'Strategy', 'Qty', 'Basis', 'P&L', 'Signal'].map((h) => (
          <div key={h} className={`text-[8px] uppercase tracking-widest text-[#003300] ${h === 'P&L' || h === 'Signal' ? 'text-right' : ''}`} style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Positions */}
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        {sortedPositions.length === 0 ? (
          <div className="p-6 text-center text-[#003300] text-sm" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            No open positions
          </div>
        ) : (
          sortedPositions.map((position) => (
            <PositionRow
              key={position.id}
              position={position}
              expanded={expandedId === position.id}
              onExpand={() => setExpandedId(expandedId === position.id ? null : position.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
