import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AiDigest } from '../../types';
import { biasLabel, fmtTimeAgo } from '../../utils';

interface Props {
  digest: AiDigest;
  onRegenerate?: () => void;
}

export default function AiDigestPanel({ digest, onRegenerate }: Props) {
  const navigate = useNavigate();

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div>
          <span className="text-xs font-semibold text-[#E8EAF0]">🤖 AI Catalyst Digest</span>
          <div className="text-[10px] text-[#4A5568] mt-0.5">
            Generated {fmtTimeAgo(digest.generatedAt)} for your watchlist
          </div>
        </div>
        <button
          onClick={onRegenerate}
          className="btn-ghost p-1 text-[10px] gap-1"
          title="Regenerate digest"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col divide-y divide-border/50">
        {digest.entries.map((entry) => {
          const { emoji, color } = biasLabel(entry.bias);
          return (
            <div key={entry.ticker} className="px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-semibold text-sm text-[#E8EAF0]">{emoji} {entry.ticker}</span>
                <span className="text-xs capitalize" style={{ color }}>— {entry.bias}</span>
              </div>
              <p className="text-xs text-[#8892A4] leading-relaxed">{entry.summary}</p>
              {entry.linkedRecLabel && (
                <button
                  onClick={() => navigate(`/research/${entry.ticker}?rec=${entry.linkedRecId}`)}
                  className="mt-1.5 text-xs text-primary hover:underline flex items-center gap-1"
                >
                  [{entry.linkedRecLabel} →]
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 px-3 py-2 border-t border-border/50">
        <button className="btn-ghost text-xs flex-1 justify-center" onClick={onRegenerate}>
          Regenerate
        </button>
        <button className="btn-ghost text-xs flex-1 justify-center">
          Customize Tickers
        </button>
      </div>
    </div>
  );
}
