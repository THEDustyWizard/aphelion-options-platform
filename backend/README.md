# APHELION Options Trading Platform - Backend

Node.js/TypeScript backend for the APHELION Options Trading Platform.

## Features

- **Schwab API Integration**: Real-time market data, options chains, and account management
- **AI-Powered Recommendations**: Integration with Python scoring engine for trading recommendations
- **Real-time Data**: WebSocket support for live market data and notifications
- **News & Sentiment Analysis**: News aggregation and sentiment analysis
- **Backtesting**: Historical performance testing for recommendations
- **Portfolio Management**: User portfolio and watchlist tracking
- **Security**: JWT authentication, rate limiting, and security headers
- **Monitoring**: Health checks, logging, and performance metrics

## Tech Stack

- **Runtime**: Node.js 18+, TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + TypeORM
- **Time Series**: TimescaleDB (for historical data)
- **Cache**: Redis
- **Job Queue**: Bull (Redis-based)
- **API Documentation**: Swagger/OpenAPI 3.0
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Schwab API credentials (for production)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   cd aphelion/backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Run the backend in development mode:**
   ```bash
   npm run dev
   ```

5. **Access the services:**
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs
   - WebSocket: ws://localhost:3001/ws
   - PostgreSQL: localhost:5432
   - TimescaleDB: localhost:5433
   - pgAdmin: http://localhost:5050
   - Redis Commander: http://localhost:8081

### Production Deployment

1. **Build and run with Docker:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Or deploy to your preferred cloud platform**

## API Documentation

Once the backend is running, visit http://localhost:3000/api-docs for interactive API documentation.

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── models/          # Database models
├── services/        # Business logic
├── middlewares/     # Express middlewares
├── routes/          # API routes
├── utils/           # Utility functions
├── scripts/         # Database scripts
├── workers/         # Background workers
└── index.ts         # Application entry point
```

## Key Services

### Schwab Service
- Handles authentication with Schwab API
- Fetches market data, options chains, and account information
- Manages orders and positions

### Recommendation Service
- Integrates with Python scoring engine
- Generates trading recommendations based on multiple factors
- Manages recommendation lifecycle

### News Service
- Aggregates news from multiple sources
- Performs sentiment analysis
- Tracks news relevance to tickers and sectors

### WebSocket Service
- Real-time market data updates
- Live recommendation notifications
- Portfolio updates

## Database Schema

### Core Tables
- `users` - User accounts and authentication
- `tickers` - Stock symbols and metadata
- `recommendations` - Generated trading recommendations
- `option_chains` - Options data snapshots
- `news_articles` - News articles with sentiment
- `portfolios` - User portfolios
- `trades` - Executed trades
- `watchlists` - User watchlists

### Time Series Tables (TimescaleDB)
- `market_data` - Historical price data
- `options_data` - Historical options data
- `recommendation_performance` - Recommendation performance metrics

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Register/Login** to obtain a token
2. **Include token** in Authorization header:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated users**: Higher limits based on subscription tier
- **WebSocket connections**: Separate rate limiting

## WebSocket Events

Connect to `ws://localhost:3001/ws` for real-time updates:

- `market:update` - Real-time market data
- `recommendation:new` - New recommendation generated
- `portfolio:update` - Portfolio value changes
- `news:alert` - Breaking news alerts

## Background Jobs

- **Market data sync**: Hourly sync of ticker data
- **Recommendation generation**: Daily batch recommendations
- **News aggregation**: Continuous news collection
- **Performance analytics**: Daily performance calculations

## Monitoring & Logging

- **Health checks**: `/health` endpoint
- **Logging**: Winston with daily rotation
- **Metrics**: Prometheus metrics endpoint
- **Error tracking**: Structured error logging

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `DB_*` - Database configuration
- `REDIS_*` - Redis configuration
- `JWT_SECRET` - JWT signing secret
- `SCHWAB_API_KEY` - Schwab API credentials
- `NEWS_API_KEY` - News API key

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.