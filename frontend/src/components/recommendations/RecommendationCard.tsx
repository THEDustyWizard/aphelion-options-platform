/**
 * APHELION // Recommendation Terminal Card
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Recommendation } from '../../types';
import {
  convictionLabel, scoreColor,
  fmtPrice, fmtTimeAgo,
} from '../../utils';
import { useUIStore } from '../../store';
import CopySymbolButton from '../ui/SchwabButton';

interface Props {
  rec: Recommendation;
  compact?: boolean;
}

function SignalBar({ score, label }: { score: number; label: string }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2 text-[10px]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
      <span className="text-[#005522] w-24 truncate">{label.toUpperCase()}:</span>
      <div className="flex-1 h-1 bg-[#001100] border border-[#003300]">
        <div className="h-full transition-all duration-500" style={{ width: `${score}%`, background: color, boxShadow: `0 0 4px ${color}88` }} />
      </div>
      <span style={{ color }}>{score}</span>
    </div>
  );
}

export default function RecommendationCard({ rec, compact = false }: Props) {
  const navigate = useNavigate();
  const { savedRecIds, actedOnRecIds, saveRec } = useUIStore();
  const [expanded, setExpanded] = useState(false);
  const isSaved   = savedRecIds.includes(rec.id);
  const isActedOn = actedOnRecIds.includes(rec.id);
  const scoreClr  = scoreColor(rec.score);

  const typeLabel = rec.optionType === 'call' ? 'CALL' : 'PUT';
  const expLabel  = new Date(rec.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const optionSymbol = (rec as any).optionSymbol ?? (rec as any).schwabSymbol ?? `${rec.ticker} ${typeLabel}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4, filter: 'brightness(3)' }}
      animate={{ opacity: 1, y: 0, filter: 'brightness(1)' }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col bg-black border border-[#003300] hover:border-[#007700] transition-colors"
      style={{
        boxShadow: isActedOn ? '0 0 8px #00ff4133' : isSaved ? '0 0 8px #ffaa0033' : '0 0 4px #00330033',
        borderLeft: isActedOn ? '2px solid #00ff41' : isSaved ? '2px solid #ffaa00' : undefined,
      }}
    >
      {/* Score header row */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-[#002200] bg-[#010801]">
        <span
          className="text-[10px] tracking-widest uppercase"
          style={{ fontFamily: 'Share Tech Mono, monospace', color: scoreClr, textShadow: `0 0 6px ${scoreClr}77` }}
        >
          {convictionLabel(rec.conviction).replace(/[🔥📊📉]/g, '').trim()}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums font-bold" style={{ color: scoreClr, fontFamily: 'Share Tech Mono, monospace' }}>
            {rec.score}<span className="text-[#003300]">/100</span>
          </span>
          <button
            onClick={() => saveRec(rec.id)}
            className="text-[10px] transition-colors"
            style={{ color: isSaved ? '#ffaa00' : '#003300', fontFamily: 'Share Tech Mono, monospace' }}
          >
            {isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-0.5 bg-[#001100]">
        <div className="h-full transition-all duration-700" style={{ width: `${rec.score}%`, background: scoreClr, boxShadow: `0 0 6px ${scoreClr}88` }} />
      </div>

      {/* Main ticker row */}
      <div className="px-2 py-2">
        <div className="flex items-baseline gap-2">
          <span
            className="text-lg font-bold tracking-widest glow-green"
            style={{ fontFamily: 'VT323, monospace', color: '#00ff41', fontSize: '22px' }}
          >
            {rec.ticker}
          </span>
          <span
            className="text-[10px] tracking-wider"
            style={{
              fontFamily: 'Share Tech Mono, monospace',
              color: rec.optionType === 'call' ? '#00ff41' : '#ff0055',
              borderLeft: `1px solid ${rec.optionType === 'call' ? '#003300' : '#330011'}`,
              paddingLeft: '6px',
            }}
          >
            ${rec.strike} {typeLabel}
          </span>
        </div>
        <div className="text-[10px] text-[#005522] mt-0.5" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          EXP: {expLabel} &nbsp;·&nbsp; {rec.dte}DTE
        </div>
      </div>

      {/* Metrics */}
      <div
        className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2 py-1.5 border-t border-[#002200] text-[10px]"
        style={{ fontFamily: 'Share Tech Mono, monospace' }}
      >
        <div><span className="text-[#003300]">ASK:</span> <span className="text-[#00cc33]">${fmtPrice(rec.ask)}</span></div>
        <div><span className="text-[#003300]">BRK:</span> <span className="text-[#00cc33]">${fmtPrice(rec.breakeven)}</span></div>
        <div><span className="text-[#003300]">IVR:</span> <span className="text-[#00aaff]">{rec.ivRank}</span></div>
        <div><span className="text-[#003300]">MAX-LOSS:</span> <span className="text-[#ff0055]">${rec.maxLoss}</span></div>
      </div>

      {/* Why Now */}
      {!compact && (
        <div className="px-2 py-1.5 border-t border-[#002200]">
          <div
            className="text-[9px] text-[#003300] tracking-widest mb-1 uppercase"
            style={{ fontFamily: 'Share Tech Mono, monospace' }}
          >
            INTEL:
          </div>
          <p
            className="text-[10px] leading-snug"
            style={{ fontFamily: 'Share Tech Mono, monospace', color: '#007722' }}
          >
            {rec.whyNow}
          </p>
          {rec.risk && (
            <p
              className="text-[10px] mt-1"
              style={{ fontFamily: 'Share Tech Mono, monospace', color: '#ffaa00' }}
            >
              ⚠ {rec.risk}
            </p>
          )}
        </div>
      )}

      {/* Catalysts */}
      {!compact && rec.catalysts.length > 0 && (
        <div className="px-2 pb-1.5 flex flex-col gap-0.5">
          {rec.catalysts.slice(0, 2).map((c) => (
            <div
              key={c.date}
              className="text-[10px]"
              style={{ fontFamily: 'Share Tech Mono, monospace', color: '#005522' }}
            >
              ▸ {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {c.label}
            </div>
          ))}
        </div>
      )}

      {/* Signal breakdown toggle */}
      {!compact && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-2 py-1 text-[9px] text-[#003300] hover:text-[#007722]
                       border-t border-[#002200] transition-colors w-full uppercase tracking-widest"
            style={{ fontFamily: 'Share Tech Mono, monospace' }}
          >
            <span>{expanded ? '▲' : '▼'}</span>
            {expanded ? 'HIDE SIGNALS' : 'SIGNAL BREAKDOWN'}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden px-2 pb-2 flex flex-col gap-1"
              >
                {Object.entries(rec.signals).map(([key, val]) => {
                  const labels: Record<string, string> = {
                    momentum: 'Momentum', ivAnalysis: 'IV', newsSentiment: 'Sentiment',
                    earningsRisk: 'Earn Risk', technicalSetup: 'Technical', optionsFlow: 'Flow',
                  };
                  return <SignalBar key={key} score={val as number} label={labels[key] ?? key} />;
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-1 px-2 py-1.5 border-t border-[#002200] mt-auto">
        <button
          onClick={() => navigate(`/research/${rec.ticker}?rec=${rec.id}`)}
          className="flex-1 text-[10px] py-1 border border-[#003300] text-[#005522] hover:text-[#00ff41]
                     hover:border-[#007700] hover:bg-[#001100] transition-all uppercase tracking-wider"
          style={{ fontFamily: 'Share Tech Mono, monospace' }}
        >
          ▸ RESEARCH
        </button>
        <CopySymbolButton recId={rec.id} optionSymbol={optionSymbol} variant="compact" />
      </div>

      {/* Acted-on status */}
      {isActedOn && (
        <div
          className="px-2 pb-1.5 text-[9px] uppercase tracking-widest"
          style={{ fontFamily: 'Share Tech Mono, monospace', color: '#00ff41' }}
        >
          ✓ EXECUTED · {fmtTimeAgo(rec.createdAt)}
        </div>
      )}
    </motion.div>
  );
}
