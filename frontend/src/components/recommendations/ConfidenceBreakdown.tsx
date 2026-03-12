/**
 * APHELION // Confidence Breakdown
 * Breakdown of confidence scoring across 5 factors.
 * Green >70 | Yellow 50-70 | Red <50
 */
import type { ConfidenceBreakdown as ConfBreakdown } from '../../types';

interface Props {
  breakdown: ConfBreakdown;
  compact?: boolean;
}

const FACTORS: Array<{ key: keyof Omit<ConfBreakdown, 'total' | 'level'>; label: string; weight: number }> = [
  { key: 'technical',        label: 'Technical',    weight: 30 },
  { key: 'fundamental',      label: 'Fundamental',  weight: 25 },
  { key: 'sectorMomentum',   label: 'Sector Mom.',  weight: 20 },
  { key: 'optionsMetrics',   label: 'Options Flow', weight: 15 },
  { key: 'marketConditions', label: 'Market Cond.', weight: 10 },
];

function scoreColor(score: number): string {
  if (score >= 70) return '#00ff41';
  if (score >= 50) return '#ffaa00';
  return '#ff0055';
}

function levelStyle(level: 'high' | 'medium' | 'low') {
  if (level === 'high')   return { color: '#00ff41', border: '1px solid #00ff4144', bg: '#00ff4108' };
  if (level === 'medium') return { color: '#ffaa00', border: '1px solid #ffaa0044', bg: '#ffaa0008' };
  return { color: '#ff0055', border: '1px solid #ff005544', bg: '#ff005508' };
}

export default function ConfidenceBreakdown({ breakdown, compact = false }: Props) {
  const { total, level } = breakdown;
  const ls = levelStyle(level);

  return (
    <div
      className="flex flex-col gap-1 rounded-sm px-2 py-1.5"
      style={{ background: ls.bg, border: ls.border }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] uppercase tracking-widest text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          Confidence
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] uppercase tracking-wider px-1 py-0.5"
            style={{ fontFamily: 'Share Tech Mono, monospace', color: ls.color, border: ls.border }}
          >
            {level.toUpperCase()}
          </span>
          <span
            className="text-sm font-bold"
            style={{ fontFamily: 'Share Tech Mono, monospace', color: ls.color, textShadow: `0 0 8px ${ls.color}66` }}
          >
            {total}%
          </span>
        </div>
      </div>

      {/* Factor bars */}
      {FACTORS.map(({ key, label, weight }) => {
        const score = breakdown[key] as number;
        const color = scoreColor(score);
        const barWidth = `${score}%`;

        return (
          <div key={key} className={`flex flex-col gap-0.5 ${compact ? '' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-[#003300]" style={{ fontFamily: 'Share Tech Mono, monospace', width: '68px' }}>
                  {label}
                </span>
                <span className="text-[7px] text-[#002200]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
                  ×{weight}%
                </span>
              </div>
              <span
                className="text-[9px] font-bold"
                style={{ fontFamily: 'Share Tech Mono, monospace', color }}
              >
                {score}
              </span>
            </div>
            {!compact && (
              <div className="h-0.5 bg-[#001100] border border-[#002200] overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: barWidth, background: color, opacity: 0.6, boxShadow: `0 0 4px ${color}` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
