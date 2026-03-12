/**
 * APHELION // OPTIONS PRICING LABORATORY
 * ████████████████████████████████████████
 * CLASSIFICATION: TOP SECRET // SCI
 * Windows 98 × CIA Terminal Hybrid Interface
 * ████████████████████████████████████████
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  blackScholesMerton,
  binomialTree,
  monteCarlo,
  finiteDifference,
  hestonModel,
  jumpDiffusion,
  varianceGamma,
  localVolatility,
  runAllModels,
  type OptionParams,
  type PricingResult,
  type ModelName,
} from '../utils/optionsPricing';

// ─── Win98 Tokens ────────────────────────────────────────────────────────────
const W98 = {
  bg:         '#c0c0c0',
  bgDark:     '#808080',
  bgLight:    '#ffffff',
  titleBar:   'linear-gradient(180deg, #000080 0%, #1084d0 100%)',
  titleText:  '#ffffff',
  border3d:   '2px solid',
  btnBg:      '#c0c0c0',
  btnHover:   '#d4d4d4',
  raised: {
    borderTop:    '2px solid #ffffff',
    borderLeft:   '2px solid #ffffff',
    borderRight:  '2px solid #808080',
    borderBottom: '2px solid #808080',
  },
  sunken: {
    borderTop:    '2px solid #808080',
    borderLeft:   '2px solid #808080',
    borderRight:  '2px solid #ffffff',
    borderBottom: '2px solid #ffffff',
  },
  // CIA green overlay
  green: '#00ff41',
  greenDim: '#005522',
  termBg: '#0a0a0a',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelMeta {
  name: ModelName;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  bestFor: string;
  assumptions: string[];
  mathFormula: string;
  params: string[];
  reference: string;
  compute: (p: OptionParams) => PricingResult;
  isHeavy?: boolean;
}

const MODEL_META: ModelMeta[] = [
  {
    name: 'Black-Scholes-Merton',
    shortName: 'BSM',
    icon: '▣',
    color: '#00ff41',
    description: 'The seminal 1973 closed-form analytical solution for European option pricing. Assumes log-normal asset price distribution and constant volatility.',
    bestFor: 'European options, quick benchmark pricing, liquid equity options',
    assumptions: [
      'Constant volatility (flat vol surface)',
      'No dividends (extended by Merton for continuous dividend yield)',
      'No transaction costs or taxes',
      'Continuous trading possible',
      'Risk-free rate is constant and known',
      'Log-normally distributed returns',
    ],
    mathFormula: 'C = S·e^(-qT)·N(d₁) - K·e^(-rT)·N(d₂)\nd₁ = [ln(S/K) + (r-q+σ²/2)T] / (σ√T)\nd₂ = d₁ - σ√T',
    params: ['S (spot)', 'K (strike)', 'T (expiry)', 'r (rate)', 'q (div yield)', 'σ (vol)'],
    reference: 'Black, F., & Scholes, M. (1973). Journal of Political Economy. Merton, R. (1973). Bell Journal of Economics.',
    compute: (p) => blackScholesMerton(p),
  },
  {
    name: 'Binomial Tree',
    shortName: 'BT',
    icon: '◈',
    color: '#00ccff',
    description: 'Cox-Ross-Rubinstein (1979) discrete-time lattice model. Builds a recombining binomial tree of stock prices and works backward. Handles American early exercise.',
    bestFor: 'American options, dividend-paying stocks, path-dependent early exercise',
    assumptions: [
      'Stock price moves up (u) or down (d) each period',
      'Risk-neutral probability derived from u, d, r',
      'Recombining tree (u·d = 1)',
      'Can model American early exercise at each node',
      'Convergent to BSM as steps → ∞',
    ],
    mathFormula: 'u = e^(σ√Δt),  d = 1/u\np = (e^((r-q)Δt) - d) / (u-d)\nV_i = e^(-rΔt)[p·V_{i+1,u} + (1-p)·V_{i+1,d}]',
    params: ['All BSM params', 'N (steps, default 100)', 'Exercise type (American/European)'],
    reference: 'Cox, J., Ross, S., Rubinstein, M. (1979). Journal of Financial Economics.',
    compute: (p) => binomialTree(p, 100),
    isHeavy: false,
  },
  {
    name: 'Monte Carlo',
    shortName: 'MC',
    icon: '◉',
    color: '#ff9900',
    description: 'Stochastic simulation method. Generates thousands of random stock price paths under risk-neutral measure and averages discounted payoffs. Most flexible model.',
    bestFor: 'Path-dependent options (Asian, barrier, lookback), exotic payoffs, multi-asset',
    assumptions: [
      'Risk-neutral GBM path simulation',
      'Accuracy scales as O(1/√N) with path count',
      'Antithetic variates reduce variance',
      'Convergence guaranteed by law of large numbers',
      'Box-Muller transform for normal samples',
    ],
    mathFormula: 'dS = (r-q)S·dt + σS·dW\nS_{t+Δt} = S_t·exp[(r-q-σ²/2)Δt + σ√Δt·Z]\nC ≈ e^(-rT) · (1/N) · Σ max(S_T - K, 0)',
    params: ['All BSM params', 'N paths (10,000)', 'N steps (100)', 'Random seed'],
    reference: 'Boyle, P. (1977). Journal of Financial Economics.',
    compute: (p) => monteCarlo(p, 10_000, 100),
    isHeavy: true,
  },
  {
    name: 'Finite Difference',
    shortName: 'FDM',
    icon: '◫',
    color: '#cc44ff',
    description: 'Numerical PDE solver. Discretizes the Black-Scholes PDE on a space-time grid. Explicit scheme — each grid point evolves forward in time.',
    bestFor: 'American options with complex early exercise, barrier options, dividend schedules',
    assumptions: [
      'Discretizes PDE on S × t grid',
      'Stability requires dt ≤ dS²/(σ²S²)',
      'Explicit scheme: O(M·N) time complexity',
      'Crank-Nicolson (implicit) is unconditionally stable',
      'Boundary conditions at S=0 and S=S_max',
    ],
    mathFormula: '∂V/∂t + ½σ²S²·∂²V/∂S² + (r-q)S·∂V/∂S - rV = 0\nV_i^{n+1} = a_i·V_{i-1}^n + b_i·V_i^n + c_i·V_{i+1}^n\na_i=½Δt(σ²i²-(r-q)i), b_i=1-Δt(σ²i²+r)',
    params: ['All BSM params', 'M grid (80)', 'N time steps (150)', 'S_max (3×S)'],
    reference: 'Wilmott, P., Howison, S., Dewynne, J. (1995). The Mathematics of Financial Derivatives.',
    compute: (p) => finiteDifference(p, 80, 150),
    isHeavy: false,
  },
  {
    name: 'Heston SV',
    shortName: 'HSV',
    icon: '◆',
    color: '#ff4466',
    description: 'Stochastic volatility model (1993). Variance follows a mean-reverting CIR process correlated with the stock. Captures vol smile/skew naturally.',
    bestFor: 'Capturing IV smile/skew, FX options, index options with strong skew',
    assumptions: [
      'Variance V_t follows CIR: dV = κ(θ-V)dt + ξ√V·dW_V',
      'Correlation ρ between stock & vol Brownian motions',
      'Semi-analytical via characteristic function integration',
      'Feller condition: 2κθ > ξ² ensures V stays positive',
      'No early exercise (European only)',
    ],
    mathFormula: 'dS = (r-q)S·dt + √V·S·dW_S\ndV = κ(θ-V)dt + ξ√V·dW_V\n⟨dW_S,dW_V⟩ = ρ·dt\nC = Re[e^{-rT}∫₀^∞ e^{-iφlogK}·Φ(φ)/(iφ)dφ]',
    params: ['All BSM params', 'v₀ (init var)', 'κ (reversion)', 'θ (long-run var)', 'ξ (vol-of-vol)', 'ρ (correlation)'],
    reference: 'Heston, S. (1993). Review of Financial Studies. Albrecher et al. (2007). Applied Mathematical Finance.',
    compute: (p) => hestonModel(p),
    isHeavy: true,
  },
  {
    name: 'Local Volatility',
    shortName: 'LV',
    icon: '◐',
    color: '#44ffcc',
    description: "Dupire's (1994) framework. Derives a deterministic local volatility surface σ(S,t) from market option prices, perfectly replicating the observed smile.",
    bestFor: 'Smile-consistent pricing, barrier options, forward-starting options',
    assumptions: [
      'Local vol is a deterministic function σ(S,t)',
      'Perfectly calibrates to observed market prices',
      'Dupire PDE: σ²(K,T) = [∂C/∂T + qC + (r-q)K·∂C/∂K] / [½K²·∂²C/∂K²]',
      'Model-free: no parametric form assumed',
      'Used in practice via interpolation of market data',
    ],
    mathFormula: 'dS = (r-q)S·dt + σ(S,t)·S·dW\nσ_loc²(K,T) = σ_BSM²·[1 + α·ln(K/F) + β·T]\n(SABR-parametric approximation shown)',
    params: ['All BSM params', 'Skew α (-0.15)', 'Term β (0.05)'],
    reference: "Dupire, B. (1994). Risk Magazine. Derman, E., Kani, I. (1994). Financial Analysts Journal.",
    compute: (p) => localVolatility(p),
  },
  {
    name: 'Jump Diffusion',
    shortName: 'JD',
    icon: '◑',
    color: '#ffff00',
    description: "Merton's (1976) jump-diffusion model. Adds Poisson-distributed jumps to GBM. Explains the volatility smile and fat tails observed in equity markets.",
    bestFor: 'Equity options with crash risk, short-dated options with elevated skew',
    assumptions: [
      'Stock follows GBM + compound Poisson jumps',
      'Jump frequency λ (Poisson intensity)',
      'Log-normal jump sizes: ln(J) ~ N(μ_J, σ_J²)',
      'Infinite series solution (truncated at N=20)',
      'Reduces to BSM when λ=0',
    ],
    mathFormula: 'dS = (r-q-λκ)S·dt + σS·dW + (J-1)S·dN\nκ = E[J-1] = e^(μJ+½σJ²) - 1\nC = Σ_{n=0}^∞ [e^(-λ\'T)(λ\'T)^n/n!]·C_BSM(r_n,σ_n)\nr_n = r - λκ + n(μJ+½σJ²)/T',
    params: ['All BSM params', 'λ jump rate', 'μ_J mean jump', 'σ_J jump vol'],
    reference: 'Merton, R. (1976). Journal of Financial Economics.',
    compute: (p) => jumpDiffusion(p),
  },
  {
    name: 'Variance Gamma',
    shortName: 'VG',
    icon: '◒',
    color: '#ff6600',
    description: 'Madan, Carr & Chang (1998). Subordinates Brownian motion to a Gamma clock. Produces finite variation, skewness, and excess kurtosis without jumps.',
    bestFor: 'Index options, capturing both skew and kurtosis, long-dated options',
    assumptions: [
      'Time is stochastically changed by Gamma process',
      'Finite activity (countable jumps in any interval)',
      'Pure jump process (no diffusion component)',
      'Closed-form characteristic function',
      'Parameters: ν (kurtosis), θ (skew), σ (scale)',
    ],
    mathFormula: 'X(t;σ,ν,θ) = θ·G(t;1,ν) + σ·W(G(t;1,ν))\nΦ_X(u) = (1 - iuθν + ½σ²νu²)^(-T/ν)\nω = (1/ν)·ln(1 - θν - ½σ²ν)\nC = S·e^(-qT)·P₁ - K·e^(-rT)·P₂',
    params: ['All BSM params', 'ν variance rate', 'θ_VG drift param'],
    reference: 'Madan, D., Carr, P., Chang, E. (1998). European Finance Review.',
    compute: (p) => varianceGamma(p),
  },
];

// ─── Win98 Window Component ───────────────────────────────────────────────────

interface Win98WindowProps {
  title: string;
  titleColor?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  noBorder?: boolean;
  termMode?: boolean;
}

function Win98Window({
  title, titleColor, children, className = '', style,
  onMinimize, onMaximize, onClose, noBorder, termMode,
}: Win98WindowProps) {
  return (
    <div
      className={className}
      style={{
        background: termMode ? W98.termBg : W98.bg,
        borderTop:    noBorder ? undefined : `2px solid ${termMode ? '#00ff41' : '#ffffff'}`,
        borderLeft:   noBorder ? undefined : `2px solid ${termMode ? '#00ff41' : '#ffffff'}`,
        borderRight:  noBorder ? undefined : `2px solid ${termMode ? '#003300' : '#808080'}`,
        borderBottom: noBorder ? undefined : `2px solid ${termMode ? '#003300' : '#808080'}`,
        ...style,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          background: termMode
            ? 'linear-gradient(180deg, #001a00 0%, #003300 100%)'
            : (titleColor ?? W98.titleBar),
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          minHeight: '22px',
        }}
      >
        <span style={{
          color: termMode ? W98.green : W98.titleText,
          fontFamily: termMode ? 'Share Tech Mono, monospace' : '"MS Sans Serif", "Microsoft Sans Serif", Arial, sans-serif',
          fontSize: termMode ? '11px' : '12px',
          fontWeight: 'bold',
          letterSpacing: termMode ? '0.05em' : undefined,
          textShadow: termMode ? '0 0 6px #00ff41' : undefined,
        }}>
          {termMode && <span className="mr-1" style={{ color: W98.green }}>▸</span>}
          {title}
        </span>
        <div style={{ display: 'flex', gap: '2px' }}>
          {onMinimize && (
            <Win98Button onClick={onMinimize} small title="Minimize">_</Win98Button>
          )}
          {onMaximize && (
            <Win98Button onClick={onMaximize} small title="Restore/Maximize">□</Win98Button>
          )}
          {onClose && (
            <Win98Button onClick={onClose} small title="Close" danger>✕</Win98Button>
          )}
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: '4px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Win98 Button ─────────────────────────────────────────────────────────────

interface Win98ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  small?: boolean;
  title?: string;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  termMode?: boolean;
}

function Win98Button({ onClick, children, small, title, danger, active, disabled, style, termMode }: Win98ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isDown = pressed || active;

  if (termMode) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '11px',
          color: disabled ? '#003300' : '#00ff41',
          background: isDown ? '#001a00' : 'transparent',
          border: `1px solid ${disabled ? '#003300' : '#00ff41'}`,
          padding: small ? '1px 4px' : '4px 10px',
          cursor: disabled ? 'default' : 'pointer',
          letterSpacing: '0.05em',
          textShadow: disabled ? 'none' : '0 0 4px #00ff41',
          ...style,
        }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        fontFamily: '"MS Sans Serif", "Microsoft Sans Serif", Arial, sans-serif',
        fontSize: small ? '11px' : '12px',
        color: disabled ? '#808080' : danger ? '#cc0000' : '#000000',
        background: W98.btnBg,
        borderTop:    isDown ? '2px solid #808080' : '2px solid #ffffff',
        borderLeft:   isDown ? '2px solid #808080' : '2px solid #ffffff',
        borderRight:  isDown ? '2px solid #ffffff' : '2px solid #808080',
        borderBottom: isDown ? '2px solid #ffffff' : '2px solid #808080',
        padding: small ? '0px 3px' : '3px 12px',
        cursor: disabled ? 'default' : 'pointer',
        minWidth: small ? '18px' : '75px',
        minHeight: small ? '18px' : '23px',
        ...style,
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
    >
      {children}
    </button>
  );
}

// ─── Win98 Input / Slider ─────────────────────────────────────────────────────

function Win98Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontFamily: '"MS Sans Serif", Arial, sans-serif', fontSize: '11px', color: '#000' }}>
          {label}
        </label>
        <span style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: '11px',
          color: W98.green,
          background: '#000',
          padding: '0 4px',
          minWidth: '60px',
          textAlign: 'right',
          textShadow: '0 0 4px #00ff41',
        }}>
          {format ? format(value) : value.toFixed(4)}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#00ff41',
          cursor: 'pointer',
          height: '16px',
        }}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveTab = 'comparison' | ModelName;

export default function PricingModelsPage() {
  // Parameters state
  const [params, setParams] = useState<OptionParams>({
    S: 191.42, K: 195, T: 30 / 365, r: 0.0525,
    q: 0.005, sigma: 0.28, type: 'call', exercise: 'american',
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('comparison');
  const [results, setResults] = useState<ReturnType<typeof runAllModels> | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcProgress, setCalcProgress] = useState(0);
  const [showEducation, setShowEducation] = useState<ModelName | null>(null);
  const [windowMinimized, setWindowMinimized] = useState<Record<string, boolean>>({});
  const [dataStreamActive, setDataStreamActive] = useState(true);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [taskbarTime, setTaskbarTime] = useState('');

  const calcRef = useRef(false);

  // Live clock for taskbar
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTaskbarTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const calculate = useCallback(() => {
    if (calcRef.current) return;
    calcRef.current = true;
    setIsCalculating(true);
    setCalcProgress(0);

    // Simulate progressive calculation with timeouts
    const steps = MODEL_META.length;
    const partialResults: ReturnType<typeof runAllModels> = [];

    let step = 0;
    const runStep = () => {
      if (step >= steps) {
        setResults([...partialResults]);
        setIsCalculating(false);
        calcRef.current = false;
        setCalcProgress(100);
        return;
      }
      const meta = MODEL_META[step];
      try {
        const res = meta.compute(params);
        partialResults.push({
          name: meta.name,
          result: res,
          color: meta.color,
          icon: meta.icon,
        });
      } catch {
        partialResults.push({
          name: meta.name,
          result: { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 },
          color: meta.color,
          icon: meta.icon,
        });
      }
      step++;
      setCalcProgress(Math.round((step / steps) * 100));
      // Heavy models get a tiny delay to not block UI
      const delay = meta.isHeavy ? 50 : 10;
      setTimeout(runStep, delay);
    };
    setTimeout(runStep, 50);
  }, [params]);

  // Auto-calculate on mount
  useEffect(() => {
    calculate();
  }, []); // eslint-disable-line

  const updateParam = (key: keyof OptionParams, val: number | string) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  const toggleMinimized = (id: string) => {
    setWindowMinimized((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const bsmRef = results?.find((r) => r.name === 'Black-Scholes-Merton');
  const activeModel = MODEL_META.find((m) => m.name === activeTab);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#000814',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Share Tech Mono, monospace',
      }}
    >
      {/* ── CRT Scanlines overlay ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9000,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
      }} />

      {/* ── Classified watermark ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: 'rotate(-30deg)',
        opacity: 0.03,
        fontSize: '120px', fontWeight: 'bold', color: '#ff0000',
        fontFamily: 'Arial Black, sans-serif',
        letterSpacing: '10px',
        userSelect: 'none',
      }}>
        CLASSIFIED
      </div>

      {/* ── WIN98 DESKTOP AREA ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* TOP ROW: Header Banner + CIA Stamp */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          {/* Main title window */}
          <Win98Window
            title="APHELION :: OPTIONS PRICING LABORATORY // TOP SECRET"
            termMode
            style={{ flex: 1 }}
            onMinimize={() => toggleMinimized('header')}
          >
            {!windowMinimized['header'] && (
              <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ color: '#00ff41', fontSize: '18px', fontFamily: 'VT323, monospace', letterSpacing: '2px', textShadow: '0 0 10px #00ff41' }}>
                    ◈ OPTIONS PRICING ENGINE v2.0
                  </div>
                  <div style={{ color: '#005522', fontSize: '10px', marginTop: '2px' }}>
                    8 MODELS // REAL-TIME COMPUTATION // GREEK ANALYSIS // CONVERGENCE TESTING
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    background: '#0a0a0a', border: '1px solid #003300',
                    padding: '4px 8px', fontSize: '10px', color: '#00ff41',
                  }}>
                    <div>UNDERLYING: <span style={{ color: '#fff' }}>${params.S.toFixed(2)}</span></div>
                    <div>STRIKE: <span style={{ color: '#fff' }}>${params.K.toFixed(2)}</span></div>
                    <div>DTE: <span style={{ color: '#fff' }}>{Math.round(params.T * 365)}d</span></div>
                    <div>IV: <span style={{ color: '#fff' }}>{(params.sigma * 100).toFixed(1)}%</span></div>
                  </div>
                  {bsmRef && (
                    <div style={{
                      background: '#0a0a0a', border: '1px solid #003300',
                      padding: '4px 8px', fontSize: '10px', color: '#00ff41',
                    }}>
                      <div>BSM: <span style={{ color: '#ffff00', fontSize: '14px', fontFamily: 'VT323, monospace' }}>${bsmRef.result.price.toFixed(3)}</span></div>
                      <div>Δ={bsmRef.result.delta.toFixed(3)} Γ={bsmRef.result.gamma.toFixed(4)}</div>
                      <div>θ=${bsmRef.result.theta.toFixed(4)}/d  ν=${bsmRef.result.vega.toFixed(4)}</div>
                    </div>
                  )}
                  <Win98Button termMode onClick={calculate} disabled={isCalculating}>
                    {isCalculating ? `▶ ${calcProgress}%...` : '▶ RECALCULATE'}
                  </Win98Button>
                </div>
              </div>
            )}
          </Win98Window>

          {/* TOP SECRET stamp */}
          <div style={{
            border: '3px solid #cc0000', padding: '6px 10px',
            background: '#0a0a0a', flexShrink: 0,
            fontFamily: 'Arial Black, sans-serif',
            transform: 'rotate(-3deg)',
          }}>
            <div style={{ color: '#cc0000', fontSize: '14px', fontWeight: 'bold', letterSpacing: '3px', textAlign: 'center' }}>TOP SECRET</div>
            <div style={{ color: '#660000', fontSize: '9px', textAlign: 'center', fontFamily: 'monospace' }}>SCI // CODEWORD</div>
            <div style={{ color: '#ff0000', fontSize: '9px', textAlign: 'center', fontFamily: 'monospace' }}>APHELION</div>
          </div>
        </div>

        {/* PARAMETER CONTROLS WINDOW */}
        <Win98Window
          title="📊 Parameter Input Panel — Drag to adjust"
          style={{ background: W98.bg }}
          onMinimize={() => toggleMinimized('params')}
        >
          {!windowMinimized['params'] && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', padding: '8px' }}>
              <Win98Slider label="Underlying Price ($)" value={params.S} min={50} max={500} step={0.5}
                onChange={(v) => updateParam('S', v)} format={(v) => `$${v.toFixed(2)}`} />
              <Win98Slider label="Strike Price ($)" value={params.K} min={50} max={500} step={0.5}
                onChange={(v) => updateParam('K', v)} format={(v) => `$${v.toFixed(2)}`} />
              <Win98Slider label="Days to Expiry" value={params.T * 365} min={1} max={730} step={1}
                onChange={(v) => updateParam('T', v / 365)} format={(v) => `${Math.round(v)}d`} />
              <Win98Slider label="Implied Volatility" value={params.sigma} min={0.01} max={2.0} step={0.01}
                onChange={(v) => updateParam('sigma', v)} format={(v) => `${(v * 100).toFixed(1)}%`} />
              <Win98Slider label="Risk-Free Rate" value={params.r} min={0} max={0.15} step={0.001}
                onChange={(v) => updateParam('r', v)} format={(v) => `${(v * 100).toFixed(2)}%`} />
              <Win98Slider label="Dividend Yield" value={params.q} min={0} max={0.10} step={0.001}
                onChange={(v) => updateParam('q', v)} format={(v) => `${(v * 100).toFixed(2)}%`} />

              {/* Type + Exercise selects */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontFamily: '"MS Sans Serif", Arial, sans-serif', fontSize: '11px' }}>Option Type</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['call', 'put'] as const).map((t) => (
                    <Win98Button key={t} active={params.type === t} onClick={() => updateParam('type', t)}
                      style={{ minWidth: '50px', fontSize: '11px' }}>
                      {t.toUpperCase()}
                    </Win98Button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontFamily: '"MS Sans Serif", Arial, sans-serif', fontSize: '11px' }}>Exercise</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['american', 'european'] as const).map((t) => (
                    <Win98Button key={t} active={params.exercise === t} onClick={() => updateParam('exercise', t)}
                      style={{ minWidth: '70px', fontSize: '10px' }}>
                      {t === 'american' ? 'AMER' : 'EUR'}
                    </Win98Button>
                  ))}
                </div>
              </div>

              {/* Recalculate */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Win98Button onClick={calculate} disabled={isCalculating}
                  style={{ width: '100%', background: isCalculating ? '#c0c0c0' : '#000080', color: isCalculating ? '#808080' : '#fff',
                           borderTop: '2px solid #8080ff', borderLeft: '2px solid #8080ff', fontSize: '12px', fontWeight: 'bold' }}>
                  {isCalculating ? `Computing ${calcProgress}%` : '⟳  CALCULATE ALL'}
                </Win98Button>
              </div>
            </div>
          )}
          {/* Progress bar */}
          {isCalculating && (
            <div style={{
              margin: '0 8px 8px', height: '12px',
              background: '#808080',
              border: '1px solid #404040',
              borderTop: '1px solid #ffffff',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${calcProgress}%`,
                background: 'linear-gradient(90deg, #000080, #0000ff)',
                transition: 'width 0.1s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: '9px', fontFamily: 'monospace' }}>
                  {calcProgress > 10 ? `${calcProgress}%` : ''}
                </span>
              </div>
            </div>
          )}
        </Win98Window>

        {/* TAB BAR */}
        <div style={{
          display: 'flex', gap: '2px', flexWrap: 'wrap',
          borderBottom: `2px solid ${W98.green}`,
          paddingBottom: '2px',
        }}>
          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              fontFamily: 'Share Tech Mono, monospace', fontSize: '11px',
              padding: '4px 10px', cursor: 'pointer',
              background: activeTab === 'comparison' ? W98.green : '#001100',
              color: activeTab === 'comparison' ? '#000' : W98.green,
              border: `1px solid ${W98.green}`,
              borderBottom: activeTab === 'comparison' ? 'none' : `1px solid ${W98.green}`,
              fontWeight: activeTab === 'comparison' ? 'bold' : 'normal',
            }}
          >
            ▣ ALL MODELS
          </button>
          {MODEL_META.map((m) => (
            <button
              key={m.name}
              onClick={() => setActiveTab(m.name)}
              style={{
                fontFamily: 'Share Tech Mono, monospace', fontSize: '10px',
                padding: '4px 8px', cursor: 'pointer',
                background: activeTab === m.name ? m.color : '#001100',
                color: activeTab === m.name ? '#000' : m.color,
                border: `1px solid ${m.color}`,
                borderBottom: activeTab === m.name ? 'none' : `1px solid ${m.color}`,
                fontWeight: activeTab === m.name ? 'bold' : 'normal',
                opacity: !results ? 0.5 : 1,
              }}
            >
              {m.icon} {m.shortName}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'comparison' && results && (
            <ComparisonTab results={results} bsmPrice={bsmRef?.result.price ?? 0} />
          )}
          {activeTab !== 'comparison' && activeModel && results && (
            <ModelDetailTab
              meta={activeModel}
              result={results.find((r) => r.name === activeModel.name)!}
              params={params}
              showEducation={showEducation}
              onToggleEducation={(n) => setShowEducation((prev) => prev === n ? null : n)}
            />
          )}
          {!results && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: W98.green, fontFamily: 'Share Tech Mono, monospace' }}>
              <span style={{ fontSize: '14px' }}>▶ PRESS CALCULATE TO RUN MODELS</span>
              <span style={{ animation: 'blink 1s step-end infinite', marginLeft: '4px' }}>█</span>
            </div>
          )}
        </div>
      </div>

      {/* ── WIN98 TASKBAR ── */}
      <div style={{
        height: '30px', background: W98.bg, flexShrink: 0,
        borderTop: `2px solid #ffffff`,
        display: 'flex', alignItems: 'center', padding: '0 4px', gap: '4px',
        position: 'relative', zIndex: 100,
      }}>
        {/* Start button */}
        <Win98Button
          onClick={() => setStartMenuOpen((s) => !s)}
          active={startMenuOpen}
          style={{ minWidth: '60px', fontSize: '12px', fontWeight: 'bold', fontFamily: '"MS Sans Serif", Arial' }}
        >
          <span style={{ fontSize: '14px' }}>⊞</span> Start
        </Win98Button>

        {/* Separator */}
        <div style={{ width: '2px', height: '20px', borderLeft: '1px solid #808080', borderRight: '1px solid #fff', margin: '0 2px' }} />

        {/* Taskbar items */}
        {MODEL_META.map((m) => (
          <Win98Button
            key={m.name}
            active={activeTab === m.name}
            onClick={() => setActiveTab(m.name)}
            style={{ minWidth: '40px', fontSize: '10px', padding: '2px 6px' }}
          >
            {m.icon} {m.shortName}
          </Win98Button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* System tray */}
        <div style={{
          background: W98.bg, height: '22px',
          borderTop: '1px solid #808080', borderLeft: '1px solid #808080',
          borderRight: '1px solid #fff', borderBottom: '1px solid #fff',
          display: 'flex', alignItems: 'center', padding: '0 8px', gap: '6px',
          fontFamily: '"MS Sans Serif", Arial', fontSize: '11px',
        }}>
          <span
            title="Toggle data stream"
            style={{ cursor: 'pointer', fontSize: '12px' }}
            onClick={() => setDataStreamActive((a) => !a)}
          >
            {dataStreamActive ? '📡' : '📴'}
          </span>
          <span style={{ color: '#000', fontSize: '11px', fontFamily: '"MS Sans Serif", Arial' }}>
            {taskbarTime}
          </span>
        </div>
      </div>

      {/* Start menu popup */}
      {startMenuOpen && (
        <StartMenu onClose={() => setStartMenuOpen(false)} onNavigate={(t) => { setActiveTab(t); setStartMenuOpen(false); }} />
      )}

      {/* Data stream overlay */}
      {dataStreamActive && <DataStream />}
    </div>
  );
}

// ─── Comparison Tab ────────────────────────────────────────────────────────────

function ComparisonTab({
  results,
  bsmPrice,
}: {
  results: ReturnType<typeof runAllModels>;
  bsmPrice: number;
}) {
  const minPrice = Math.min(...results.map((r) => r.result.price));
  const maxPrice = Math.max(...results.map((r) => r.result.price));
  const priceRange = maxPrice - minPrice || 0.01;

  // RMSE vs BSM
  const rmse = Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.result.price - bsmPrice, 2), 0) / results.length);

  // Recommended model (simplistic heuristic)
  const rec = results.reduce((best, curr) =>
    Math.abs(curr.result.price - bsmPrice) < Math.abs(best.result.price - bsmPrice) ? curr : best
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {[
          { label: 'BSM Price', value: `$${bsmPrice.toFixed(3)}`, color: '#00ff41' },
          { label: 'Model Spread', value: `$${(maxPrice - minPrice).toFixed(3)}`, color: '#ff9900' },
          { label: 'Avg RMSE vs BSM', value: `$${rmse.toFixed(4)}`, color: '#cc44ff' },
          { label: 'Recommended', value: rec.name.substring(0, 12), color: rec.color },
        ].map((s) => (
          <Win98Window key={s.label} termMode title={s.label} noBorder style={{ background: '#060606' }}>
            <div style={{ padding: '6px', textAlign: 'center' }}>
              <div style={{ color: s.color, fontSize: '18px', fontFamily: 'VT323, monospace', textShadow: `0 0 8px ${s.color}` }}>
                {s.value}
              </div>
            </div>
          </Win98Window>
        ))}
      </div>

      {/* Main comparison table */}
      <Win98Window title="◈ ALL-MODEL PRICE COMPARISON // CLASSIFIED" termMode>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Share Tech Mono, monospace', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid #003300` }}>
                {['MODEL', 'PRICE', 'DELTA', 'GAMMA', 'THETA/DAY', 'VEGA', 'CONFIDENCE', 'TIME(ms)', 'vs BSM', 'SPREAD BAR'].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', color: '#005522', textAlign: h === 'MODEL' ? 'left' : 'right', whiteSpace: 'nowrap', fontSize: '10px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(({ name, result, color, icon }) => {
                const vsBSM   = result.price - bsmPrice;
                const barPct  = ((result.price - minPrice) / priceRange) * 100;
                return (
                  <tr key={name} style={{ borderBottom: '1px solid #001100' }}>
                    <td style={{ padding: '5px 8px', color, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      <span style={{ marginRight: '4px' }}>{icon}</span>{name}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#fff', fontWeight: 'bold' }}>
                      ${result.price.toFixed(4)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: result.delta >= 0 ? '#00e5a0' : '#ff4d6d' }}>
                      {result.delta >= 0 ? '+' : ''}{result.delta.toFixed(4)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#aaa' }}>
                      {result.gamma.toFixed(5)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#ff4d6d' }}>
                      ${result.theta.toFixed(5)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#00ccff' }}>
                      {result.vega.toFixed(4)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#888', fontSize: '10px' }}>
                      {result.confidence
                        ? `[${result.confidence.low.toFixed(3)}, ${result.confidence.high.toFixed(3)}]`
                        : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#555' }}>
                      {result.computeTimeMs < 1 ? '<1' : result.computeTimeMs.toFixed(1)}
                    </td>
                    <td style={{
                      padding: '5px 8px', textAlign: 'right',
                      color: Math.abs(vsBSM) < 0.01 ? '#00ff41' : vsBSM > 0 ? '#ff9900' : '#ff4466',
                    }}>
                      {vsBSM >= 0 ? '+' : ''}{vsBSM.toFixed(4)}
                    </td>
                    <td style={{ padding: '5px 12px', width: '120px' }}>
                      <div style={{ background: '#0a0a0a', height: '10px', position: 'relative', border: '1px solid #002200' }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${barPct}%`, background: color, opacity: 0.7,
                          transition: 'width 0.5s',
                        }} />
                        <div style={{
                          position: 'absolute', left: `${barPct}%`, top: '-2px', bottom: '-2px',
                          width: '2px', background: color,
                        }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Win98Window>

      {/* Greeks heatmap */}
      <Win98Window title="◆ GREEKS COMPARISON MATRIX" termMode>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '4px', padding: '4px' }}>
          {results.map(({ name, result, color, icon }) => (
            <div key={name} style={{
              background: '#060606', border: `1px solid ${color}22`,
              padding: '8px', borderLeft: `3px solid ${color}`,
            }}>
              <div style={{ color, fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                {icon} {name}
              </div>
              {[
                { k: 'Δ Delta', v: result.delta, fmt: (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(4)}`, c: result.delta >= 0 ? '#00e5a0' : '#ff4d6d' },
                { k: 'Γ Gamma', v: result.gamma, fmt: (x: number) => x.toFixed(5), c: '#aaa' },
                { k: 'θ Theta', v: result.theta, fmt: (x: number) => `$${x.toFixed(5)}`, c: '#ff4d6d' },
                { k: 'ν Vega',  v: result.vega,  fmt: (x: number) => x.toFixed(4), c: '#00ccff' },
              ].map(({ k, v, fmt, c }) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
                  <span style={{ color: '#005522' }}>{k}</span>
                  <span style={{ color: c }}>{fmt(v)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Win98Window>

      {/* Recommendation */}
      <Win98Window
        title="⬡ APHELION INTELLIGENCE ASSESSMENT // RECOMMENDED MODEL"
        style={{ background: W98.bg }}
      >
        <div style={{ padding: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{
            background: '#000080', color: '#fff', padding: '8px 12px',
            fontFamily: '"MS Sans Serif", Arial, sans-serif', fontSize: '12px', flexShrink: 0,
            border: '2px solid #ffffff',
          }}>
            RECOMMENDED:<br />
            <strong>{rec.name}</strong>
          </div>
          <div style={{ fontFamily: '"MS Sans Serif", Arial', fontSize: '11px' }}>
            <strong>Why {rec.name}?</strong>
            <div style={{ marginTop: '4px', color: '#000080' }}>
              {MODEL_META.find((m) => m.name === rec.name)?.description}
            </div>
            <div style={{ marginTop: '4px' }}>
              Best for: <em>{MODEL_META.find((m) => m.name === rec.name)?.bestFor}</em>
            </div>
          </div>
        </div>
      </Win98Window>
    </div>
  );
}

// ─── Model Detail Tab ──────────────────────────────────────────────────────────

function ModelDetailTab({
  meta, result, params, showEducation, onToggleEducation,
}: {
  meta: ModelMeta;
  result: ReturnType<typeof runAllModels>[number];
  params: OptionParams;
  showEducation: ModelName | null;
  onToggleEducation: (n: ModelName) => void;
}) {
  const { name, color, icon, description, bestFor, assumptions, mathFormula, reference, params: modelParams } = meta;
  const { result: res } = result;
  const eduOpen = showEducation === name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Model header */}
      <Win98Window
        title={`${icon} ${name.toUpperCase()} — DETAIL VIEW`}
        termMode
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div style={{ padding: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ color, fontSize: '20px', fontFamily: 'VT323, monospace', marginBottom: '4px' }}>
              {icon} {name}
            </div>
            <p style={{ color: '#888', fontSize: '11px', lineHeight: 1.6, margin: 0 }}>{description}</p>
            <p style={{ color: '#555', fontSize: '10px', marginTop: '6px' }}>
              Best for: <span style={{ color: '#aaa' }}>{bestFor}</span>
            </p>
          </div>
          {/* Price result */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#555', fontSize: '10px' }}>CALCULATED PRICE</div>
            <div style={{ color: color, fontSize: '42px', fontFamily: 'VT323, monospace', lineHeight: 1, textShadow: `0 0 12px ${color}` }}>
              ${res.price.toFixed(4)}
            </div>
            {res.confidence && (
              <div style={{ color: '#555', fontSize: '10px' }}>
                95% CI: [{res.confidence.low.toFixed(3)}, {res.confidence.high.toFixed(3)}]
              </div>
            )}
            <div style={{ color: '#444', fontSize: '10px', marginTop: '4px' }}>
              Computed in {res.computeTimeMs < 1 ? '<1' : res.computeTimeMs.toFixed(1)}ms
            </div>
          </div>
        </div>
      </Win98Window>

      {/* Greeks grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
        {[
          { label: 'Δ DELTA', value: `${res.delta >= 0 ? '+' : ''}${res.delta.toFixed(5)}`, color: res.delta >= 0 ? '#00e5a0' : '#ff4d6d', desc: 'Rate of change of option price vs. underlying' },
          { label: 'Γ GAMMA', value: res.gamma.toFixed(6), color: '#aaa', desc: 'Rate of change of delta vs. underlying' },
          { label: 'θ THETA', value: `$${res.theta.toFixed(5)}/d`, color: '#ff4d6d', desc: 'Time decay per calendar day' },
          { label: 'ν VEGA',  value: res.vega.toFixed(5), color: '#00ccff', desc: 'Sensitivity to 1% IV change' },
          { label: 'ρ RHO',   value: res.rho.toFixed(5), color: '#ffff00', desc: 'Sensitivity to 1% rate change' },
        ].map((g) => (
          <Win98Window key={g.label} termMode title={g.label} noBorder style={{ background: '#060606', border: '1px solid #002200' }}>
            <div style={{ padding: '8px', textAlign: 'center' }}>
              <div style={{ color: g.color, fontSize: '16px', fontFamily: 'VT323, monospace', textShadow: `0 0 6px ${g.color}` }}>
                {g.value}
              </div>
              <div style={{ color: '#334433', fontSize: '9px', marginTop: '3px', lineHeight: 1.3 }}>{g.desc}</div>
            </div>
          </Win98Window>
        ))}
      </div>

      {/* Model-specific params */}
      {res.modelSpecific && Object.keys(res.modelSpecific).length > 0 && (
        <Win98Window title="⚙ MODEL-SPECIFIC PARAMETERS" termMode>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '8px' }}>
            {Object.entries(res.modelSpecific).map(([k, v]) => (
              <div key={k} style={{ background: '#0a0a0a', border: '1px solid #002200', padding: '6px 10px', minWidth: '100px' }}>
                <div style={{ color: '#005522', fontSize: '9px', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ color: color, fontSize: '14px', fontFamily: 'VT323, monospace' }}>{typeof v === 'number' ? v.toFixed(4) : v}</div>
              </div>
            ))}
          </div>
        </Win98Window>
      )}

      {/* Input params */}
      <Win98Window title="📋 INPUT PARAMETERS" termMode>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px' }}>
          {[
            { k: 'S (Spot)',   v: `$${params.S}` },
            { k: 'K (Strike)', v: `$${params.K}` },
            { k: 'T (Years)',  v: `${params.T.toFixed(4)} (${Math.round(params.T * 365)}d)` },
            { k: 'r (Rate)',   v: `${(params.r * 100).toFixed(2)}%` },
            { k: 'q (Div)',    v: `${(params.q * 100).toFixed(2)}%` },
            { k: 'σ (IV)',     v: `${(params.sigma * 100).toFixed(1)}%` },
            { k: 'Type',       v: params.type.toUpperCase() },
            { k: 'Exercise',   v: (params.exercise ?? 'european').toUpperCase() },
          ].map(({ k, v }) => (
            <div key={k} style={{ background: '#0a0a0a', border: '1px solid #002200', padding: '4px 8px', fontFamily: 'Share Tech Mono', fontSize: '11px' }}>
              <span style={{ color: '#005522' }}>{k}:</span>{' '}
              <span style={{ color: '#fff' }}>{v}</span>
            </div>
          ))}
          <div style={{ border: '1px solid #003300', padding: '4px 8px', fontSize: '10px', color: '#555' }}>
            Model params: {modelParams.join(' · ')}
          </div>
        </div>
      </Win98Window>

      {/* Educational section */}
      <Win98Window
        title={`📚 HOW ${name.toUpperCase()} WORKS — Educational Reference`}
        style={{ background: W98.bg }}
        onMinimize={() => onToggleEducation(name)}
      >
        {!eduOpen ? (
          <div style={{
            padding: '6px 8px', fontFamily: '"MS Sans Serif", Arial', fontSize: '11px',
            color: '#000080', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          }}
          onClick={() => onToggleEducation(name)}
          >
            ▷ Click to expand educational content...
          </div>
        ) : (
          <div style={{ padding: '8px', fontFamily: '"MS Sans Serif", Arial, sans-serif', fontSize: '11px' }}>
            {/* Mathematical formula */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#000080', marginBottom: '4px' }}>Mathematical Formulation:</div>
              <div style={{
                background: '#001100', border: '2px solid',
                borderTop: '2px solid #808080', borderLeft: '2px solid #808080',
                borderRight: '2px solid #fff', borderBottom: '2px solid #fff',
                padding: '8px 12px',
                fontFamily: 'Share Tech Mono, Courier New, monospace',
                fontSize: '12px', color: W98.green, whiteSpace: 'pre-wrap',
                textShadow: '0 0 4px #00ff41',
              }}>
                {mathFormula}
              </div>
            </div>

            {/* Assumptions */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#000080', marginBottom: '4px' }}>Model Assumptions:</div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#000' }}>
                {assumptions.map((a) => (
                  <li key={a} style={{ marginBottom: '2px' }}>{a}</li>
                ))}
              </ul>
            </div>

            {/* Reference */}
            <div style={{
              background: '#e8e8e8',
              borderTop: '2px solid #808080', borderLeft: '2px solid #808080',
              borderRight: '2px solid #fff', borderBottom: '2px solid #fff',
              padding: '4px 8px', fontSize: '10px', color: '#444',
              fontStyle: 'italic',
            }}>
              📎 Reference: {reference}
            </div>
          </div>
        )}
      </Win98Window>
    </div>
  );
}

// ─── Start Menu ───────────────────────────────────────────────────────────────

function StartMenu({ onClose, onNavigate }: { onClose: () => void; onNavigate: (t: ActiveTab) => void }) {
  useEffect(() => {
    const handler = () => onClose();
    setTimeout(() => window.addEventListener('click', handler), 10);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', bottom: '30px', left: 0, zIndex: 200,
        background: W98.bg, width: '220px',
        borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff',
        borderRight: '2px solid #808080', borderBottom: '2px solid #808080',
        boxShadow: '3px 3px 0 #000',
      }}
    >
      {/* Sidebar */}
      <div style={{ display: 'flex' }}>
        <div style={{
          width: '28px', background: 'linear-gradient(0deg, #000080, #1084d0)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '8px',
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          color: '#fff', fontSize: '14px', fontFamily: '"MS Sans Serif", Arial, sans-serif',
          fontWeight: 'bold', letterSpacing: '2px',
        }}>
          APHELION
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #808080', padding: '4px 8px', fontFamily: '"MS Sans Serif", Arial', fontSize: '12px', background: '#fff', color: '#000080', fontWeight: 'bold' }}>
            Options Pricing Models
          </div>
          <button onClick={() => onNavigate('comparison')} style={{ ...menuItemStyle }}>
            ▣ All Models Comparison
          </button>
          {MODEL_META.map((m) => (
            <button key={m.name} onClick={() => onNavigate(m.name)} style={{ ...menuItemStyle }}>
              <span style={{ color: m.color }}>{m.icon}</span> {m.name}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #808080', marginTop: '4px' }} />
          <button onClick={onClose} style={{ ...menuItemStyle }}>
            🚪 Close
          </button>
        </div>
      </div>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '4px 8px', fontFamily: '"MS Sans Serif", Arial', fontSize: '11px',
  background: 'transparent', border: 'none', cursor: 'pointer', color: '#000',
};

// ─── Data Stream ──────────────────────────────────────────────────────────────

function DataStream() {
  const [chars, setChars] = useState<string[]>([]);
  const glyphs = '01アイウエオ∑∫∂∇ΔΩαβγδεζηθλμνξπρστυφχψω░▒▓█▄▀';

  useEffect(() => {
    const gen = () => Array.from({ length: 60 }, () => glyphs[Math.floor(Math.random() * glyphs.length)]);
    setChars(gen());
    const id = setInterval(() => setChars(gen()), 150);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: '30px', width: '24px',
      overflow: 'hidden', pointerEvents: 'none', zIndex: 9001,
      display: 'flex', flexDirection: 'column', gap: '0',
      background: 'linear-gradient(180deg, transparent 0%, #000814 100%)',
    }}>
      {chars.map((c, i) => (
        <span key={i} style={{
          color: `rgba(0, ${80 + Math.floor((i / chars.length) * 175)}, ${20 + i * 2}, ${0.2 + (i / chars.length) * 0.8})`,
          fontSize: '10px', fontFamily: 'Share Tech Mono, monospace',
          lineHeight: 1.2, textAlign: 'center',
        }}>{c}</span>
      ))}
    </div>
  );
}
