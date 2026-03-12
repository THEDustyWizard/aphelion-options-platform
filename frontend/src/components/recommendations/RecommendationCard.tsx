/**
 * APHELION // Recommendation Terminal Card
 * Enhanced with calculation transparency and live data
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import type { Recommendation, CalculationDetails } from '../../types';
import {
  convictionLabel, scoreColor,
  fmtPrice, fmtTimeAgo,
} from '../../utils';
import { useUIStore, useSchwabStore } from '../../store';
import CopySymbolButton from '../ui/SchwabButton';
import { getQuote } from '../../utils/schwab';

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

// ─── Calculation Transparency Panel ─────────────────────────────────────────

function CalcRow({ label, value, accent, formula }: {
  label: string; value: string; accent?: string; formula?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-start gap-2 text-[10px]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        <span className="text-[#003300] w-36 shrink-0">{label}:</span>
        <span style={{ color: accent ?? '#00cc33' }}>{value}</span>
      </div>
      {formula && (
        <div className="text-[9px] text-[#003300] pl-38" style={{ fontFamily: 'Share Tech Mono, monospace', paddingLeft: '9.5rem' }}>
          ↳ {formula}
        </div>
      )}
    </div>
  );
}

function CalcSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[9px] text-[#003300] uppercase tracking-widest mb-1.5 border-b border-[#001800] pb-0.5"
           style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        ── {title} ──
      </div>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
}

function CalculationsPanel({ calc, rec }: { calc: CalculationDetails; rec: Recommendation }) {
  const ts = calc.tradeSignals;
  const exp = new Date(rec.expiry);
  const expFormatted = `${(exp.getMonth() + 1).toString().padStart(2, '0')}/${exp.getDate().toString().padStart(2, '0')}/${exp.getFullYear()}`;
  const today = new Date();
  const dteCalc = Math.max(0, Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const pop = calc.output.probabilityOfProfit;
  const popColor = pop >= 60 ? '#00ff41' : pop >= 40 ? '#ffaa00' : '#ff0055';

  return (
    <div className="px-2 pb-2 flex flex-col gap-1">

      {/* ── Trade Signals ── */}
      <CalcSection title="TRADE SIGNALS">
        <CalcRow label="BUY AT"     value={`$${fmtPrice(ts.buyAt)}`}      accent="#00ff41"
                 formula={`Limit order at ask price`} />
        <CalcRow label="SELL TARGET" value={`$${fmtPrice(ts.sellTarget)}`} accent="#00cc33"
                 formula={`Ask × ${(1 + ts.profitTargetPct / 100).toFixed(2)} = ${ts.profitTargetPct}% gain`} />
        <CalcRow label="STOP LOSS"  value={`$${fmtPrice(ts.stopLoss)}`}   accent="#ff4455"
                 formula={`Ask × ${(1 - ts.stopLossPct / 100).toFixed(2)} = ${ts.stopLossPct}% loss`} />
        <CalcRow label="BREAKEVEN"  value={`$${fmtPrice(ts.breakeven)}`}  accent="#ffaa00"
                 formula={calc.output.breakevenFormula} />
        <CalcRow label="EXPIRATION" value={expFormatted}                   accent="#aaaaff"
                 formula={`${dteCalc} DTE — ${dteCalc > 30 ? 'time decay minimal' : dteCalc > 14 ? 'theta accelerating' : 'theta risk high'}`} />
      </CalcSection>

      {/* ── Model Inputs ── */}
      <CalcSection title={`${calc.model.toUpperCase()} MODEL INPUTS`}>
        <CalcRow label="UNDERLYING"    value={`$${fmtPrice(calc.inputs.underlyingPrice)}`} />
        <CalcRow label="STRIKE"        value={`$${calc.inputs.strikePrice}`} />
        <CalcRow label="PREMIUM PAID"  value={`$${fmtPrice(calc.inputs.premium)}`} />
        <CalcRow label="IMPLIED VOL"   value={`${(calc.inputs.impliedVol * 100).toFixed(1)}%`} accent="#00aaff" />
        {calc.inputs.historicalVol != null && (
          <CalcRow
            label="HIST VOL (30D)"
            value={`${(calc.inputs.historicalVol * 100).toFixed(1)}%`}
            accent="#0088cc"
            formula={calc.intermediate.ivVsHvLabel}
          />
        )}
        <CalcRow label="TIME TO EXP"   value={`${calc.inputs.timeToExpiryYears.toFixed(4)} yrs (${dteCalc}d)`} accent="#888" />
        <CalcRow label="RISK-FREE RATE" value={`${(calc.inputs.riskFreeRate * 100).toFixed(2)}%`} accent="#888" />
      </CalcSection>

      {/* ── Intermediate Steps ── */}
      <CalcSection title="INTERMEDIATE CALCULATIONS">
        <CalcRow label="d1" value={calc.intermediate.d1.toFixed(6)}
                 formula={`[ln(S/K) + (r + σ²/2)T] / (σ√T)`} />
        <CalcRow label="d2" value={calc.intermediate.d2.toFixed(6)}
                 formula={`d1 − σ√T`} />
        <CalcRow label="N(d1)" value={calc.intermediate.nd1.toFixed(6)}
                 formula={`CDF of d1 (delta exposure)`} />
        <CalcRow label="N(d2)" value={calc.intermediate.nd2.toFixed(6)}
                 formula={`CDF of d2 (risk-neutral probability)`} />
        <CalcRow label="THEORETICAL PRICE" value={`$${fmtPrice(calc.intermediate.theoreticalPrice)}`} accent="#ffcc00"
                 formula={rec.optionType === 'call'
                   ? `S·N(d1) − K·e^(−rT)·N(d2)`
                   : `K·e^(−rT)·N(−d2) − S·N(−d1)`} />
      </CalcSection>

      {/* ── Greeks ── */}
      <CalcSection title="GREEKS">
        <CalcRow label="DELTA (Δ)"  value={calc.greeks.delta.toFixed(4)}  accent="#00aaff"
                 formula={rec.optionType === 'call' ? 'N(d1) — $/$ move with stock' : 'N(d1) − 1 — $/$ move with stock'} />
        <CalcRow label="GAMMA (Γ)"  value={calc.greeks.gamma.toFixed(6)}  accent="#0088dd"
                 formula={`Rate of delta change per $1 stock move`} />
        <CalcRow label="THETA (Θ)"  value={`-$${Math.abs(calc.greeks.theta).toFixed(4)}/day`} accent="#ff8844"
                 formula={`Daily time decay — option loses this per day`} />
        <CalcRow label="VEGA (ν)"   value={`$${calc.greeks.vega.toFixed(4)}/1% IV`} accent="#aa44ff"
                 formula={`P&L change per +1% implied volatility`} />
        <CalcRow label="RHO (ρ)"    value={`$${calc.greeks.rho.toFixed(4)}/1% rate`} accent="#888"
                 formula={`P&L change per +1% risk-free rate`} />
      </CalcSection>

      {/* ── Output Summary ── */}
      <CalcSection title="RISK / REWARD SUMMARY">
        <CalcRow label="PROB OF PROFIT"  value={`${pop.toFixed(1)}%`}                    accent={popColor} />
        <CalcRow label="EXPECTED RETURN" value={`$${fmtPrice(calc.output.expectedReturn)}`} accent={calc.output.expectedReturn >= 0 ? '#00cc33' : '#ff0055'} />
        <CalcRow label="MAX LOSS"        value={`-$${fmtPrice(calc.output.maxLoss)}`}     accent="#ff4455" />
        <CalcRow label="MAX PROFIT"      value={calc.output.maxProfit != null ? `$${fmtPrice(calc.output.maxProfit)}` : 'UNLIMITED'} accent="#00ff41" />
        <CalcRow label="RISK/REWARD"     value={calc.output.riskRewardRatio}              accent="#ffcc00" />
      </CalcSection>

      {/* ── Strike Selection ── */}
      <CalcSection title="STRIKE SELECTION LOGIC">
        <div className="text-[10px] text-[#007722] leading-snug" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          {calc.strikeSelectionReason}
        </div>
      </CalcSection>

    </div>
  );
}

