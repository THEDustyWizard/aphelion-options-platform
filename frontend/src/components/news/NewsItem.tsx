import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Bookmark, BookmarkCheck, ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NewsItem as NewsItemType } from '../../types';
import { impactColor, impactLabel, sentimentLabel, fmtTimeAgo } from '../../utils';
import { useUIStore } from '../../store';

interface Props {
  item: NewsItemType;
  forceExpanded?: boolean;
}

export default function NewsItem({ item, forceExpanded = false }: Props) {
  const navigate = useNavigate();
  const { newsViewMode, savedNewsIds, saveNews } = useUIStore();
  const [localExpanded, setLocalExpanded] = useState(false);
  const isSaved = savedNewsIds.includes(item.id);
  const expanded = forceExpanded || newsViewMode === 'expanded' || localExpanded;

  const color = impactColor(item.impact);
  const sent  = sentimentLabel(item.sentiment);
  const isNew = Date.now() - new Date(item.publishedAt).getTime() < 5 * 60_000;
  const isBreaking = item.impact === 'breaking';

  return (
    <div
      className={`border-b border-border/50 transition-colors hover:bg-hover/30
                  ${isBreaking ? 'border-l-2 pl-2' : 'pl-3'}
                  ${isNew && !isBreaking ? 'animate-pulse-border border-l-2' : ''}
                  pr-3`}
      style={isBreaking ? { borderLeftColor: color } : undefined}
    >
      {/* Compact row */}
      <div
        className="flex items-start gap-2 py-2.5 cursor-pointer"
        onClick={() => setLocalExpanded(!localExpanded)}
      >
        {/* Impact badge */}
        <span
          className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-sm border"
          style={{ color, borderColor: `${color}50`, background: `${color}15` }}
        >
          {isBreaking ? '🔴 BREAKING' : impactLabel(item.impact).replace('🔴 HIGH', 'HIGH').replace('🟡 MED', 'MED').replace('🟢 LOW', 'LOW')}
        </span>

        {/* Headline */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs leading-snug ${isBreaking ? 'font-semibold text-[#E8EAF0]' : 'text-[#C8CAD0]'} truncate`}>
            {item.headline}
          </p>
          {!expanded && (
            <p className="text-[10px] text-[#4A5568] mt-0.5">
              {item.source} · {fmtTimeAgo(item.publishedAt)}
              {item.triggeredRecs.length > 0 && (
                <span className="text-primary ml-1">
                  🤖→{item.triggeredRecs[0].label}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-3 h-3 text-[#4A5568] shrink-0 mt-0.5 transition-transform ${localExpanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pb-3 flex flex-col gap-2">
              {/* Source + time */}
              <div className="flex items-center gap-2 text-[10px] text-[#4A5568]">
                <span>{item.source}</span>
                <span>·</span>
                <span>{fmtTimeAgo(item.publishedAt)}</span>
                {isNew && <span className="badge-bull text-[9px]">NEW</span>}
              </div>

              {/* Summary */}
              {item.summary && (
                <p className="text-xs text-[#8892A4] leading-relaxed">{item.summary}</p>
              )}

              {/* Sentiment */}
              <div className="flex items-center gap-2 text-xs">
                <span style={{ color: sent.color }}>{sent.label}</span>
                <span className="text-border">|</span>
                <span className="text-[#4A5568]">Impact:</span>
                <span style={{ color }}>
                  {item.impact.toUpperCase()}
                </span>
              </div>

              {/* Tickers */}
              <div className="flex flex-wrap gap-1">
                {item.tickers.map((t) => (
                  <button
                    key={t}
                    onClick={(e) => { e.stopPropagation(); navigate(`/research/${t}`); }}
                    className="badge-neutral text-[10px] cursor-pointer hover:bg-neutral/30"
                  >
                    {t}
                  </button>
                ))}
                {item.tags.map((tag) => (
                  <span key={tag} className="badge text-[10px] bg-hover text-[#4A5568]">{tag}</span>
                ))}
              </div>

              {/* AI signal */}
              {item.triggeredRecs.length > 0 && (
                <div className="flex flex-col gap-1 p-2 bg-primary/5 border border-primary/20 rounded-sm">
                  <div className="text-[10px] font-semibold text-primary">🤖 AI Signal:</div>
                  {item.triggeredRecs.map((r) => (
                    <div key={r.recId} className="text-xs text-[#8892A4]">
                      Triggered ▶ <span className="text-primary">{r.label}</span>
                      <span className="text-[#4A5568]"> (score: {r.score})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); saveNews(item.id); }}
                  className="btn-ghost text-[10px] gap-1 py-1"
                >
                  {isSaved ? <BookmarkCheck className="w-3 h-3 text-warning" /> : <Bookmark className="w-3 h-3" />}
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                {item.tickers.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/research/${item.tickers[0]}`); }}
                    className="btn-ghost text-[10px] gap-1 py-1"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Research Tickers
                  </button>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost text-[10px] gap-1 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Full Article
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
