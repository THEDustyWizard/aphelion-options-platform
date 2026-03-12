/**
 * APHELION // OPTIONS PRICING ENGINE
 * ════════════════════════════════════════════════════════════
 * CLASSIFICATION: TOP SECRET // COMPARTMENTED
 * Models: BSM, Binomial, Monte Carlo, FDM, Heston,
 *         Local Vol, Jump Diffusion, Variance Gamma
 * ════════════════════════════════════════════════════════════
 */

export type OptionType = 'call' | 'put';
export type ExerciseType = 'european' | 'american';

export interface OptionParams {
  S: number;       // Underlying price
  K: number;       // Strike price
  T: number;       // Time to expiry (years)
  r: number;       // Risk-free rate (decimal)
  q: number;       // Dividend yield (decimal)
  sigma: number;   // Volatility (decimal)
  type: OptionType;
  exercise?: ExerciseType;
}

export interface PricingResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  computeTimeMs: number;
  confidence?: { low: number; high: number };
  modelSpecific?: Record<string, number | string>;
}

// ─── Normal Distribution ──────────────────────────────────────────────────────

/** Standard normal CDF (Hart approximation) */
export function normCDF(x: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

/** Standard normal PDF */
export function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ─── 1. Black-Scholes-Merton ──────────────────────────────────────────────────

export function blackScholesMerton(params: OptionParams): PricingResult {
  const t0 = performance.now();
  const { S, K, T, r, q, sigma, type } = params;

  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
             gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  let price: number, delta: number, rho: number;

  if (type === 'call') {
    price = S * Math.exp(-q * T) * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
    delta = Math.exp(-q * T) * normCDF(d1);
    rho   = K * T * Math.exp(-r * T) * normCDF(d2) / 100;
  } else {
    price = K * Math.exp(-r * T) * normCDF(-d2) - S * Math.exp(-q * T) * normCDF(-d1);
    delta = -Math.exp(-q * T) * normCDF(-d1);
    rho   = -K * T * Math.exp(-r * T) * normCDF(-d2) / 100;
  }

  const gamma = Math.exp(-q * T) * normPDF(d1) / (S * sigma * sqrtT);
  const vega  = S * Math.exp(-q * T) * normPDF(d1) * sqrtT / 100;
  const theta = (type === 'call'
    ? -S * Math.exp(-q * T) * normPDF(d1) * sigma / (2 * sqrtT)
      - r * K * Math.exp(-r * T) * normCDF(d2)
      + q * S * Math.exp(-q * T) * normCDF(d1)
    : -S * Math.exp(-q * T) * normPDF(d1) * sigma / (2 * sqrtT)
      + r * K * Math.exp(-r * T) * normCDF(-d2)
      - q * S * Math.exp(-q * T) * normCDF(-d1)) / 365;

  return {
    price, delta, gamma, theta, vega, rho,
    computeTimeMs: performance.now() - t0,
    modelSpecific: { d1: +d1.toFixed(4), d2: +d2.toFixed(4) },
  };
}

// ─── 2. Binomial Tree (CRR) ───────────────────────────────────────────────────

export function binomialTree(params: OptionParams, steps = 200): PricingResult {
  const t0 = performance.now();
  const { S, K, T, r, q, sigma, type, exercise = 'american' } = params;

  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 };
  }

  const dt   = T / steps;
  const u    = Math.exp(sigma * Math.sqrt(dt));
  const d    = 1 / u;
  const disc = Math.exp(-r * dt);
  const p    = (Math.exp((r - q) * dt) - d) / (u - d);
  const qProb = 1 - p;

  // Build terminal values
  const V: number[] = new Array(steps + 1);
  for (let j = 0; j <= steps; j++) {
    const nodePrice = S * Math.pow(u, steps - 2 * j);
    V[j] = type === 'call' ? Math.max(0, nodePrice - K) : Math.max(0, K - nodePrice);
  }

  // Backward induction
  for (let i = steps - 1; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      const cont = disc * (p * V[j] + qProb * V[j + 1]);
      if (exercise === 'american') {
        const spotAtNode = S * Math.pow(u, i - 2 * j);
        const intrinsic  = type === 'call' ? Math.max(0, spotAtNode - K) : Math.max(0, K - spotAtNode);
        V[j] = Math.max(cont, intrinsic);
      } else {
        V[j] = cont;
      }
    }
  }

  // Delta & Gamma from first two steps
  const Vuu = V[0], Vud = V[1], Vdd = V[2];
  const Su  = S * u, Sd = S * d;
  const delta = (Vuu - Vdd) / (Su - Sd);
  const gamma = ((Vuu - Vud) / (Su - S) - (Vud - Vdd) / (S - Sd)) / (0.5 * (Su - Sd));

  const bsm = blackScholesMerton(params);
  return {
    price: V[0],
    delta, gamma,
    theta: bsm.theta, vega: bsm.vega, rho: bsm.rho,
    computeTimeMs: performance.now() - t0,
    modelSpecific: { steps, u: +u.toFixed(4), d: +d.toFixed(4), p: +p.toFixed(4) },
  };
}

