# APHELION Backend API Guide

## Overview
The APHELION backend provides a comprehensive API for options trading calculations, market data, and risk analysis. This API is designed to work with the desktop application.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Key Endpoints

### 1. Market Data
- `GET /market/quotes/{symbol}` - Get quote for a symbol
- `GET /market/option-chains/{symbol}` - Get option chain for a symbol
- `GET /market/historical/{symbol}` - Get historical price data
- `GET /market/search` - Search for instruments
- `GET /market/expirations/{symbol}` - Get option expiration dates
- `GET /market/unusual-activity` - Get unusual options activity
- `GET /market/market-hours` - Get market hours
- `GET /market/sectors` - Get sector performance data

### 2. Calculation Engine
- `POST /calculation/option-price` - Calculate option price using Black-Scholes
- `POST /calculation/greeks` - Calculate option Greeks
- `POST /calculation/position-metrics` - Calculate position metrics
- `POST /calculation/portfolio-risk` - Calculate portfolio risk metrics
- `POST /calculation/five-factor-score` - Calculate 5-factor scoring algorithm
- `POST /calculation/implied-volatility` - Calculate implied volatility

### 3. Recommendations
- `GET /recommendations/{symbol}` - Get trading recommendations for a symbol
- `GET /recommendations/sectors` - Get sector-based recommendations
- `POST /recommendations/backtest` - Backtest a trading strategy

### 4. News & Sentiment
- `GET /news/latest` - Get latest news
- `GET /news/sentiment/{symbol}` - Get sentiment analysis for a symbol
- `GET /news/sectors` - Get sector-specific news

### 5. Portfolio Management
- `GET /portfolio` - Get user portfolio
- `POST /portfolio` - Add position to portfolio
- `PUT /portfolio/{id}` - Update position
- `DELETE /portfolio/{id}` - Remove position from portfolio
- `GET /portfolio/performance` - Get portfolio performance metrics

## Calculation Engine Examples

### Option Price Calculation
```json
POST /calculation/option-price
{
  "underlyingPrice": 100,
  "strikePrice": 105,
  "timeToExpiration": 0.25,
  "riskFreeRate": 0.05,
  "volatility": 0.2,
  "optionType": "call"
}

Response:
{
  "price": 2.48
}
```

### Greeks Calculation
```json
POST /calculation/greeks
{
  "underlyingPrice": 100,
  "strikePrice": 105,
  "timeToExpiration": 0.25,
  "riskFreeRate": 0.05,
  "volatility": 0.2,
  "optionType": "call"
}

Response:
{
  "delta": 0.3772,
  "gamma": 0.0380,
  "theta": -0.0485,
  "vega": 0.1187,
  "rho": 0.0312
}
```

### Position Metrics
```json
POST /calculation/position-metrics
{
  "params": {
    "underlyingPrice": 100,
    "strikePrice": 105,
    "timeToExpiration": 0.25,
    "riskFreeRate": 0.05,
    "volatility": 0.2,
    "optionType": "call"
  },
  "quantity": 1,
  "entryPrice": 2.48
}

Response:
{
  "currentValue": 248,
  "costBasis": 248,
  "unrealizedPnl": 0,
  "unrealizedPnlPercent": 0,
  "deltaExposure": 37.72,
  "gammaExposure": 3.8,
  "thetaExposure": -4.85,
  "vegaExposure": 11.87,
  "maxLoss": -248,
  "maxProfit": Infinity,
  "breakevenPrice": 107.48,
  "probabilityOfProfit": 0.3398
}
```

### 5-Factor Scoring
```json
POST /calculation/five-factor-score
{
  "technicalScore": 75,
  "fundamentalScore": 80,
  "sentimentScore": 65,
  "sectorMomentumScore": 70,
  "optionsFlowScore": 85
}

Response:
{
  "overallScore": 74.5,
  "weightedScores": {
    "technical": 22.5,
    "fundamental": 20,
    "sentiment": 13,
    "sectorMomentum": 10.5,
    "optionsFlow": 8.5
  },
  "confidence": 72.8
}
```

## WebSocket Support
Real-time data is available via WebSocket at:
```
ws://localhost:3001/ws
```

Supported events:
- `quote:update` - Real-time quote updates
- `option:update` - Option chain updates
- `news:alert` - Breaking news alerts
- `portfolio:update` - Portfolio value changes

## Rate Limiting
- 100 requests per 15 minutes per IP address
- WebSocket connections: 5 per user

## Error Responses
```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

Common error codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (copy `.env.example` to `.env`):
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

4. Access API documentation:
```
http://localhost:3000/api-docs
```

## Desktop App Integration

The desktop app should:
1. Connect to the backend API at `http://localhost:3000`
2. Use WebSocket for real-time updates
3. Implement JWT token storage/refresh
4. Handle rate limiting gracefully
5. Use the calculation engine for all option pricing and risk metrics

## Focus Sectors
The platform focuses on four key sectors:
1. **Defense** - ITA ETF
2. **Energy** - XLE ETF  
3. **Logistics** - XLI ETF
4. **Medical** - XLV ETF

## Schwab API Integration
- Market data sourced from Schwab API
- Real-time quotes and option chains
- Historical price data
- Unusual options activity detection

## No ThinkOrSwim Integration
- All TOS code has been removed
- Pure Schwab API integration only
- Standalone desktop application support