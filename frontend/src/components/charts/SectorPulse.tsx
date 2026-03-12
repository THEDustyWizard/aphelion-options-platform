import { useNavigate } from 'react-router-dom';
import type { SectorSentiment } from '../../types';
import { fmtPct } from '../../utils';

function bar(score: number) {
  // score -1 to 1, render as filled bar
  const pct = Math.round(((score + 1) / 2) * 100);
  const color = score > 0.2 ? '#00E5A0' : score > -0.2 ? '#6C8EEF' : '#FF4D6D';
  return { pct, color };
}

interface Props {
  sectors: SectorSentiment[];
  compact?: boolean;
}

export default function SectorPulse({ sectors, compact = false }: Props) {
  const navigate = useNavigate();
  return (
    <div className="card">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <span className="text-xs font-semibold text-[#E8EAF0]">📊 Sector Pulse (24h)</span>
      </div>
      <div className="flex flex-col gap-0 divide-y divide-border/30">
        {sectors.map((s) => {
          const { pct, color } = bar(s.score);
          const biasEmoji = s.bias === 'bullish' ? '🟢' : s.bias === 'neutral' ? '⚖️' : '🔴';
          return (
            <div key={s.name} className="flex items-center gap-3 px-3 py-2">
              <span className="text-xs text-[#8892A4] w-16 shrink-0">{s.name}</span>
              <span className="text-[10px]">{biasEmoji}</span>
              <div className="flex-1 bg-border h-1 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-mono shrink-0" style={{ color }}>
                {fmtPct(s.changePct, 1)}
              </span>
            </div>
          );
        })}
      </div>
      {!compact && (
        <div className="px-3 py-2 border-t border-border/50">
          <button
            onClick={() => navigate('/screener')}
            className="text-xs text-primary hover:underline"
          >
            Drill into sector →
          </button>
        </div>
      )}
    </div>
  );
}