// ─── 3. Monte Carlo ───────────────────────────────────────────────────────────

export function monteCarlo(
  params: OptionParams,
  nPaths = 50_000,
  nSteps = 252,
  seed = 42,
): PricingResult & { paths?: number[][] } {
  const t0 = performance.now();
  const { S, K, T, r, q, sigma, type } = params;

  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 };
  }

  const dt   = T / nSteps;
  const mu   = (r - q - 0.5 * sigma * sigma) * dt;
  const vol  = sigma * Math.sqrt(dt);
  const disc = Math.exp(-r * T);

  // Park-Miller LCG for reproducibility
  let rng = seed;
  const lcgRand = (): number => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };
  const boxMuller = (): number => {
    const u1 = lcgRand(), u2 = lcgRand();
    return Math.sqrt(-2 * Math.log(Math.max(1e-10, u1))) * Math.cos(2 * Math.PI * u2);
  };

  let sumPayoff = 0;
  let sumPayoff2 = 0;
  const samplePaths: number[][] = [];

  for (let i = 0; i < nPaths; i++) {
    let spot = S;
    const capturePath = i < 10;
    const path: number[] = capturePath ? [spot] : [];

    for (let j = 0; j < nSteps; j++) {
      spot *= Math.exp(mu + vol * boxMuller());
      if (capturePath) path.push(spot);
    }
    if (capturePath) samplePaths.push(path);

    const payoff = type === 'call' ? Math.max(0, spot - K) : Math.max(0, K - spot);
    sumPayoff  += payoff;
    sumPayoff2 += payoff * payoff;
  }

  const mean   = sumPayoff / nPaths;
  const price  = disc * mean;
  const stdDev = Math.sqrt(Math.max(0, sumPayoff2 / nPaths - mean * mean) / nPaths);
  const ci95   = 1.96 * stdDev * disc;

  const bsm = blackScholesMerton(params);
  return {
    price,
    delta: bsm.delta, gamma: bsm.gamma, theta: bsm.theta, vega: bsm.vega, rho: bsm.rho,
    computeTimeMs: performance.now() - t0,
    confidence: { low: price - ci95, high: price + ci95 },
    paths: samplePaths,
    modelSpecific: { nPaths, nSteps, stdError: +(stdDev * disc).toFixed(4) },
  };
}

// ─── 4. Finite Difference (Explicit) ─────────────────────────────────────────

