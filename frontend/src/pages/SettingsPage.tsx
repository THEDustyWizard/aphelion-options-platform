import { useState } from 'react';
import { Bell, Database, Palette, User } from 'lucide-react';

type SettingsTab = 'alerts' | 'data' | 'appearance' | 'account';

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('alerts');

  const TABS = [
    { id: 'alerts',     label: '⚡ Alerts',      icon: Bell     },
    { id: 'data',       label: '📡 Data Sources', icon: Database },
    { id: 'appearance', label: '🎨 Appearance',   icon: Palette  },
    { id: 'account',    label: '👤 Account',      icon: User     },
  ] as const;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 border-r border-border flex flex-col py-4 gap-1 shrink-0">
        <div className="px-4 pb-3 text-xs font-semibold text-[#4A5568] uppercase tracking-wide">Settings</div>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
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
        {tab === 'alerts' && <AlertsSettings />}
        {tab === 'data'   && <DataSettings />}
        {tab === 'appearance' && <AppearanceSettings />}
        {tab === 'account'    && <AccountSettings />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wide mb-3">{title}</h3>
      <div className="card px-4 py-3 flex flex-col gap-4">{children}</div>
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
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={ivThreshold}
              onChange={(e) => setIvThreshold(+e.target.value)}
              className="w-16 bg-app border border-border rounded-sm px-2 py-1 text-xs text-[#E8EAF0] text-right font-mono"
              min={0} max={100}
            />
          </div>
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

function DataSettings() {
  const [delayed, setDelayed] = useState(true);
  const [unusualWhales, setUnusualWhales] = useState(false);
  const [newsApiKey, setNewsApiKey] = useState('');

  return (
    <div>
      <Section title="Price Data">
        <Toggle
          label="Use 15-minute delayed data"
          description="Free via Yahoo Finance. Disable for real-time (requires paid API)"
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

function AccountSettings() {
  return (
    <div>
      <Section title="Profile">
        <div>
          <label className="text-[10px] text-[#4A5568] block mb-1">Display Name</label>
          <input
            defaultValue="APHELION"
            className="w-full bg-app border border-border rounded-sm px-3 py-1.5 text-xs text-[#E8EAF0] focus:outline-none focus:border-primary"
          />
        </div>
      </Section>

      <Section title="Schwab API Integration">
        <div className="text-xs leading-relaxed" style={{ fontFamily: 'Share Tech Mono, monospace', color: '#007722' }}>
          APHELION generates OCC-format option symbols compatible with Charles Schwab.
          Copy symbols directly into Schwab's trade ticket symbol field.
        </div>
        <div className="p-3 border border-[#003300] bg-black text-xs" style={{ fontFamily: 'Share Tech Mono, monospace' }}>
          <div className="text-[#005522] mb-1">&gt; OCC SYMBOL FORMAT:</div>
          <div className="text-[#00cc33]">{`<TICKER><YY><MM><DD><C|P><STRIKE×1000 padded 8>`}</div>
          <div className="text-[#005522] mt-1">EXAMPLE: AAPL  260418C00195000 = AAPL APR 18 2026 $195 CALL</div>
        </div>
      </Section>

      <button className="btn-primary text-xs">Save</button>
    </div>
  );
}
