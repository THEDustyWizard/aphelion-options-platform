#!/usr/bin/env python3
"""
APHELION Backend API Integration Module
Quant Rex - Integration with Node.js/TypeScript backend for desktop app
"""

import requests
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BackendAPI:
    """
    Integration with APHELION backend API server.
    Handles communication between Python scoring engine and Node.js backend.
    """
    
    def __init__(self, base_url: str = "http://localhost:3000", 
                 api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        
        # Configure session headers
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'APHELION-Quant-Rex/1.0'
        }
        
        if api_key:
            headers['Authorization'] = f'Bearer {api_key}'
        
        self.session.headers.update(headers)
        
        # API endpoints
        self.endpoints = {
            'health': '/health',
            'recommendations': '/api/v1/recommendations',
            'market_data': '/api/v1/market-data',
            'options_chain': '/api/v1/options-chain',
            'news': '/api/v1/news',
            'backtest': '/api/v1/backtest',
            'portfolio': '/api/v1/portfolio'
        }
        
        logger.info(f"Backend API initialized with base URL: {base_url}")
    
    def check_health(self) -> Dict[str, Any]:
        """
        Check backend API health status.
        """
        try:
            response = self.session.get(
                f"{self.base_url}{self.endpoints['health']}",
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Health check failed: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def get_market_data(self, ticker: str, period: str = '1mo', 
                       interval: str = '1d') -> Optional[Dict[str, Any]]:
        """
        Get market data for a ticker from backend.
        """
        try:
            params = {
                'ticker': ticker,
                'period': period,
                'interval': interval
            }
            
            response = self.session.get(
                f"{self.base_url}{self.endpoints['market_data']}",
                params=params,
                timeout=15
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get market data for {ticker}: {e}")
            return None
    
    def get_options_chain(self, ticker: str, expiration: Optional[str] = None,
                         strike_count: int = 10) -> Optional[Dict[str, Any]]:
        """
        Get options chain data from Schwab API via backend.
        """
        try:
            params = {
                'ticker': ticker,
                'strikeCount': strike_count
            }
            
            if expiration:
                params['expiration'] = expiration
            
            response = self.session.get(
                f"{self.base_url}{self.endpoints['options_chain']}",
                params=params,
                timeout=20
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get options chain for {ticker}: {e}")
            return None
    
    def get_news(self, ticker: Optional[str] = None, 
                sector: Optional[str] = None,
                limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get news articles from backend news service.
        """
        try:
            params = {'limit': limit}
            
            if ticker:
                params['ticker'] = ticker
            if sector:
                params['sector'] = sector
            
            response = self.session.get(
                f"{self.base_url}{self.endpoints['news']}",
                params=params,
                timeout=15
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get('articles', [])
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get news: {e}")
            return []
    
    def get_fundamentals(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get fundamental data for a ticker.
        Note: This might be part of market data or a separate endpoint.
        """
        try:
            # Try to get fundamentals from market data endpoint
            market_data = self.get_market_data(ticker, period='1y', interval='1d')
            if market_data and 'fundamentals' in market_data:
                return market_data['fundamentals']
            
            # Fallback: extract from price data metadata
            if market_data and 'metadata' in market_data:
                return self._extract_fundamentals_from_metadata(market_data['metadata'])
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get fundamentals for {ticker}: {e}")
            return None
    
    def submit_recommendation(self, recommendation: Dict[str, Any]) -> bool:
        """
        Submit a generated recommendation to the backend.
        """
        try:
            # Add timestamp if not present
            if 'generated_at' not in recommendation:
                recommendation['generated_at'] = datetime.now().isoformat()
            
            # Add source identifier
            recommendation['source'] = 'quant_rex_engine'
            
            response = self.session.post(
                f"{self.base_url}{self.endpoints['recommendations']}",
                json=recommendation,
                timeout=15
            )
            response.raise_for_status()
            
            logger.info(f"Recommendation submitted for {recommendation.get('ticker')}")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to submit recommendation: {e}")
            return False
    
    def submit_backtest_results(self, backtest_id: str, 
                               results: Dict[str, Any]) -> bool:
        """
        Submit backtest results to backend.
        """
        try:
            payload = {
                'backtest_id': backtest_id,
                'results': results,
                'completed_at': datetime.now().isoformat()
            }
            
            response = self.session.post(
                f"{self.base_url}{self.endpoints['backtest']}",
                json=payload,
                timeout=20
            )
            response.raise_for_status()
            
            logger.info(f"Backtest results submitted: {backtest_id}")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to submit backtest results: {e}")
            return False
    
    def get_portfolio_snapshot(self) -> Optional[Dict[str, Any]]:
        """
        Get current portfolio snapshot from backend.
        """
        try:
            response = self.session.get(
                f"{self.base_url}{self.endpoints['portfolio']}/snapshot",
                timeout=15
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get portfolio snapshot: {e}")
            return None
    
    def update_portfolio_position(self, ticker: str, position_data: Dict[str, Any]) -> bool:
        """
        Update portfolio position (for simulated trading).
        """
        try:
            payload = {
                'ticker': ticker,
                'position': position_data,
                'updated_at': datetime.now().isoformat()
            }
            
            response = self.session.put(
                f"{self.base_url}{self.endpoints['portfolio']}/position",
                json=payload,
                timeout=15
            )
            response.raise_for_status()
            
            logger.info(f"Portfolio position updated for {ticker}")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to update portfolio position for {ticker}: {e}")
            return False
    
    def stream_recommendations(self, callback, interval: int = 300):
        """
        Stream recommendations at regular intervals.
        For real-time integration with desktop app.
        """
        logger.info(f"Starting recommendation stream (interval: {interval}s)")
        
        try:
            while True:
                # Check for new data
                health = self.check_health()
                if health.get('status') != 'healthy':
                    logger.warning("Backend not healthy, waiting...")
                    time.sleep(60)
                    continue
                
                # Get latest market data and generate recommendations
                # This would be implemented based on specific streaming logic
                
                time.sleep(interval)
                
        except KeyboardInterrupt:
            logger.info("Recommendation stream stopped")
        except Exception as e:
            logger.error(f"Error in recommendation stream: {e}")
    
    def _extract_fundamentals_from_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract fundamental data from market data metadata.
        """
        fundamentals = {
            'pe_ratio': metadata.get('peRatio', 0),
            'market_cap': metadata.get('marketCap', 0),
            'dividend_yield': metadata.get('dividendYield', 0),
            'beta': metadata.get('beta', 1.0),
            'volume_avg': metadata.get('averageVolume', 0),
            'high_52w': metadata.get('fiftyTwoWeekHigh', 0),
            'low_52w': metadata.get('fiftyTwoWeekLow', 0)
        }
        
        return fundamentals
    
    def batch_process_tickers(self, tickers: List[str], 
                             sector_map: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Batch process multiple tickers for efficiency.
        """
        recommendations = []
        
        for ticker in tickers:
            try:
                sector = sector_map.get(ticker, 'unknown')
                
                # Get data for this ticker
                market_data = self.get_market_data(ticker)
                fundamentals = self.get_fundamentals(ticker)
                news = self.get_news(ticker=ticker, sector=sector)
                options_chain = self.get_options_chain(ticker)
                
                if not market_data:
                    logger.warning(f"No market data for {ticker}, skipping")
                    continue
                
                # Here you would call your scoring engine
                # For now, create a placeholder recommendation
                recommendation = {
                    'ticker': ticker,
                    'sector': sector,
                    'current_price': market_data.get('current_price', 0),
                    'confidence': 50,  # Placeholder
                    'strategy': 'Long Call',  # Placeholder
                    'generated_at': datetime.now().isoformat()
                }
                
                recommendations.append(recommendation)
                
                # Submit to backend
                self.submit_recommendation(recommendation)
                
                # Small delay to avoid rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error processing {ticker}: {e}")
                continue
        
        return recommendations
    
    def close(self):
        """
        Clean up resources.
        """
        self.session.close()
        logger.info("Backend API connection closed")


# Example usage
if __name__ == "__main__":
    # Initialize API client
    api = BackendAPI(base_url="http://localhost:3000")
    
    # Check health
    health = api.check_health()
    print(f"Backend health: {health}")
    
    # Get market data for a ticker
    market_data = api.get_market_data("AAPL")
    if market_data:
        print(f"Got market data for AAPL: {len(market_data.get('candles', []))} candles")
    
    # Get options chain
    options_chain = api.get_options_chain("AAPL")
    if options_chain:
        print(f"Got options chain for AAPL")
    
    # Submit a test recommendation
    test_rec = {
        'ticker': 'TEST',
        'sector': 'technology',
        'confidence': 75,
        'strategy': 'Long Call',
        'expiration_days': 30,
        'strike_price': 150.0,
        'current_price': 145.0,
        'rationale': 'Test recommendation from Quant Rex'
    }
    
    success = api.submit_recommendation(test_rec)
    print(f"Recommendation submitted: {success}")
    
    # Clean up
    api.close()