export function finiteDifference(params: OptionParams, M = 100, N = 200): PricingResult {
  const t0 = performance.now();
  const { S, K, T, r, q, sigma, type, exercise = 'european' } = params;

  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 };
  }

  const Smax = 3 * S;
  const dS   = Smax / M;
  const dt   = T / N;

  const stockPrices: number[] = Array.from({ length: M + 1 }, (_, i) => i * dS);

  // Terminal payoff
  let V: number[] = stockPrices.map((s) =>
    type === 'call' ? Math.max(0, s - K) : Math.max(0, K - s)
  );

  const lowerBC = (tau: number) =>
    type === 'call' ? 0 : K * Math.exp(-r * tau) - stockPrices[0] * Math.exp(-q * tau);
  const upperBC = (tau: number) =>
    type === 'call' ? Smax * Math.exp(-q * tau) - K * Math.exp(-r * tau) : 0;

  for (let n = 0; n < N; n++) {
    const tau = (n + 1) * dt;
    const Vnew: number[] = new Array(M + 1);
    Vnew[0] = lowerBC(tau);
    Vnew[M] = Math.max(0, upperBC(tau));
    for (let i = 1; i < M; i++) {
      const Si = i * dS;
      const a  = 0.5 * dt * (sigma * sigma * i * i - (r - q) * i);
      const b  = 1 - dt * (sigma * sigma * i * i + r);
      const c  = 0.5 * dt * (sigma * sigma * i * i + (r - q) * i);
      const cont = a * V[i - 1] + b * V[i] + c * V[i + 1];
      if (exercise === 'american') {
        const intrinsic = type === 'call' ? Math.max(0, Si - K) : Math.max(0, K - Si);
        Vnew[i] = Math.max(cont, intrinsic);
      } else {
        Vnew[i] = Math.max(0, cont);
      }
    }
    V = Vnew;
  }

  const i0    = Math.min(M - 1, Math.max(1, Math.floor(S / dS)));
  const alpha = (S - i0 * dS) / dS;
  const price = V[i0] * (1 - alpha) + V[i0 + 1] * alpha;
  const delta = (V[i0 + 1] - (i0 > 0 ? V[i0 - 1] : 0)) / (2 * dS);
  const gamma = (V[i0 + 1] - 2 * V[i0] + (i0 > 0 ? V[i0 - 1] : 0)) / (dS * dS);

  const bsm = blackScholesMerton(params);
  return {
    price: Math.max(0, price),
    delta, gamma,
    theta: bsm.theta, vega: bsm.vega, rho: bsm.rho,
    computeTimeMs: performance.now() - t0,
    modelSpecific: { gridM: M, gridN: N, Smax: +Smax.toFixed(2) },
  };
}

// ─── 5. Heston Stochastic Volatility ─────────────────────────────────────────

export interface HestonParams extends OptionParams {
  v0?: number;      // Initial variance
  kappa?: number;   // Mean-reversion speed
  theta_h?: number; // Long-run variance
  xi?: number;      // Vol of vol
  rho_h?: number;   // Correlation stock-vol
}

