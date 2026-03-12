# APHELION Recommendation Engine
## Quant Rex Implementation
### Version 1.0 - March 12, 2026

## Overview

The APHELION Recommendation Engine is a sophisticated options trading algorithm that implements a 5-factor scoring system across four focus sectors: Defense, Oil & Gas, Logistics, and Medical. The engine generates actionable options trading recommendations with integrated risk management and backtesting capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APHELION Recommendation Engine           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   Scoring   │  │ Backtesting │  │ Risk Management  │   │
│  │   Engine    │  │  Framework  │  │     System       │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │              ThinkOrSwim Integration                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Scoring Engine (`scoring/core_scoring.py`)
Implements the 5-factor scoring algorithm:
- **Technical Score (30%)**: Trend analysis, volatility, support/resistance
- **Fundamental Score (25%)**: Sector-specific financial metrics
- **Sentiment Score (20%)**: News and market sentiment analysis
- **Sector Momentum (15%)**: Relative strength vs sector ETFs
- **Options Flow (10%)**: Unusual options activity analysis

### 2. Backtesting Framework (`backtesting/backtest_engine.py`)
Comprehensive backtesting with Monte Carlo simulations:
- Historical data management
- Trade simulation with commissions/slippage
- Performance metrics calculation
- Strategy robustness testing

### 3. Risk Management System (`risk_management/risk_manager.py`)
Multi-layered risk management:
- Trade risk assessment
- Portfolio risk monitoring
- Stress testing
- Alert generation

### 4. ThinkOrSwim Integration (`integration/thinkorswim_spec.md`)
Detailed specifications for broker integration:
- Order execution protocols
- Real-time data synchronization
- Account management
- Alert system integration

## Sector-Specific Adaptations

### Defense Sector
- **Key Metrics**: Government contracts, backlog, dividend yield
- **ETF Reference**: ITA (iShares U.S. Aerospace & Defense ETF)
- **Scoring Focus**: Debt/equity ratio, ROIC, revenue growth

### Oil & Gas Sector
- **Key Metrics**: Oil price beta, reserves, refining margin
- **ETF Reference**: XLE (Energy Select Sector SPDR Fund)
- **Scoring Focus**: Operating margin, free cash flow, P/E ratio

### Logistics Sector
- **Key Metrics**: Shipping rates, fuel costs, inventory turnover
- **ETF Reference**: XLI (Industrial Select Sector SPDR Fund)
- **Scoring Focus**: Revenue growth, operating margin

### Medical Sector
- **Key Metrics**: FDA approvals, pipeline strength, patent expiry
- **ETF Reference**: XLV (Health Care Select Sector SPDR Fund)
- **Scoring Focus**: R&D growth, profit margin, P/E ratio

## Installation

```bash
# Clone repository
git clone https://github.com/your-org/aphelion-engine.git
cd aphelion-engine

# Install dependencies
pip install -r requirements.txt

# Install additional packages
pip install yfinance pandas numpy scipy
```

## Usage

### Basic Scoring Example
```python
from scoring.core_scoring import APHELIONScoringEngine
import pandas as pd

# Initialize engine
engine = APHELIONScoringEngine()

# Load data (example)
price_data = pd.read_csv('data/LMT.csv', index_col=0, parse_dates=True)
fundamentals = {
    'pe_ratio': 16.5,
    'debt_equity': 0.8,
    'roic': 0.12,
    'revenue_growth': 0.08
}

# Calculate scores
scores = engine.calculate_total_score(
    ticker='LMT',
    sector='defense',
    price_data=price_data,
    fundamentals=fundamentals,
    news_items=[],  # Would be actual news data
    sector_data=pd.DataFrame(),  # Would be sector ETF data
    options_flow=[]  # Would be options flow data
)

print(f"Total Score: {scores['total']:.1f}")
```

