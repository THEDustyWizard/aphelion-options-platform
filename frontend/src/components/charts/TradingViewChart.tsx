import { useEffect, useRef } from 'react';

interface Props {
  ticker: string;
  height?: number;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => void;
    };
  }
}

let scriptLoaded = false;

function loadScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js';
    s.async = true;
    s.onload = () => { scriptLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}

export default function TradingViewChart({ ticker, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef    = useRef<unknown>(null);
  const idRef        = useRef(`tv-${ticker}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.TradingView) return;
      widgetRef.current = new window.TradingView.widget({
        autosize:         true,
        symbol:           `NASDAQ:${ticker}`,
        interval:         'D',
        timezone:         'America/New_York',
        theme:            'dark',
        style:            '1',
        locale:           'en',
        toolbar_bg:       '#141720',
        enable_publishing: false,
        allow_symbol_change: true,
        save_image:       false,
        container_id:     idRef.current,
        hide_side_toolbar: false,
        studies:          ['MASimple@tv-scriptStudy', 'BB@tv-scriptStudy'],
        overrides: {
          'paneProperties.background':          '#0D0F14',
          'paneProperties.vertGridProperties.color': '#2A3050',
          'paneProperties.horzGridProperties.color': '#2A3050',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor':         '#8892A4',
        },
      });
    });
    return () => { cancelled = true; };
  }, [ticker]);

  return (
    <div ref={containerRef} style={{ minHeight: height }} className="w-full rounded-md overflow-hidden">
      <div id={idRef.current} style={{ height }} className="w-full" />
    </div>
  );
}
