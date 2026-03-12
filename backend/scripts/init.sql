-- APHELION Database Initialization Script
-- Run this script to initialize the database with sample data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create sample sectors
INSERT INTO sectors (id, name, description, etf_symbol, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'Defense', 'Aerospace and defense companies', 'ITA', NOW(), NOW()),
  (uuid_generate_v4(), 'Energy', 'Oil, gas, and energy companies', 'XLE', NOW(), NOW()),
  (uuid_generate_v4(), 'Logistics', 'Transportation and logistics companies', 'XLI', NOW(), NOW()),
  (uuid_generate_v4(), 'Medical', 'Healthcare and pharmaceutical companies', 'XLV', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create sample tickers for each sector
-- Defense sector
INSERT INTO tickers (id, symbol, name, sector, market_cap, has_options, active, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'LMT', 'Lockheed Martin Corporation', 'defense', 110000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'RTX', 'RTX Corporation', 'defense', 120000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'NOC', 'Northrop Grumman Corporation', 'defense', 70000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'GD', 'General Dynamics Corporation', 'defense', 75000000000, true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Energy sector
INSERT INTO tickers (id, symbol, name, sector, market_cap, has_options, active, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'XOM', 'Exxon Mobil Corporation', 'energy', 400000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'CVX', 'Chevron Corporation', 'energy', 280000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'COP', 'ConocoPhillips', 'energy', 130000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'SLB', 'Schlumberger Limited', 'energy', 70000000000, true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Logistics sector
INSERT INTO tickers (id, symbol, name, sector, market_cap, has_options, active, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'UPS', 'United Parcel Service, Inc.', 'logistics', 130000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'FDX', 'FedEx Corporation', 'logistics', 60000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'CSX', 'CSX Corporation', 'logistics', 65000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'UNP', 'Union Pacific Corporation', 'logistics', 140000000000, true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Medical sector
INSERT INTO tickers (id, symbol, name, sector, market_cap, has_options, active, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), 'JNJ', 'Johnson & Johnson', 'medical', 380000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'PFE', 'Pfizer Inc.', 'medical', 160000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'MRK', 'Merck & Co., Inc.', 'medical', 250000000000, true, true, NOW(), NOW()),
  (uuid_generate_v4(), 'ABT', 'Abbott Laboratories', 'medical', 190000000000, true, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create sample user (for testing)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, active, created_at, updated_at)
VALUES 
  (
    uuid_generate_v4(),
    'test@aphelion.com',
    crypt('password123', gen_salt('bf', 12)),
    'Test',
    'User',
    'user',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Create sample watchlist
INSERT INTO watchlists (id, user_id, name, description, is_default, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
  u.id,
  'My Watchlist',
  'Default watchlist',
  true,
  NOW(),
  NOW()
FROM users u 
WHERE u.email = 'test@aphelion.com'
ON CONFLICT DO NOTHING;

-- Add some tickers to the watchlist
INSERT INTO watchlist_items (id, watchlist_id, ticker_id, added_at, notes)
SELECT 
  uuid_generate_v4(),
  w.id,
  t.id,
  NOW(),
  'Sample watchlist item'
FROM watchlists w
CROSS JOIN (SELECT id FROM tickers LIMIT 5) t
WHERE w.name = 'My Watchlist'
ON CONFLICT DO NOTHING;

-- Create sample recommendations
INSERT INTO recommendations (
  id, ticker_id, sector, confidence, risk_score, strategy, direction, 
  expiration_days, expiration_date, strike_price, current_price, rationale,
  scores, risk_factors, generated_at, valid_until, active, executed, created_at, updated_at
)
SELECT 
  uuid_generate_v4(),
  t.id,
  t.sector,
  75.5,
  35.2,
  'Bull Call Spread',
  'bullish',
  45,
  NOW() + INTERVAL '45 days',
  ROUND(t.price * 1.02, 2),
  t.price,
  'Strong technical indicators and positive sector momentum suggest upside potential.',
  '{"technical": 82, "fundamental": 70, "sentiment": 68, "sectorMomentum": 85, "optionsFlow": 72, "total": 75.5}',
  '{"volatility": 40, "liquidity": 25, "sector": 30, "company": 35, "strategy": 45, "total": 35.2}',
  NOW(),
  NOW() + INTERVAL '7 days',
  true,
  false,
  NOW(),
  NOW()
FROM tickers t
WHERE t.symbol IN ('LMT', 'XOM', 'UPS', 'JNJ')
ON CONFLICT DO NOTHING;

-- Create sample news articles
INSERT INTO news_articles (
  id, title, description, content, url, source, published_at, 
  ticker_id, sector, sentiment, relevance, keywords, created_at, updated_at
)
SELECT 
  uuid_generate_v4(),
  'Company Reports Strong Quarterly Earnings',
  'The company exceeded analyst expectations for Q4 earnings.',
  'Full article content would go here...',
  'https://example.com/news/1',
  'Financial Times',
  NOW() - INTERVAL '1 day',
  t.id,
  t.sector,
  0.8,
  0.9,
  ARRAY['earnings', 'growth', 'positive', 'quarterly'],
  NOW(),
  NOW()
FROM tickers t
WHERE t.symbol IN ('LMT', 'XOM')
UNION ALL
SELECT 
  uuid_generate_v4(),
  'Sector Faces Regulatory Challenges',
  'New regulations could impact sector performance in coming months.',
  'Full article content would go here...',
  'https://example.com/news/2',
  'Wall Street Journal',
  NOW() - INTERVAL '2 days',
  t.id,
  t.sector,
  -0.3,
  0.7,
  ARRAY['regulation', 'challenges', 'sector', 'impact'],
  NOW(),
  NOW()
FROM tickers t
WHERE t.symbol IN ('UPS', 'JNJ')
ON CONFLICT DO NOTHING;

-- Create sample portfolio
INSERT INTO portfolios (id, user_id, name, description, is_default, created_at, updated_at)
SELECT 
  uuid_generate_v4(),
  u.id,
  'My Portfolio',
  'Default investment portfolio',
  true,
  NOW(),
  NOW()
FROM users u 
WHERE u.email = 'test@aphelion.com'
ON CONFLICT DO NOTHING;

-- Create sample trades
INSERT INTO trades (
  id, portfolio_id, recommendation_id, ticker_id, trade_type, quantity, 
  entry_price, exit_price, entry_date, exit_date, status, pnl, pnl_percentage,
  notes, created_at, updated_at
)
SELECT 
  uuid_generate_v4(),
  p.id,
  r.id,
  r.ticker_id,
  'options',
  10,
  125.50,
  132.75,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '5 days',
  'closed',
  72.50,
  5.78,
  'Successful options trade based on recommendation.',
  NOW(),
  NOW()
FROM portfolios p
CROSS JOIN recommendations r
WHERE p.name = 'My Portfolio'
  AND r.ticker_id IN (SELECT id FROM tickers WHERE symbol = 'LMT')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Create sample option chain snapshot
INSERT INTO option_chains (
  id, ticker_id, expiration, underlying_price, implied_volatility,
  calls, puts, updated_at, active, created_at
)
SELECT 
  uuid_generate_v4(),
  t.id,
  NOW() + INTERVAL '30 days',
  t.price,
  0.25,
  '[{"strike": 120, "bid": 2.50, "ask": 2.75, "last": 2.60, "volume": 1500, "openInterest": 5000, "impliedVolatility": 0.24, "delta": 0.45, "gamma": 0.02, "theta": -0.05, "vega": 0.15, "inTheMoney": false, "bidAskSpread": 0.25, "midPrice": 2.625}]',
  '[{"strike": 120, "bid": 1.50, "ask": 1.75, "last": 1.60, "volume": 1200, "openInterest": 4000, "impliedVolatility": 0.26, "delta": -0.35, "gamma": 0.02, "theta": -0.04, "vega": 0.14, "inTheMoney": false, "bidAskSpread": 0.25, "midPrice": 1.625}]',
  NOW(),
  true,
  NOW()
FROM tickers t
WHERE t.symbol = 'LMT'
ON CONFLICT DO NOTHING;

-- Create sample backtest results
INSERT INTO backtest_results (
  id, recommendation_id, start_date, end_date, initial_capital, final_capital,
  total_return, sharpe_ratio, max_drawdown, win_rate, total_trades,
  profitable_trades, unprofitable_trades, metrics, created_at, updated_at
)
SELECT 
  uuid_generate_v4(),
  r.id,
  NOW() - INTERVAL '90 days',
  NOW(),
  10000,
  11250,
  12.5,
  1.8,
  8.2,
  0.65,
  20,
  13,
  7,
  '{"avgWin": 15.2, "avgLoss": -8.5, "profitFactor": 2.1, "recoveryFactor": 3.2}',
  NOW(),
  NOW()
FROM recommendations r
WHERE r.ticker_id IN (SELECT id FROM tickers WHERE symbol = 'LMT')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Output summary
SELECT 
  'Database initialized successfully!' as message,
  COUNT(DISTINCT t.id) as tickers_loaded,
  COUNT(DISTINCT r.id) as recommendations_created,
  COUNT(DISTINCT n.id) as news_articles_added,
  COUNT(DISTINCT u.id) as users_created
FROM tickers t
CROSS JOIN recommendations r
CROSS JOIN news_articles n
CROSS JOIN users u;