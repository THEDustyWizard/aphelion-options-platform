import { useEffect, useRef, useState } from 'react';
import { scoreColor } from '../../utils';

interface Props {
  score: number;     // 0-100
  label?: string;
  showValue?: boolean;
  height?: string;
  className?: string;
}

export default function ScoreBar({ score, label, showValue = true, height = 'h-1.5', className = '' }: Props) {
  const [width, setWidth] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      const t = setTimeout(() => setWidth(score), 50);
      return () => clearTimeout(t);
    }
  }, [score]);

  const color = scoreColor(score);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-[#8892A4] w-28 shrink-0">{label}</span>}
      <div className={`flex-1 ${height} rounded-full bg-border overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-[600ms] ease-out`}
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-mono font-semibold w-8 text-right shrink-0" style={{ color }}>
          {score}%
        </span>
      )}
    </div>
  );
}