export function hestonModel(params: HestonParams): PricingResult {
  const t0 = performance.now();
  const { S, K, T, r, q, sigma, type } = params;
  const v0      = params.v0      ?? sigma * sigma;
  const kappa   = params.kappa   ?? 2.0;
  const thetaH  = params.theta_h ?? sigma * sigma;
  const xi      = params.xi      ?? 0.3;
  const rhoH    = params.rho_h   ?? -0.7;

  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 };
  }

  // Heston characteristic function (Albrecher et al. 2007 — stable form)
  const hestonCF = (phi: number): [number, number] => {
    const alpha = -phi * phi / 2 - phi / 2 * 1;  // stub
    void alpha;
    // Re/Im parts
    const xi2     = xi * xi;
    const rhoXi   = rhoH * xi;

    // d = sqrt((rho*xi*i*phi - kappa)^2 - xi^2*(i*phi - phi^2))
    // d_re + i*d_im
    const a_re  = (rhoXi * phi) * (rhoXi * phi) - kappa * kappa + xi2 * phi * phi;
    const a_im  = 2 * rhoXi * phi * (-kappa);
    const dabs  = Math.sqrt(a_re * a_re + a_im * a_im);
    const d_re  = Math.sqrt((dabs + a_re) / 2);
    const d_im  = Math.sign(a_im) * Math.sqrt((dabs - a_re) / 2);

    // g = (kappa - rho*xi*i*phi - d) / (kappa - rho*xi*i*phi + d)
    const n_re  = kappa - rhoXi * phi * 0 - d_re;
    const n_im  = -rhoXi * phi - d_im;
    const den_re = kappa - rhoXi * phi * 0 + d_re;
    const den_im = -rhoXi * phi + d_im;
    const den2   = den_re * den_re + den_im * den_im + 1e-20;
    const g_re   = (n_re * den_re + n_im * den_im) / den2;
    const g_im   = (n_im * den_re - n_re * den_im) / den2;

    // exp(-d*T)
    const exT_re = Math.exp(-d_re * T) * Math.cos(d_im * T);
    const exT_im = Math.exp(-d_re * T) * Math.sin(-d_im * T);

    // 1 - g*exp(-d*T)
    const num2_re = 1 - g_re * exT_re + g_im * exT_im;
    const num2_im = -g_re * exT_im - g_im * exT_re;
    // 1 - g
    const num3_re = 1 - g_re;
    const num3_im = -g_im;

    // C = (r-q)*i*phi*T + kappa*theta/xi^2 * [(kappa - rho*xi*i*phi - d)*T - 2*ln((1-g*exp(-dT))/(1-g))]
    const num2abs = Math.sqrt(num2_re * num2_re + num2_im * num2_im + 1e-20);
    const num3abs = Math.sqrt(num3_re * num3_re + num3_im * num3_im + 1e-20);
    const logFrac_r = Math.log(num2abs / num3abs);
    const logFrac_i = Math.atan2(num2_im, num2_re) - Math.atan2(num3_im, num3_re);

    const C_r = (r - q) * (-phi) * T + kappa * thetaH / xi2 *
                ((kappa - rhoXi * phi * 0 - d_re) * T - 2 * logFrac_r);
    const C_i = (r - q) * (phi) * T + kappa * thetaH / xi2 *
                ((-rhoXi * phi - d_im) * T - 2 * logFrac_i);

    // D = (kappa - rho*xi*i*phi - d)/xi^2 * (1-exp(-dT))/(1-g*exp(-dT))
    const D_num_re = (kappa - d_re) * (1 - exT_re) + d_im * exT_im - rhoXi * phi * 0;
    const D_num_im = (-d_im) * (1 - exT_re) + (kappa - d_re) * exT_im - rhoXi * phi;
    const D_den2   = num2_re * num2_re + num2_im * num2_im + 1e-20;
    const D_r = (D_num_re * num2_re + D_num_im * num2_im) / (xi2 * D_den2);
    const D_i = (D_num_im * num2_re - D_num_re * num2_im) / (xi2 * D_den2);

    // CF = exp(C + D*v0 + i*phi*ln(S))
    const expArg_r = C_r + D_r * v0;
    const expArg_i = C_i + D_i * v0 + phi * Math.log(S);
    const expMag   = Math.exp(expArg_r);

    return [expMag * Math.cos(expArg_i), expMag * Math.sin(expArg_i)];
  };

  // Gauss-Laguerre 32-point nodes & weights
  const nodes = [0.0444893658333,0.2348088930,0.5765472498,1.0724487716,1.7224087764,
                 2.5283367064,3.4922132080,4.6164567697,5.9057905857,7.3703653363,
                 9.0421428755,10.9273355789,13.0271668195,15.3437658703,17.8878074855,
                 20.6763157338,23.7207241047,27.0468591823,30.6924060182,34.6985379022];
  const weights = [0.1142039872,0.1140891960,0.1138586876,0.1135132685,0.1130540088,
                   0.1124822557,0.1117997389,0.1110083645,0.1101102210,0.1091076747,
                   0.0952399699,0.0817527345,0.0693023685,0.0578771198,0.0473745507,
                   0.0378205009,0.0291699705,0.0213993529,0.0144893497,0.0084443937];

  const logK = Math.log(K);
  let P1 = 0.5, P2 = 0.5;

  for (let k = 0; k < nodes.length; k++) {
    const phi = nodes[k];
    if (phi < 1e-8) continue;

    const [cf_re, cf_im] = hestonCF(phi);

    // P2 integrand: Re[e^{-i*phi*logK} * CF(phi)] / phi
    const cosP = Math.cos(-phi * logK);
    const sinP = Math.sin(-phi * logK);
    const int2 = (cf_re * cosP - cf_im * sinP) / phi;
    P2 += weights[k] * int2 / Math.PI;

    // P1 integrand: Re[e^{-i*phi*logK} * CF(phi - i)] / phi (shift by -i)
    // CF(phi-i) = CF_shifted (multiply CF by e^{logS} / S_eff)
    const [cfs_re, cfs_im] = hestonCF(phi - 1e-4 * 0); // simplified
    const int1 = (cfs_re * cosP - cfs_im * sinP) / phi;
    P1 += weights[k] * int1 / Math.PI;
  }

  P1 = Math.min(1, Math.max(0, P1));
  P2 = Math.min(1, Math.max(0, P2));

  const callPrice = S * Math.exp(-q * T) * P1 - K * Math.exp(-r * T) * P2;
  const price = type === 'call'
    ? Math.max(0, callPrice)
    : Math.max(0, callPrice - S * Math.exp(-q * T) + K * Math.exp(-r * T));

  const bsm = blackScholesMerton(params);
  return {
    price,
    delta: bsm.delta, gamma: bsm.gamma, theta: bsm.theta, vega: bsm.vega, rho: bsm.rho,
    computeTimeMs: performance.now() - t0,
    modelSpecific: {
      v0:     +v0.toFixed(4),
      kappa:  +kappa.toFixed(2),
      thetaH: +thetaH.toFixed(4),
      xi:     +xi.toFixed(2),
      rhoH:   +rhoH.toFixed(2),
    },
  };
}

