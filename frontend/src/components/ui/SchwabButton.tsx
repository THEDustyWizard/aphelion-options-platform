/**
 * APHELION // Copy Option Symbol
 * Schwab OCC-compatible symbol copy button
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { copySymbol } from '../../utils';
import { useUIStore } from '../../store';

interface Props {
  recId: string;
  /** OCC-format option symbol for Schwab */
  optionSymbol: string;
  variant?: 'default' | 'compact' | 'ghost';
  className?: string;
}

export default function SchwabButton({ recId, optionSymbol, variant = 'default', className = '' }: Props) {
  const [copied, setCopied] = useState(false);
  const { markActedOn } = useUIStore();

  async function handleCopy() {
    await copySymbol(optionSymbol);
    markActedOn(recId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast.custom((t) => (
      <div className={`animate-slide-in-right ${t.visible ? 'opacity-100' : 'opacity-0'}`}>
        <div
          className="flex flex-col gap-1 px-3 py-2 border border-[#003300] bg-black"
          style={{ fontFamily: 'Share Tech Mono, monospace' }}
        >
          <span className="text-xs text-[#00ff41]">&gt; SYMBOL COPIED</span>
          <span className="text-xs text-[#007722]">{optionSymbol}</span>
          <span className="text-[10px] text-[#005522]">Schwab: Trade → Symbol Field → Paste</span>
        </div>
      </div>
    ), { duration: 4000 });
  }

  if (variant === 'compact' || variant === 'ghost') {
    return (
      <button
        onClick={handleCopy}
        className={`btn-ghost text-xs gap-1 ${className}`}
        title={`Copy: ${optionSymbol}`}
        style={{ fontFamily: 'Share Tech Mono, monospace' }}
      >
        {copied ? '✓ COPIED' : '⧉ COPY'}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`btn btn-primary text-xs gap-1 ${className}`}
      title={`Copy: ${optionSymbol}`}
      style={{ fontFamily: 'Share Tech Mono, monospace' }}
    >
      {copied ? '✓ SYMBOL COPIED' : '⧉ COPY SYMBOL'}
    </button>
  );
}
