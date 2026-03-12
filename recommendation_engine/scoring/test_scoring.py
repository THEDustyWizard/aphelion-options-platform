"""
Test script for APHELION Scoring Engine
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from core_scoring import APHELIONScoringEngine

def create_sample_data():
    """Create sample data for testing."""
    # Create sample price data
    dates = pd.date_range(end=datetime.now(), periods=100, freq='D')
    np.random.seed(42)
    
    # Generate realistic price data with trend
    base_price = 100
    returns = np.random.normal(0.001, 0.02, 100)  # Daily returns
    prices = base_price * np.exp(np.cumsum(returns))
    
    price_data = pd.DataFrame({
        'Open': prices * 0.99 + np.random.normal(0, 0.5, 100),
        'High': prices * 1.01 + np.random.normal(0, 0.5, 100),
        'Low': prices * 0.98 + np.random.normal(0, 0.5, 100),
        'Close': prices + np.random.normal(0, 0.5, 100),
        'Volume': np.random.randint(1000000, 5000000, 100)
    }, index=dates)
    
    # Sample fundamentals for defense sector
    fundamentals = {
        'pe_ratio': 16.5,
        'debt_equity': 0.8,
        'roic': 0.12,
        'revenue_growth': 0.08,
        'operating_margin': 0.15,
        'free_cash_flow': 2_500_000_000
    }
    
    # Sample news items
    news_items = [
        {
            'title': 'Defense contractor wins major government contract',
            'content': 'Company announced a new $5B defense contract, boosting growth prospects.',
            'timestamp': datetime.now() - timedelta(hours=2)
        },
        {
            'title': 'Analysts upgrade rating on strong earnings',
            'content': 'Several analysts have upgraded the stock following better-than-expected Q4 results.',
            'timestamp': datetime.now() - timedelta(hours=12)
        }
    ]
    
    # Sample sector data (sector ETF)
    sector_returns = np.random.normal(0.0008, 0.015, 100)
    sector_prices = base_price * np.exp(np.cumsum(sector_returns))
    
    sector_data = pd.DataFrame({
        'Open': sector_prices * 0.99,
        'High': sector_prices * 1.01,
        'Low': sector_prices * 0.98,
        'Close': sector_prices,
        'Volume': np.random.randint(2000000, 8000000, 100)
    }, index=dates)
    
    # Sample options flow
    options_flow = [
        {'type': 'call_buy', 'premium': 2_500_000, 'strike': 110, 'expiration': '2026-04-18'},
        {'type': 'call_buy', 'premium': 1_800_000, 'strike': 115, 'expiration': '2026-04-18'},
        {'type': 'put_sell', 'premium': 900_000, 'strike': 95, 'expiration': '2026-04-18'}
    ]
    
    return {
        'price_data': price_data,
        'fundamentals': fundamentals,
        'news_items': news_items,
        'sector_data': sector_data,
        'options_flow': options_flow
    }

def test_scoring_engine():
    """Test the scoring engine with sample data."""
    print("=== APHELION Scoring Engine Test ===\n")
    
    # Initialize engine
    engine = APHELIONScoringEngine()
    print(f"Initialized with weights: {engine.weights}")
    
    # Create sample data
    sample_data = create_sample_data()
    ticker = "LMT"
    sector = "defense"
    current_price = sample_data['price_data']['Close'].iloc[-1]
    
    print(f"\nTesting with ticker: {ticker}, sector: {sector}")
    print(f"Current price: ${current_price:.2f}")
    
    # Calculate all scores
    scores = engine.calculate_total_score(
        ticker=ticker,
        sector=sector,
        price_data=sample_data['price_data'],
        fundamentals=sample_data['fundamentals'],
        news_items=sample_data['news_items'],
        sector_data=sample_data['sector_data'],
        options_flow=sample_data['options_flow']
    )
    
    # Display scores
    print("\n=== Score Breakdown ===")
    for component, score in scores.items():
        if component != 'total':
            weight = engine.weights[component] * 100
            print(f"{component.capitalize():12s}: {score:6.1f} (Weight: {weight:4.1f}%)")
    
    print(f"\nTotal Score: {scores['total']:.1f}/100")
    
    # Generate recommendation
    recommendation = engine.generate_recommendation(ticker, scores, current_price)
    
    print("\n=== Recommendation ===")
    print(f"Ticker: {recommendation['ticker']}")
    print(f"Direction: {recommendation['direction']}")
    print(f"Strategy: {recommendation['strategy']}")
    print(f"Option Type: {recommendation['option_type']}")
    print(f"Expiration Days: {recommendation['expiration_days']}")
    
    if isinstance(recommendation['strike_price'], dict):
        print(f"Call Strike: ${recommendation['strike_price']['call_strike']:.2f}")
        print(f"Put Strike: ${recommendation['strike_price']['put_strike']:.2f}")
    else:
        print(f"Strike Price: ${recommendation['strike_price']:.2f}")
    
    print(f"Confidence Score: {recommendation['confidence_score']:.1f}")
    print(f"\nRationale: {recommendation['rationale']}")
    
    # Test sector-specific scoring
    print("\n=== Sector-Specific Testing ===")
    sectors = ['defense', 'energy', 'logistics', 'medical']
    
    for test_sector in sectors:
        print(f"\nTesting {test_sector} sector fundamentals...")
        
        # Adjust fundamentals for sector
        sector_fundamentals = sample_data['fundamentals'].copy()
        
        # Modify P/E based on sector average
        sector_pe_map = {'defense': 18.5, 'energy': 12.0, 'logistics': 16.0, 'medical': 22.0}
        sector_fundamentals['pe_ratio'] = sector_pe_map[test_sector] * 0.9  # Slightly better than average
        
        fund_score = engine.calculate_fundamental_score(
            ticker="TEST",
            sector=test_sector,
            fundamentals=sector_fundamentals
        )
        
        print(f"  Fundamental score: {fund_score:.1f}")
    
    return recommendation

def test_risk_scenarios():
    """Test different risk scenarios."""
    print("\n=== Risk Scenario Testing ===")
    
    engine = APHELIONScoringEngine()
    
    # Scenario 1: High volatility, oversold
    print("\nScenario 1: High volatility, oversold stock")
    price_data = pd.DataFrame({
        'Open': [100, 95, 90, 85, 80],
        'High': [105, 100, 95, 90, 85],
        'Low': [95, 90, 85, 80, 75],
        'Close': [98, 92, 87, 82, 77],
        'Volume': [1000000] * 5
    })
    
    tech_score = engine.calculate_technical_score("TEST", price_data)
    print(f"Technical score: {tech_score:.1f}")
    
    # Scenario 2: Low volatility, neutral
    print("\nScenario 2: Low volatility, neutral stock")
    price_data = pd.DataFrame({
        'Open': [100, 100.5, 100.2, 100.8, 100.3],
        'High': [101, 101.5, 101.2, 101.8, 101.3],
        'Low': [99, 99.5, 99.2, 99.8, 99.3],
        'Close': [100.5, 100.8, 100.3, 101.0, 100.6],
        'Volume': [1000000] * 5
    })
    
    tech_score = engine.calculate_technical_score("TEST", price_data)
    print(f"Technical score: {tech_score:.1f}")
    
    # Scenario 3: Strong uptrend
    print("\nScenario 3: Strong uptrend")
    price_data = pd.DataFrame({
        'Open': [100, 105, 110, 115, 120],
        'High': [102, 107, 112, 117, 122],
        'Low': [98, 103, 108, 113, 118],
        'Close': [101, 106, 111, 116, 121],
        'Volume': [1000000] * 5
    })
    
    tech_score = engine.calculate_technical_score("TEST", price_data)
    print(f"Technical score: {tech_score:.1f}")

if __name__ == "__main__":
    print("Running APHELION Scoring Engine tests...")
    print("=" * 50)
    
    # Run main test
    recommendation = test_scoring_engine()
    
    # Run risk scenarios
    test_risk_scenarios()
    
    print("\n" + "=" * 50)
    print("All tests completed successfully!")