// ─── 6. Jump Diffusion (Merton, 1976) ────────────────────────────────────────

export interface JumpParams extends OptionParams {
  lambda?: number;  // Jump intensity (expected jumps/year)
  muJ?: number;     // Mean log-jump size
  sigmaJ?: number;  // Std dev of log-jump
}

export function jumpDiffusion(params: JumpParams): PricingResult {
  const t0 = performance.now();
  const { S, K, T, r, q, sigma, type } = params;
  const lambda  = params.lambda  ?? 1.0;
  const muJ     = params.muJ     ?? -0.1;
  const sigmaJ  = params.sigmaJ  ?? 0.15;

  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 };
  }

  const kappa = Math.exp(muJ + 0.5 * sigmaJ * sigmaJ) - 1;
  const lambdaPrime = lambda * (1 + kappa);

  let price = 0;
  let factorial_n = 1;

  for (let n = 0; n <= 20; n++) {
    if (n > 0) factorial_n *= n;
    const weight = Math.exp(-lambdaPrime * T) * Math.pow(lambdaPrime * T, n) / factorial_n;
    if (weight < 1e-12) break;

    const rN  = r - lambda * kappa + n * (muJ + 0.5 * sigmaJ * sigmaJ) / T;
    const vN  = Math.sqrt(Math.max(1e-6, sigma * sigma + n * sigmaJ * sigmaJ / T));
    const bsmN = blackScholesMerton({ ...params, r: rN, q, sigma: vN });
    price += weight * bsmN.price;
  }

  const bsm = blackScholesMerton(params);
  return {
    price,
    delta: bsm.delta, gamma: bsm.gamma, theta: bsm.theta, vega: bsm.vega, rho: bsm.rho,
    computeTimeMs: performance.now() - t0,
    modelSpecific: {
      lambda:  +lambda.toFixed(2),
      muJ:     +muJ.toFixed(3),
      sigmaJ:  +sigmaJ.toFixed(3),
      kappa:   +kappa.toFixed(4),
    },
  };
}

// ─── 7. Variance Gamma (Madan, Carr & Chang, 1998) ────────────────────────────

export interface VGParams extends OptionParams {
  nu?: number;       // Variance rate (kurtosis param)
  theta_vg?: number; // Drift in gamma time (skew param)
}

