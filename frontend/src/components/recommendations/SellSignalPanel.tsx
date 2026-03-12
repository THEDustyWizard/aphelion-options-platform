/**
 * APHELION // Sell Signal Panel
 * Shows the current sell signal type, urgency, and exit triggers for a position.
 * Color-coded: 🔴 SELL_NOW/CUT_LOSSES | 🟡 TAKE_PROFITS/ROLL | 🟢 HOLD
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { SellSignal, SellTrigger, SellSignalType, SellSignalUrgency } from '../../types';
import { fmtPrice } from '../../utils';

// ─── Color Maps ───────────────────────────────────────────────────────────────

function signalColor(signal: SellSignalType): string {
  switch (signal) {
    case 'SELL_NOW':    return '#ff0055';
    case 'CUT_LOSSES':  return '#ff3300';
    case 'TAKE_PROFITS': return '#00cc33';
    case 'ROLL_POSITION': return '#ffaa00';
    case 'HOLD':        return '#00ff41';
    default:            return '#888888';
  }
}

function urgencyColor(urgency: SellSignalUrgency): string {
  switch (urgency) {
    case 'critical': return '#ff0055';
    case 'high':     return '#ff6600';
    case 'medium':   return '#ffaa00';
    case 'low':      return '#00cc33';
  }
}

function signalIcon(signal: SellSignalType): string {
  switch (signal) {
    case 'SELL_NOW':    return '⚡';
    case 'CUT_LOSSES':  return '✂';
    case 'TAKE_PROFITS': return '💰';
    case 'ROLL_POSITION': return '🔄';
    case 'HOLD':        return '✓';
    default:            return '·';
  }
}

function triggerTypeColor(type: SellTrigger['type']): string {
  switch (type) {
    case 'profit_target': return '#00ff41';
    case 'stop_loss':     return '#ff0055';
    case 'time_decay':    return '#ffaa00';
    case 'technical':     return '#00aaff';
    case 'fundamental':   return '#cc44ff';
    default:              return '#888888';
  }
}

// ─── Trigger Row ─────────────────────────────────────────────────────────────

function TriggerRow({ trigger }: { trigger: SellTrigger }) {
  const color = triggerTypeColor(trigger.type);
  const triggeredColor = trigger.triggered ? color : '#002200';
  return (
    <div
      className="flex flex-col gap-0.5 px-2 py-1 border-b border-[#001800]"
      style={{ borderLeft: trigger.triggered ? `2px solid ${color}` : '2px solid #001800' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: 'Share Tech Mono, monospace', color: triggeredColor }}>
          {trigger.triggered && '▶ '}{trigger.label}
        </span>
        <span
          className="text-[9px] font-bold"
          style={{ fontFamily: 'Share Tech Mono, monospace', color: trigger.triggered ? color : '#003300' }}
        >
          {trigger.triggered ? 'TRIGGERED' : 'CLEAR'}
        </span>
      </div>
      <div className="text-[9px] text-[#005522]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        {trigger.description}
      </div>
    </div>
  );
}

// ─── Exit Level Bar ───────────────────────────────────────────────────────────

function ExitLevelBar({ sellSignal }: { sellSignal: SellSignal }) {
  const { profitTargetPct, stopLossPct, currentPnlPct = 0 } = sellSignal;
  const range = profitTargetPct + stopLossPct;
  const centerPct = (stopLossPct / range) * 100;
  const currentPct = Math.min(100, Math.max(0, ((currentPnlPct + stopLossPct) / range) * 100));

  return (
    <div className="px-2 py-1.5">
      <div className="text-[9px] text-[#003300] uppercase tracking-widest mb-1" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        Exit Range
      </div>
      <div className="relative h-1.5 bg-[#001100] border border-[#002200]">
        {/* Stop zone */}
        <div className="absolute left-0 h-full bg-[#ff005533]" style={{ width: `${centerPct}%` }} />
        {/* Profit zone */}
        <div className="absolute right-0 h-full bg-[#00ff4122]" style={{ width: `${100 - centerPct}%` }} />
        {/* Center line */}
        <div className="absolute top-0 bottom-0 w-px bg-[#003300]" style={{ left: `${centerPct}%` }} />
        {/* Current position marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{
            left: `${currentPct}%`,
            background: currentPnlPct >= 0 ? '#00ff41' : '#ff0055',
            boxShadow: `0 0 4px ${currentPnlPct >= 0 ? '#00ff41' : '#ff0055'}`,
          }}
        />
      </div>
      <div className="flex justify-between text-[8px] text-[#003300] mt-0.5" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        <span className="text-[#ff0055]">-{stopLossPct}%</span>
        <span className="text-[#888]">entry</span>
        <span className="text-[#00ff41]">+{profitTargetPct}%</span>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
  sellSignal: SellSignal;
  compact?: boolean;
}

export default function SellSignalPanel({ sellSignal, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = signalColor(sellSignal.signal);
  const urgColor = urgencyColor(sellSignal.urgency);
  const isAlert = sellSignal.signal === 'SELL_NOW' || sellSignal.signal === 'CUT_LOSSES';

  return (
    <div
      className="flex flex-col"
      style={{ borderLeft: `2px solid ${color}22`, background: `${color}08` }}
    >
      {/* Signal header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer"
        style={{ borderBottom: `1px solid ${color}22` }}
        onClick={() => !compact && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {/* Pulsing dot for alerts */}
          {isAlert ? (
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: color, boxShadow: `0 0 6px ${color}` }}
            />
          ) : (
            <div className="w-2 h-2 rounded-full" style={{ background: color, opacity: 0.7 }} />
          )}
          <span
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ fontFamily: 'Share Tech Mono, monospace', color, textShadow: isAlert ? `0 0 8px ${color}88` : 'none' }}
          >
            {signalIcon(sellSignal.signal)} {sellSignal.signal.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5"
            style={{ fontFamily: 'Share Tech Mono, monospace', color: urgColor, border: `1px solid ${urgColor}44` }}
          >
            {sellSignal.urgency}
          </span>
          {!compact && (
            <span className="text-[9px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>

      {/* Reason row */}
      <div className="px-2 py-1">
        <div className="text-[10px]" style={{ fontFamily: 'Share Tech Mono, monospace', color }}>
          {sellSignal.reason}
        </div>
        {!compact && (
          <div className="text-[9px] mt-0.5 text-[#007722]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            {sellSignal.detail}
          </div>
        )}
      </div>

      {/* Exit level bar */}
      {!compact && <ExitLevelBar sellSignal={sellSignal} />}

      {/* Quick exits row */}
      {!compact && (
        <div className="grid grid-cols-2 gap-1 px-2 pb-1.5 text-[9px]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          <div>
            <span className="text-[#003300]">TARGET:</span>{' '}
            <span className="text-[#00ff41]">+{sellSignal.profitTargetPct.toFixed(0)}% (${fmtPrice(sellSignal.profitTarget)})</span>
          </div>
          <div>
            <span className="text-[#003300]">STOP:</span>{' '}
            <span className="text-[#ff0055]">-{sellSignal.stopLossPct.toFixed(0)}% (${fmtPrice(sellSignal.stopLoss)})</span>
          </div>
          {sellSignal.currentPnlPct !== undefined && (
            <div className="col-span-2">
              <span className="text-[#003300]">CURRENT:</span>{' '}
              <span style={{ color: sellSignal.currentPnlPct >= 0 ? '#00ff41' : '#ff0055' }}>
                {sellSignal.currentPnlPct >= 0 ? '+' : ''}{sellSignal.currentPnlPct.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expandable: recommendation + triggers */}
      {!compact && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-2 py-1 w-full border-t text-[9px] uppercase tracking-widest transition-colors"
            style={{
              fontFamily: 'Share Tech Mono, monospace',
              borderColor: `${color}22`,
              color: expanded ? color : '#005522',
            }}
          >
            <span>{expanded ? '▲' : '▼'}</span>
            {expanded ? 'HIDE EXIT DETAILS' : '⊞ EXIT PLAN & TRIGGERS'}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                {/* Recommendation text */}
                <div className="px-2 py-1.5" style={{ borderTop: `1px solid ${color}22`, borderBottom: `1px solid ${color}22` }}>
                  <div className="text-[9px] text-[#003300] uppercase tracking-widest mb-1" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
                    Action Plan:
                  </div>
                  <p className="text-[10px] leading-snug" style={{ fontFamily: 'Share Tech Mono, monospace', color }}>
                    {sellSignal.recommendation}
                  </p>
                </div>

                {/* Roll warning */}
                {sellSignal.rollWarningDte > 0 && (
                  <div className="px-2 py-1 text-[9px]" style={{ fontFamily: 'Share Tech Mono, monospace', color: '#ffaa00' }}>
                    ⚠ Roll warning triggers at {sellSignal.rollWarningDte} DTE
                  </div>
                )}

                {/* Trigger breakdown */}
                {sellSignal.triggers && sellSignal.triggers.length > 0 && (
                  <div>
                    <div className="px-2 pt-1.5 pb-0.5 text-[9px] text-[#003300] uppercase tracking-widest" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
                      Exit Triggers:
                    </div>
                    {sellSignal.triggers.map((t) => (
                      <TriggerRow key={t.type} trigger={t} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
