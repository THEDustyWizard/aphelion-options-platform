/**
 * APHELION // Settings Terminal
 */
import { useState, useEffect } from 'react';
import { Bell, Database, Palette, Wifi, WifiOff, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, Link } from 'lucide-react';
import { useSchwabStore } from '../store';
import { initSchwabAuth, completeSchwabAuth, getSchwabStatus } from '../utils/schwab';

type SettingsTab = 'alerts' | 'data' | 'appearance' | 'account';

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('account');

  const TABS = [
    { id: 'account',    label: '🔌 API Config',    icon: Link     },
    { id: 'alerts',     label: '⚡ Alerts',         icon: Bell     },
    { id: 'data',       label: '📡 Data Sources',   icon: Database },
    { id: 'appearance', label: '🎨 Appearance',     icon: Palette  },
  ] as const;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 border-r border-border flex flex-col py-4 gap-1 shrink-0">
        <div className="px-4 pb-3 text-xs font-semibold text-[#4A5568] uppercase tracking-wide">Settings</div>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as SettingsTab)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors
                        ${tab === t.id
                          ? 'bg-primary/10 text-primary border-l-2 border-primary'
                          : 'text-[#8892A4] hover:text-[#E8EAF0] hover:bg-hover'
                        }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'account'    && <SchwabApiSettings />}
        {tab === 'alerts'     && <AlertsSettings />}
        {tab === 'data'       && <DataSettings />}
        {tab === 'appearance' && <AppearanceSettings />}
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="mb-6">
      <h3
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: accent ?? '#4A5568', fontFamily: 'Share Tech Mono, monospace' }}
      >
        {title}
      </h3>
      <div className="border border-[#002200] bg-[#010801] px-4 py-3 flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