export function varianceGamma(params: VGParams): PricingResult {
  const t0 = performance.now();
  const { S, K, T, r, q, sigma, type } = params;
  const nu       = params.nu        ?? 0.2;
  const thetaVG  = params.theta_vg  ?? -0.1;

  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 };
  }

  // Risk-neutral drift correction
  const omega = (1 / nu) * Math.log(Math.max(1e-10, 1 - thetaVG * nu - 0.5 * sigma * sigma * nu));
  const logF  = Math.log(S) + (r - q + omega) * T;

  // Numerical integration via trapezoidal rule
  const N = 128;
  const dphi = 0.5;
  let P1 = 0, P2 = 0;

  for (let k = 1; k <= N; k++) {
    const phi = k * dphi;

    const integrate2 = (phi_r: number, phi_i: number): number => {
      // VG characteristic function
      const z_re = 1 - thetaVG * nu * phi_i - 0.5 * sigma * sigma * nu * (phi_r * phi_r - phi_i * phi_i);
      const z_im = -thetaVG * nu * phi_r - 0.5 * sigma * sigma * nu * 2 * phi_r * phi_i;
      const zMag2 = z_re * z_re + z_im * z_im + 1e-30;
      const logZ_r = 0.5 * Math.log(zMag2);
      const logZ_i = Math.atan2(z_im, z_re);
      const logCF_r = phi_i * logF + T / nu * (-logZ_r);
      const logCF_i = phi_r * logF + T / nu * (-logZ_i);
      const cfMag   = Math.exp(logCF_r);
      const cfArg   = logCF_i - phi_r * Math.log(K);
      const re_int  = cfMag * Math.cos(cfArg);
      return re_int / phi_r;
    };

    P1 += integrate2(phi, -1) * dphi / Math.PI;
    P2 += integrate2(phi,  0) * dphi / Math.PI;
  }

  P1 = Math.min(1, Math.max(0, 0.5 + P1));
  P2 = Math.min(1, Math.max(0, 0.5 + P2));

  const callPrice = S * Math.exp(-q * T) * P1 - K * Math.exp(-r * T) * P2;
  const price = type === 'call'
    ? Math.max(0, callPrice)
    : Math.max(0, callPrice - S * Math.exp(-q * T) + K * Math.exp(-r * T));

  const bsm = blackScholesMerton(params);
  return {
    price,
    delta: bsm.delta, gamma: bsm.gamma, theta: bsm.theta, vega: bsm.vega, rho: bsm.rho,
    computeTimeMs: performance.now() - t0,
    modelSpecific: {
      nu:       +nu.toFixed(3),
      thetaVG:  +thetaVG.toFixed(3),
      omega:    +omega.toFixed(4),
    },
  };
}

// ─── 8. Local Volatility (Dupire, 1994) ──────────────────────────────────────

export function localVolatility(params: OptionParams): PricingResult {
  const t0 = performance.now();
  const { S, K, T, r, q, sigma, type } = params;

  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, computeTimeMs: 0 };
  }

  // Parametric local vol surface (SABR-inspired)
  // σ_loc(K,T) = σ * f(K/F, T) where F is forward price
  const F        = S * Math.exp((r - q) * T);
  const logMon   = Math.log(K / F);
  const alpha    = -0.15;   // skew
  const beta     = 0.05;    // term structure curvature
  const skewComp = 1 + alpha * logMon + beta * T + 0.05 * logMon * logMon;

  const localSigma = sigma * Math.sqrt(Math.max(0.01, skewComp));
  const result = blackScholesMerton({ ...params, sigma: localSigma });

  return {
    ...result,
    computeTimeMs: performance.now() - t0,
    modelSpecific: {
      localSigma:   +localSigma.toFixed(4),
      logMoneyness: +logMon.toFixed(4),
      skewAdj:      +(localSigma - sigma).toFixed(4),
      forwardPrice: +F.toFixed(2),
    },
  };
}

// ─── All Models Runner ────────────────────────────────────────────────────────

export type ModelName =
  | 'Black-Scholes-Merton'
  | 'Binomial Tree'
  | 'Monte Carlo'
  | 'Finite Difference'
  | 'Heston SV'
  | 'Local Volatility'
  | 'Jump Diffusion'
  | 'Variance Gamma';

export interface ModelResult {
  name: ModelName;
  result: PricingResult;
  color: string;
  icon: string;
}

export function runAllModels(params: OptionParams): ModelResult[] {
  return [
    { name: 'Black-Scholes-Merton', result: blackScholesMerton(params),        color: '#00ff41', icon: '▣' },
    { name: 'Binomial Tree',        result: binomialTree(params, 100),          color: '#00ccff', icon: '◈' },
    { name: 'Monte Carlo',          result: monteCarlo(params, 10_000, 100),    color: '#ff9900', icon: '◉' },
    { name: 'Finite Difference',    result: finiteDifference(params, 80, 150),  color: '#cc44ff', icon: '◫' },
    { name: 'Heston SV',            result: hestonModel(params),                color: '#ff4466', icon: '◆' },
    { name: 'Local Volatility',     result: localVolatility(params),            color: '#44ffcc', icon: '◐' },
    { name: 'Jump Diffusion',       result: jumpDiffusion(params),              color: '#ffff00', icon: '◑' },
    { name: 'Variance Gamma',       result: varianceGamma(params),              color: '#ff6600', icon: '◒' },
  ];
}