// ─── Live Data Badge ──────────────────────────────────────────────────────────

function LiveDataBadge({ rec, onRefresh }: { rec: Recommendation; onRefresh: () => void }) {
  if (!rec.liveData) return null;
  const age = Math.floor((Date.now() - new Date(rec.liveData.lastUpdated).getTime()) / 1000);
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 bg-[#001800] border-b border-[#002200]">
      <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
      <span className="text-[9px] text-[#007722]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
        LIVE · {age}s ago · BID:{fmtPrice(rec.liveData.bid)} / ASK:{fmtPrice(rec.liveData.ask)}
      </span>
      <button onClick={onRefresh} className="ml-auto text-[#003300] hover:text-[#007722]">
        <RefreshCw className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export default function RecommendationCard({ rec: initialRec, compact = false }: Props) {
  const navigate = useNavigate();
  const { savedRecIds, actedOnRecIds, saveRec } = useUIStore();
  const { status: schwabStatus, liveMode } = useSchwabStore();
  const [expanded, setExpanded]     = useState(false);
  const [calcExpanded, setCalcExpanded] = useState(false);
  const [rec, setRec]               = useState(initialRec);
  const [liveLoading, setLiveLoading] = useState(false);

  const isSaved   = savedRecIds.includes(rec.id);
  const isActedOn = actedOnRecIds.includes(rec.id);
  const scoreClr  = scoreColor(rec.score);

  const typeLabel = rec.optionType === 'call' ? 'CALL' : 'PUT';
  const expLabel  = new Date(rec.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const optionSymbol = (rec as any).optionSymbol ?? (rec as any).schwabSymbol ?? `${rec.ticker} ${typeLabel}`;

  // Auto-fetch live data if Schwab is connected and liveMode is on
  useEffect(() => {
    if (!liveMode || !schwabStatus.authenticated || !optionSymbol) return;
    fetchLiveData();
    const id = setInterval(fetchLiveData, 30_000);
    return () => clearInterval(id);
  }, [liveMode, schwabStatus.authenticated]);

  async function fetchLiveData() {
    if (!optionSymbol) return;
    setLiveLoading(true);
    try {
      const q = await getQuote(optionSymbol.replace(/\s+/g, ''));
      if (q) {
        setRec((prev) => ({
          ...prev,
          liveData: {
            bid: q.bid,
            ask: q.ask,
            last: q.last,
            iv: q.impliedVolatility ?? undefined,
            delta: q.delta ?? undefined,
            theta: q.theta ?? undefined,
            gamma: q.gamma ?? undefined,
            vega: q.vega ?? undefined,
            lastUpdated: new Date().toISOString(),
          },
        }));
      }
    } catch {
      // Silent fail on live data
    } finally {
      setLiveLoading(false);
    }
  }

  // Use live bid/ask if available
  const displayAsk = rec.liveData?.ask ?? rec.ask;
  const displayBid = rec.liveData?.bid;

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
      {/* Live data banner */}
      {rec.liveData && !compact && (
        <LiveDataBadge rec={rec} onRefresh={fetchLiveData} />
      )}

      {/* Score header row */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-[#002200] bg-[#010801]">
        <span
          className="text-[10px] tracking-widest uppercase"
          style={{ fontFamily: 'Share Tech Mono, monospace', color: scoreClr, textShadow: `0 0 6px ${scoreClr}77` }}
        >
          {convictionLabel(rec.conviction).replace(/[🔥📊📉]/g, '').trim()}
        </span>
        <div className="flex items-center gap-2">
          {liveLoading && (
            <span className="text-[9px] text-[#003300] animate-pulse" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
              ◌ LIVE
            </span>
          )}
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
        {displayBid != null ? (
          <div><span className="text-[#003300]">BID:</span> <span className="text-[#00cc33]">${fmtPrice(displayBid)}</span></div>
        ) : null}
        <div><span className="text-[#003300]">ASK:</span> <span className="text-[#00cc33]">${fmtPrice(displayAsk)}</span></div>
        <div><span className="text-[#003300]">BRK:</span> <span className="text-[#00cc33]">${fmtPrice(rec.breakeven)}</span></div>
        <div><span className="text-[#003300]">IVR:</span> <span className="text-[#00aaff]">{rec.ivRank}</span></div>
        <div><span className="text-[#003300]">MAX-LOSS:</span> <span className="text-[#ff0055]">${rec.maxLoss}</span></div>
        {rec.calculationDetails && (
          <div>
            <span className="text-[#003300]">P(PROFIT):</span>{' '}
            <span style={{ color: rec.calculationDetails.output.probabilityOfProfit >= 50 ? '#00ff41' : '#ffaa00' }}>
              {rec.calculationDetails.output.probabilityOfProfit.toFixed(0)}%
            </span>
          </div>
        )}
        {rec.liveData?.delta != null && (
          <div><span className="text-[#003300]">Δ:</span> <span className="text-[#0099ff]">{rec.liveData.delta?.toFixed(3)}</span></div>
        )}
        {rec.liveData?.theta != null && (
          <div><span className="text-[#003300]">Θ:</span> <span className="text-[#ff8844]">-${Math.abs(rec.liveData.theta ?? 0).toFixed(3)}/d</span></div>
        )}
      </div>

      {/* Trade Signals Quick View (when no calc details, show inline) */}
      {!compact && rec.calculationDetails && (
        <div
          className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2 py-1.5 border-t border-[#002200] text-[10px] bg-[#020d02]"
          style={{ fontFamily: 'Share Tech Mono, monospace' }}
        >
          <div><span className="text-[#003300]">BUY AT:</span> <span className="text-[#00ff41]">${fmtPrice(rec.calculationDetails.tradeSignals.buyAt)}</span></div>
          <div><span className="text-[#003300]">TARGET:</span> <span className="text-[#00cc33]">${fmtPrice(rec.calculationDetails.tradeSignals.sellTarget)}</span></div>
          <div><span className="text-[#003300]">STOP:</span> <span className="text-[#ff4455]">${fmtPrice(rec.calculationDetails.tradeSignals.stopLoss)}</span></div>
          <div><span className="text-[#003300]">R/R:</span> <span className="text-[#ffcc00]">{rec.calculationDetails.output.riskRewardRatio}</span></div>
        </div>
      )}

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

      {/* ── Calculation Transparency Toggle ── */}
      {!compact && rec.calculationDetails && (
        <>
          <button
            onClick={() => setCalcExpanded(!calcExpanded)}
            className="flex items-center gap-1 px-2 py-1 text-[9px] hover:text-[#00ff41]
                       border-t border-[#002200] transition-colors w-full uppercase tracking-widest"
            style={{
              fontFamily: 'Share Tech Mono, monospace',
              color: calcExpanded ? '#00ff41' : '#007722',
              background: calcExpanded ? '#020d02' : 'transparent',
            }}
          >
            <span>{calcExpanded ? '▲' : '▼'}</span>
            {calcExpanded ? 'HIDE CALCULATIONS' : '⊞ HOW THIS WAS CALCULATED'}
            <span className="ml-auto text-[8px] text-[#003300]">
              {rec.calculationDetails.model}
            </span>
          </button>

          <AnimatePresence>
            {calcExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-[#001800]"
              >
                <CalculationsPanel calc={rec.calculationDetails} rec={rec} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
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
        {liveMode && schwabStatus.authenticated && !compact && (
          <button
            onClick={fetchLiveData}
            disabled={liveLoading}
            className="text-[10px] py-1 px-2 border border-[#003300] text-[#005522] hover:text-[#00ff41]
                       hover:border-[#007700] hover:bg-[#001100] transition-all uppercase tracking-wider"
            style={{ fontFamily: 'Share Tech Mono, monospace' }}
            title="Refresh live data"
          >
            <RefreshCw className={`w-3 h-3 ${liveLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
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
