/**
 * APHELION Desktop - Custom Terminal Titlebar
 * Replaces OS native titlebar with CIA terminal aesthetic
 */
import { useState, useEffect } from 'react';

declare global {
  interface Window {
    electron?: {
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
      };
      app: {
        version: () => Promise<string>;
        platform: () => Promise<string>;
      };
    };
  }
}

const isElectron = typeof window !== 'undefined' && !!window.electron;

export default function TitleBar() {
  const [time, setTime] = useState('');
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="titlebar-drag-region h-8 bg-black border-b border-[#003300] flex items-center px-3 shrink-0 select-none"
      style={{ boxShadow: '0 1px 0 #00ff4122' }}
    >
      {/* Classification banner */}
      <div className="flex items-center gap-2">
        <span
          className="vt323 text-[#00ff41] text-sm tracking-widest glow-green"
          style={{ fontFamily: 'VT323, monospace', fontSize: '16px' }}
        >
          ◈ APHELION
        </span>
        <span
          className="text-[10px] tracking-widest px-1 border border-[#003300] text-[#005522]"
          style={{ fontFamily: 'Share Tech Mono, monospace' }}
        >
          CLASSIFIED
        </span>
      </div>

      {/* Center - session info */}
      <div className="flex-1 flex items-center justify-center gap-4 titlebar-no-drag pointer-events-none">
        <span
          className="text-[10px] text-[#005522] tracking-widest"
          style={{ fontFamily: 'Share Tech Mono, monospace' }}
        >
          SESSION: ALPHA-7 ▸ TERMINAL: ACTIVE ▸ UPLINK: OK
        </span>
      </div>

      {/* Right: Clock + Window controls */}
      <div className="titlebar-no-drag flex items-center gap-3">
        {/* Live clock */}
        <span
          className="text-[#00ff41] tracking-widest tabular-nums"
          style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '12px', textShadow: '0 0 6px #00ff4188' }}
        >
          {time}
        </span>

        {/* Window controls (Electron only) */}
        {isElectron && (
          <div className="flex items-center gap-1 ml-2">
            <button
              className="w-4 h-4 flex items-center justify-center border border-[#003300] bg-black
                         text-[#005522] hover:text-[#ffaa00] hover:border-[#ffaa00] text-[10px]
                         transition-colors cursor-pointer"
              onClick={() => window.electron!.window.minimize()}
              title="Minimize"
            >
              _
            </button>
            <button
              className="w-4 h-4 flex items-center justify-center border border-[#003300] bg-black
                         text-[#005522] hover:text-[#00ff41] hover:border-[#00ff41] text-[10px]
                         transition-colors cursor-pointer"
              onClick={async () => {
                window.electron!.window.maximize();
                setIsMax(await window.electron!.window.isMaximized());
              }}
              title={isMax ? 'Restore' : 'Maximize'}
            >
              {isMax ? '⊡' : '□'}
            </button>
            <button
              className="w-4 h-4 flex items-center justify-center border border-[#003300] bg-black
                         text-[#005522] hover:text-[#ff0055] hover:border-[#ff0055] text-[10px]
                         transition-colors cursor-pointer"
              onClick={() => window.electron!.window.close()}
              title="Close"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
