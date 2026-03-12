/**
 * APHELION // Boot Sequence
 * CIA terminal boot animation displayed on first launch
 */
import { useEffect, useState } from 'react';

const BOOT_LINES = [
  { delay: 0,    text: 'BIOS v2.7.3 ... OK',                      color: '#003300' },
  { delay: 80,   text: 'INITIALIZING APHELION TERMINAL OS v1.0',   color: '#00ff41' },
  { delay: 160,  text: 'LOADING CRYPTOGRAPHIC MODULES ... OK',      color: '#003300' },
  { delay: 300,  text: 'ESTABLISHING SCHWAB API UPLINK ...',         color: '#007722' },
  { delay: 500,  text: '  SCHWAB: AWAITING CREDENTIALS',            color: '#ffaa00' },
  { delay: 650,  text: 'LOADING MARKET DATA FEEDS ... OK',          color: '#003300' },
  { delay: 750,  text: 'INITIALIZING OPTIONS SCREENER ... OK',      color: '#003300' },
  { delay: 850,  text: 'LOADING RECOMMENDATION ENGINE ... OK',      color: '#003300' },
  { delay: 950,  text: 'INITIALIZING NEURAL FEED PARSER ... OK',    color: '#003300' },
  { delay: 1050, text: '─────────────────────────────────────────', color: '#002200' },
  { delay: 1100, text: 'ALL SYSTEMS NOMINAL',                       color: '#00ff41' },
  { delay: 1200, text: '> APHELION READY',                          color: '#00ff41' },
];

interface Props {
  onComplete: () => void;
}

export default function BootScreen({ onComplete }: Props) {
  const [lines, setLines] = useState<typeof BOOT_LINES>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    BOOT_LINES.forEach((line) => {
      setTimeout(() => {
        if (!mounted) return;
        setLines((prev) => [...prev, line]);
      }, line.delay);
    });
    setTimeout(() => {
      if (!mounted) return;
      setDone(true);
      setTimeout(onComplete, 600);
    }, 1800);
    return () => { mounted = false; };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center z-[99999]"
      style={{ transition: done ? 'opacity 0.6s' : undefined, opacity: done ? 0 : 1 }}
    >
      <div className="w-full max-w-2xl px-8">
        {/* ASCII Header */}
        <pre
          className="text-center mb-6"
          style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: '#003300', lineHeight: 1.2 }}
        >
{`  █████╗ ██████╗ ██╗  ██╗███████╗██╗     ██╗ ██████╗ ███╗   ██╗
 ██╔══██╗██╔══██╗██║  ██║██╔════╝██║     ██║██╔═══██╗████╗  ██║
 ███████║██████╔╝███████║█████╗  ██║     ██║██║   ██║██╔██╗ ██║
 ██╔══██║██╔═══╝ ██╔══██║██╔══╝  ██║     ██║██║   ██║██║╚██╗██║
 ██║  ██║██║     ██║  ██║███████╗███████╗██║╚██████╔╝██║ ╚████║
 ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝`}
        </pre>
        <div
          className="text-center mb-8 tracking-[0.3em] text-xs"
          style={{ fontFamily: 'Share Tech Mono, monospace', color: '#005522' }}
        >
          OPTIONS INTELLIGENCE TERMINAL // CLASSIFICATION: SECRET
        </div>

        {/* Boot lines */}
        <div className="flex flex-col gap-1 min-h-[200px]">
          {lines.map((line, i) => (
            <div
              key={i}
              className="text-xs animate-scan-in"
              style={{ fontFamily: 'Share Tech Mono, monospace', color: line.color, lineHeight: 1.4 }}
            >
              {line.text}
              {i === lines.length - 1 && (
                <span className="animate-blink text-[#00ff41]">█</span>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-6 border border-[#002200] h-1 bg-black overflow-hidden">
          <div
            className="h-full bg-[#00ff41] transition-all duration-[1200ms]"
            style={{
              width: `${(lines.length / BOOT_LINES.length) * 100}%`,
              boxShadow: '0 0 8px #00ff41',
            }}
          />
        </div>
      </div>
    </div>
  );
}