### Backtesting Example
```python
from backtesting.backtest_engine import BacktestEngine
from scoring.core_scoring import APHELIONScoringEngine

# Initialize components
scoring_engine = APHELIONScoringEngine()
backtest_engine = BacktestEngine(scoring_engine)

# Run backtest
results = backtest_engine.run_backtest(
    start_date='2025-01-01',
    end_date='2025-12-31',
    universe=['LMT', 'XOM', 'UPS', 'JNJ'],
    params={
        'weights': {'technical': 0.3, 'fundamental': 0.25, 
                   'sentiment': 0.2, 'sector': 0.15, 'flow': 0.1},
        'min_confidence': 60
    }
)

print(results['report'])
```

### Risk Management Example
```python
from risk_management.risk_manager import RiskManager, RiskLevel

# Initialize risk manager
risk_manager = RiskManager(risk_level=RiskLevel.MODERATE)

# Assess trade risk
assessment = risk_manager.assess_trade_risk(
    recommendation={
        'ticker': 'LMT',
        'sector': 'defense',
        'confidence_score': 78,
        'position_sizing': {'suggested_allocation': 0.03}
    },
    portfolio_state={
        'sector_exposure': {'defense': 0.10},
        'portfolio_beta': 1.1,
        'num_positions': 5
    }
)

print(f"Trade Approved: {assessment['approved']}")
print(f"Risk Score: {assessment['risk_score']:.1f}")
```

## Configuration

### Scoring Weights
Customize scoring weights in the engine initialization:
```python
custom_weights = {
    'technical': 0.35,
    'fundamental': 0.25,
    'sentiment': 0.15,
    'sector': 0.15,
    'flow': 0.10
}

engine = APHELIONScoringEngine(weights=custom_weights)
```

### Risk Parameters
Adjust risk tolerance levels:
```python
from risk_management.risk_manager import RiskLevel

# Conservative, Moderate, or Aggressive
risk_manager = RiskManager(risk_level=RiskLevel.CONSERVATIVE)
```

## Data Requirements

### Price Data
- OHLCV format (Open, High, Low, Close, Volume)
- Minimum 60 days of historical data
- Daily or intraday frequency

### Fundamental Data
- P/E ratio
- Debt/Equity ratio
- ROIC (Return on Invested Capital)
- Revenue growth
- Sector-specific metrics

### News/Sentiment Data
- News articles with timestamps
- Sentiment scores
- Relevance indicators

### Options Data
- Unusual options flow
- Volume and open interest
- Implied volatility

## Performance Metrics

The engine tracks comprehensive performance metrics:

### Return Metrics
- Total Return
- Annualized Return
- Sharpe Ratio
- Sortino Ratio

### Risk Metrics
- Maximum Drawdown
- Volatility
- Value at Risk (VaR)
- Conditional VaR (CVaR)

### Trade Statistics
- Win Rate
- Profit Factor
- Average Win/Loss
- Holding Period

## Testing

Run the test suite:
```bash
# Test scoring engine
python -m scoring.test_scoring

# Test backtesting (requires data)
python -m backtesting.test_backtest

# Test risk management
python -m risk_management.test_risk
```

## Integration with ThinkOrSwim

Refer to `integration/thinkorswim_spec.md` for detailed integration specifications including:
- Authentication protocols
- Order execution workflows
- Real-time data streaming
- Alert system integration

## Development Roadmap

### Phase 1: Core Engine (Complete)
- [x] 5-factor scoring algorithm
- [x] Sector-specific adaptations
- [x] Basic recommendation generation

### Phase 2: Advanced Features (In Progress)
- [x] Backtesting framework
- [x] Risk management system
- [ ] Machine learning enhancements
- [ ] Real-time data integration

### Phase 3: Production Deployment
- [ ] ThinkOrSwim integration
- [ ] Web interface
- [ ] Multi-user support
- [ ] Advanced analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## License

Proprietary - All rights reserved.

## Support

For support and questions:
- Discord: APHELION channel
- Email: quant-rex@aphelion-trading.com
- Documentation: See `docs/` directory

---

**Quant Rex** - APHELION Recommendation Engine Team  
*Building the future of algorithmic options trading*