function Toggle({ label, description, value, onChange }: {
  label: string; description?: string; value: boolean; onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-[#E8EAF0]">{label}</div>
        {description && <div className="text-[10px] text-[#4A5568]">{description}</div>}
      </div>
      <div
        onClick={onChange}
        className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative shrink-0
                    ${value ? 'bg-primary' : 'bg-border'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
                        ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </div>
  );
}

function TermLabel({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
      <span className="text-[#003300] w-32 shrink-0">{label}:</span>
      <span style={{ color: color ?? '#007722' }}>{value}</span>
    </div>
  );
}

// ─── Schwab API Settings ──────────────────────────────────────────────────────

function SchwabApiSettings() {
  const {
    saveCredentials, getAppKey, getAppSecret, clearCredentials,
    callbackUrl, status, setStatus, setLiveMode, liveMode, hasCredentials,
  } = useSchwabStore();

  const [appKey,   setAppKey]   = useState(() => getAppKey());
  const [appSecret, setAppSecret] = useState(() => getAppSecret());
  const [cbUrl, setCbUrl] = useState(callbackUrl);
  const [authCode, setAuthCode] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [phase, setPhase]       = useState<'idle' | 'awaiting_code' | 'connected'>('idle');
  const [authUrl, setAuthUrl]   = useState('');

  // Hydrate from store on mount
  useEffect(() => {
    if (hasCredentials()) {
      setPhase(status.authenticated ? 'connected' : 'idle');
    }
  }, []);

  // Poll status when in connected phase
  useEffect(() => {
    if (phase !== 'connected') return;
    const interval = setInterval(async () => {
      const s = await getSchwabStatus();
      setStatus(s);
    }, 30_000);
    return () => clearInterval(interval);
  }, [phase]);

  async function handleConnect() {
    setError('');
    if (!appKey.trim() || !appSecret.trim()) {
      setError('App Key and App Secret are required.');
      return;
    }
    setLoading(true);
    try {
      saveCredentials(appKey, appSecret, cbUrl);
      const result = await initSchwabAuth(appKey, appSecret);
      if (result?.authUrl) {
        setAuthUrl(result.authUrl);
        setPhase('awaiting_code');
        // Open in default browser
        if (typeof window !== 'undefined' && (window as any).electron?.shell) {
          (window as any).electron.shell.openExternal(result.authUrl);
        } else {
          window.open(result.authUrl, '_blank');
        }
      } else {
        setError('Failed to generate auth URL. Check credentials.');
      }
    } catch (e: any) {
      setError(e.message ?? 'Connection failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitCode() {
    setError('');
    if (!authCode.trim()) {
      setError('Paste the authorization code from the callback URL.');
      return;
    }
    setLoading(true);
    try {
      const result = await completeSchwabAuth(authCode.trim());
      if (result.success) {
        setPhase('connected');
        const s = await getSchwabStatus();
        setStatus(s);
        setLiveMode(true);
      } else {
        setError(result.message || 'Authentication failed.');
      }
    } catch (e: any) {
      setError(e.message ?? 'Auth exchange failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/api/schwab/disconnect`, { method: 'POST' });
    } catch {}
    clearCredentials();
    setAppKey('');
    setAppSecret('');
    setAuthCode('');
    setPhase('idle');
    setAuthUrl('');
    setLiveMode(false);
    setLoading(false);
  }

  async function handleCheckStatus() {
    setLoading(true);
    try {
      const s = await getSchwabStatus();
      setStatus(s);
      if (s.authenticated) setPhase('connected');
    } catch {}
    setLoading(false);
  }

  const isConnected = phase === 'connected' && status.authenticated;

  return (
    <div>
      {/* Status Header */}
      <Section title="█ SCHWAB API STATUS" accent="#005522">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{
              background: isConnected ? '#00ff41' : status.connected ? '#ffaa00' : '#ff0055',
              boxShadow: isConnected ? '0 0 8px #00ff41' : status.connected ? '0 0 8px #ffaa00' : 'none',
            }}
          />
          <span
            className="text-xs tracking-wider"
            style={{
              fontFamily: 'Share Tech Mono, monospace',
              color: isConnected ? '#00ff41' : status.connected ? '#ffaa00' : '#ff0055',
            }}
          >
            {status.message}
          </span>
          <button
            onClick={handleCheckStatus}
            disabled={loading}
            className="ml-auto text-[10px] text-[#003300] hover:text-[#007722] flex items-center gap-1 transition-colors"
            style={{ fontFamily: 'Share Tech Mono, monospace' }}
          >
            <RefreshCw className="w-3 h-3" />
            REFRESH
          </button>
        </div>

        {isConnected && (
          <div className="flex flex-col gap-1 pt-1 border-t border-[#002200]">
            {status.accountId && <TermLabel label="ACCOUNT ID" value={status.accountId} color="#00cc33" />}
            {status.lastConnected && (
              <TermLabel label="LAST AUTH" value={new Date(status.lastConnected).toLocaleString()} color="#007722" />
            )}
            <TermLabel label="LIVE MODE" value={liveMode ? 'ENABLED ▸ REAL-TIME DATA' : 'DISABLED'} color={liveMode ? '#00ff41' : '#555'} />
          </div>
        )}
      </Section>

      {/* Credentials Form */}
      {!isConnected && (
        <Section title="█ API CREDENTIALS" accent="#005522">
          <div className="text-[10px] text-[#007722] leading-relaxed border-l-2 border-[#003300] pl-3"
               style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            Register at developer.schwab.com → Create app → Copy your App Key and App Secret.
            Set callback URL to match what you registered (default: https://127.0.0.1).
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-[#003300] block mb-1 uppercase tracking-wider"
                     style={{ fontFamily: 'Share Tech Mono, monospace' }}>
                APP KEY (CLIENT ID)
              </label>
              <div className="relative">
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  placeholder="Enter your Schwab App Key..."
                  className="w-full bg-black border border-[#003300] focus:border-[#007700] px-3 py-2 text-xs
                             text-[#00cc33] placeholder-[#003300] outline-none font-mono"
                  style={{ fontFamily: 'Share Tech Mono, monospace' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKeys(!showKeys)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#003300] hover:text-[#007722]"
                >
                  {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#003300] block mb-1 uppercase tracking-wider"
                     style={{ fontFamily: 'Share Tech Mono, monospace' }}>
                APP SECRET (CLIENT SECRET)
              </label>
              <div className="relative">
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="Enter your Schwab App Secret..."
                  className="w-full bg-black border border-[#003300] focus:border-[#007700] px-3 py-2 text-xs
                             text-[#00cc33] placeholder-[#003300] outline-none font-mono"
                  style={{ fontFamily: 'Share Tech Mono, monospace' }}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#003300] block mb-1 uppercase tracking-wider"
                     style={{ fontFamily: 'Share Tech Mono, monospace' }}>
                CALLBACK URL
              </label>
              <input
                type="text"
                value={cbUrl}
                onChange={(e) => setCbUrl(e.target.value)}
                placeholder="https://127.0.0.1"
                className="w-full bg-black border border-[#003300] focus:border-[#007700] px-3 py-2 text-xs
                           text-[#00cc33] placeholder-[#003300] outline-none font-mono"
                style={{ fontFamily: 'Share Tech Mono, monospace' }}
              />
              <div className="text-[10px] text-[#003300] mt-1" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
                Must match exactly what you registered at developer.schwab.com
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[10px] text-[#ff0055]"
                 style={{ fontFamily: 'Share Tech Mono, monospace' }}>
              <AlertCircle className="w-3 h-3 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={loading || !appKey.trim() || !appSecret.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs uppercase tracking-wider
                       border border-[#00ff41] text-[#00ff41] hover:bg-[#001100] transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Share Tech Mono, monospace' }}
          >
            <Wifi className="w-3.5 h-3.5" />
            {loading ? 'CONNECTING...' : '▸ CONNECT TO SCHWAB'}
          </button>
        </Section>
      )}

      {/* OAuth Code Entry (after redirect) */}
      {phase === 'awaiting_code' && !isConnected && (
        <Section title="█ COMPLETE AUTHORIZATION" accent="#ffaa00">
          <div className="text-[10px] text-[#ffaa00] leading-relaxed" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
            {'>'} Browser should have opened to Schwab login. After authorizing, Schwab will redirect
            to your callback URL. Copy the <span className="text-[#00ff41]">code=</span> value from that URL and paste it below.
          </div>

          {authUrl && (
            <div>
              <div className="text-[10px] text-[#003300] mb-1 uppercase tracking-wider"
                   style={{ fontFamily: 'Share Tech Mono, monospace' }}>AUTH URL (if browser didn't open):</div>
              <div className="p-2 border border-[#002200] bg-black text-[10px] text-[#005522] break-all"
                   style={{ fontFamily: 'Share Tech Mono, monospace' }}>
                {authUrl}
              </div>
              <button
                onClick={() => window.open(authUrl, '_blank')}
                className="mt-1 text-[10px] text-[#007722] hover:text-[#00ff41] transition-colors"
                style={{ fontFamily: 'Share Tech Mono, monospace' }}
              >
                ▸ OPEN AUTH URL
              </button>
            </div>
          )}

          <div>
            <label className="text-[10px] text-[#003300] block mb-1 uppercase tracking-wider"
                   style={{ fontFamily: 'Share Tech Mono, monospace' }}>
              PASTE AUTHORIZATION CODE HERE
            </label>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Paste the code= value from the redirect URL..."
              className="w-full bg-black border border-[#ffaa00] focus:border-[#ffcc00] px-3 py-2 text-xs
                         text-[#ffaa00] placeholder-[#554400] outline-none"
              style={{ fontFamily: 'Share Tech Mono, monospace' }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[10px] text-[#ff0055]"
                 style={{ fontFamily: 'Share Tech Mono, monospace' }}>
              <AlertCircle className="w-3 h-3 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmitCode}
              disabled={loading || !authCode.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs uppercase tracking-wider
                         border border-[#ffaa00] text-[#ffaa00] hover:bg-[#110800] transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Share Tech Mono, monospace' }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {loading ? 'VERIFYING...' : '▸ COMPLETE AUTH'}
            </button>
            <button
              onClick={() => { setPhase('idle'); setAuthCode(''); setError(''); }}
              className="px-4 py-2 text-xs text-[#555] hover:text-[#888] border border-[#222] transition-colors"
              style={{ fontFamily: 'Share Tech Mono, monospace' }}
            >
              CANCEL
            </button>
          </div>
        </Section>
      )}

      {/* Connected state actions */}
      {isConnected && (
        <Section title="█ LIVE DATA CONTROLS" accent="#00ff41">
          <div className="flex flex-col gap-2">
            <Toggle
              label="Live Mode (Real-Time Schwab Data)"
              description="Updates bid/ask, Greeks, and IV from Schwab API every 30s"
              value={liveMode}
              onChange={() => setLiveMode(!liveMode)}
            />
          </div>
          <div className="flex gap-2 pt-2 border-t border-[#002200]">
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider
                         border border-[#ff0055] text-[#ff0055] hover:bg-[#110005] transition-colors"
              style={{ fontFamily: 'Share Tech Mono, monospace' }}
            >
              <WifiOff className="w-3.5 h-3.5" />
              DISCONNECT
            </button>
          </div>
        </Section>
      )}

      {/* OCC Symbol Format Reference */}
      <Section title="█ OCC SYMBOL FORMAT REFERENCE" accent="#004422">
        <div className="text-[10px] leading-relaxed text-[#007722]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          APHELION generates OCC-format symbols compatible with Charles Schwab's trade ticket.
          Copy any recommendation symbol directly into the Schwab symbol field.
        </div>
        <div className="p-3 border border-[#003300] bg-black text-[10px]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          <div className="text-[#005522] mb-2">{'>'} FORMAT:</div>
          <div className="text-[#00cc33]">{`<TICKER padded 6><YY><MM><DD><C|P><STRIKE × 1000 padded 8>`}</div>
          <div className="text-[#005522] mt-2 mb-1">{'>'} EXAMPLES:</div>
          <div className="text-[#007722]">AAPL  260418C00195000 → AAPL APR 18 '26 $195.00 CALL</div>
          <div className="text-[#007722]">SPY   260321P00580000 → SPY  MAR 21 '26 $580.00 PUT</div>
          <div className="text-[#007722]">NVDA  260516C00900000 → NVDA MAY 16 '26 $900.00 CALL</div>
        </div>
        <div className="text-[10px] text-[#005522]" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          ⟶ In Schwab: Trade {'>'} Enter Symbol {'>'} Paste OCC Symbol {'>'} Verify details before executing
        </div>
      </Section>
    </div>
  );
}

// ─── Alerts Settings ──────────────────────────────────────────────────────────

function AlertsSettings() {
  const [email, setEmail] = useState(false);
  const [push, setPush] = useState(true);
  const [ivThreshold, setIvThreshold] = useState(70);
  const [vixThreshold, setVixThreshold] = useState(20);

  return (
    <div>
      <Section title="Alert Delivery">
        <Toggle label="Browser Push Notifications" description="Requires permission grant" value={push} onChange={() => setPush(!push)} />
        <Toggle label="Email Alerts" description="Configure email below" value={email} onChange={() => setEmail(!email)} />
      </Section>

      <Section title="Default Thresholds">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[#E8EAF0]">IV Rank Alert Threshold</div>
            <div className="text-[10px] text-[#4A5568]">Alert when IV Rank crosses this level</div>
          </div>
          <input
            type="number"
            value={ivThreshold}
            onChange={(e) => setIvThreshold(+e.target.value)}
            className="w-16 bg-app border border-border rounded-sm px-2 py-1 text-xs text-[#E8EAF0] text-right font-mono"
            min={0} max={100}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[#E8EAF0]">VIX Alert Threshold</div>
            <div className="text-[10px] text-[#4A5568]">Alert when VIX crosses this level</div>
          </div>
          <input
            type="number"
            value={vixThreshold}
            onChange={(e) => setVixThreshold(+e.target.value)}
            className="w-16 bg-app border border-border rounded-sm px-2 py-1 text-xs text-[#E8EAF0] text-right font-mono"
            min={0} max={100}
          />
        </div>
      </Section>

      <button className="btn-primary text-xs">Save Alert Settings</button>
    </div>
  );
}

// ─── Data Settings ────────────────────────────────────────────────────────────

function DataSettings() {
  const [delayed, setDelayed] = useState(true);
  const [unusualWhales, setUnusualWhales] = useState(false);
  const [newsApiKey, setNewsApiKey] = useState('');

  return (
    <div>
      <Section title="Price Data">
        <Toggle
          label="Use 15-minute delayed data"
          description="Free via Yahoo Finance. Disable for real-time (requires Schwab API auth)"
          value={delayed}
          onChange={() => setDelayed(!delayed)}
        />
      </Section>

      <Section title="Options Flow">
        <Toggle
          label="Unusual Whales Integration (~$50/mo)"
          description="Real-time unusual options flow detection"
          value={unusualWhales}
          onChange={() => setUnusualWhales(!unusualWhales)}
        />
      </Section>

      <Section title="News Sources">
        <div>
          <label className="text-[10px] text-[#4A5568] block mb-1">NewsAPI Key (optional — enhances feed)</label>
          <input
            type="password"
            value={newsApiKey}
            onChange={(e) => setNewsApiKey(e.target.value)}
            placeholder="Enter API key..."
            className="w-full bg-app border border-border rounded-sm px-3 py-1.5 text-xs text-[#E8EAF0] placeholder-[#4A5568] focus:outline-none focus:border-primary"
          />
        </div>
        <div className="text-[10px] text-[#4A5568]">
          Enabled sources: Reuters RSS, Benzinga, SEC EDGAR (all free)
        </div>
      </Section>

      <button className="btn-primary text-xs">Save Data Settings</button>
    </div>
  );
}

// ─── Appearance Settings ──────────────────────────────────────────────────────

function AppearanceSettings() {
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [colorBlind, setColorBlind] = useState(false);
  const [animations, setAnimations] = useState(true);

  return (
    <div>
      <Section title="Layout">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[#E8EAF0]">News View Density</div>
            <div className="text-[10px] text-[#4A5568]">Compact = single row, Comfortable = expanded cards</div>
          </div>
          <div className="flex gap-1">
            {(['compact', 'comfortable'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`btn text-xs ${density === d ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[#4A5568] hover:text-[#8892A4]'}`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Accessibility">
        <Toggle label="Color-blind friendly palette" description="Replaces red/green with orange/blue" value={colorBlind} onChange={() => setColorBlind(!colorBlind)} />
        <Toggle label="Reduce motion / animations" description="Disables Framer Motion transitions" value={!animations} onChange={() => setAnimations(!animations)} />
      </Section>

      <button className="btn-primary text-xs">Save Appearance</button>
    </div>
  );
}
