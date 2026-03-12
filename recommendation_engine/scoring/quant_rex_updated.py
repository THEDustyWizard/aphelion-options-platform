#!/usr/bin/env python3
"""
APHELION 5-Factor Scoring Algorithm - Quant Rex Update
Updated for Schwab API integration and sector-specific adaptations
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging
from dataclasses import dataclass
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SectorConfig:
    """Configuration for sector-specific scoring."""
    name: str
    etf: str
    key_metrics: List[str]
    technical_weight: float = 0.3
    fundamental_weight: float = 0.25
    sentiment_weight: float = 0.2
    sector_weight: float = 0.15
    flow_weight: float = 0.1
    volatility_adjustment: float = 1.0
    risk_tolerance: float = 1.0

class APHELIONScoringEngine:
    """
    5-Factor Scoring Engine for APHELION Options Platform
    Updated for Schwab API integration and sector-specific adaptations
    """
    
    def __init__(self):
        # Default weights (can be overridden by sector configs)
        self.default_weights = {
            'technical': 0.3,
            'fundamental': 0.25,
            'sentiment': 0.2,
            'sector': 0.15,
            'flow': 0.1
        }
        
        # Sector-specific configurations
        self.sector_configs = {
            'defense': SectorConfig(
                name='defense',
                etf='ITA',
                key_metrics=['contract_backlog', 'government_spending', 'geopolitical_risk'],
                technical_weight=0.25,
                fundamental_weight=0.35,
                sentiment_weight=0.15,
                sector_weight=0.15,
                flow_weight=0.1,
                volatility_adjustment=0.8,  # Lower volatility in defense
                risk_tolerance=0.7
            ),
            'energy': SectorConfig(
                name='energy',
                etf='XLE',
                key_metrics=['oil_price', 'production_costs', 'reserves', 'refining_margins'],
                technical_weight=0.35,
                fundamental_weight=0.3,
                sentiment_weight=0.15,
                sector_weight=0.1,
                flow_weight=0.1,
                volatility_adjustment=1.3,  # Higher volatility in energy
                risk_tolerance=1.2
            ),
            'logistics': SectorConfig(
                name='logistics',
                etf='XLI',
                key_metrics=['shipping_rates', 'inventory_levels', 'fuel_costs', 'demand_forecast'],
                technical_weight=0.3,
                fundamental_weight=0.25,
                sentiment_weight=0.2,
                sector_weight=0.15,
                flow_weight=0.1,
                volatility_adjustment=1.0,
                risk_tolerance=1.0
            ),
            'medical': SectorConfig(
                name='medical',
                etf='XLV',
                key_metrics=['fda_approvals', 'clinical_trials', 'reimbursement_rates', 'pipeline_strength'],
                technical_weight=0.25,
                fundamental_weight=0.3,
                sentiment_weight=0.25,
                sector_weight=0.1,
                flow_weight=0.1,
                volatility_adjustment=1.1,
                risk_tolerance=0.9
            )
        }
        
        # Greeks calculation parameters
        self.risk_free_rate = 0.045  # 4.5% risk-free rate
        self.days_per_year = 252
        
        logger.info("APHELION Scoring Engine initialized with sector-specific configurations")
    
    def calculate_total_score(self, ticker: str, sector: str, 
                             price_data: pd.DataFrame, 
                             fundamentals: Dict,
                             news_items: List[Dict],
                             sector_data: pd.DataFrame,
                             options_flow: List[Dict],
                             options_chain: Optional[Dict] = None) -> Dict[str, float]:
        """
        Calculate all 5 scores with sector-specific adaptations.
        
        Args:
            ticker: Stock ticker symbol
            sector: Sector classification
            price_data: Ticker price data
            fundamentals: Fundamental metrics
            news_items: News articles
            sector_data: Sector ETF data
            options_flow: Options flow data
            options_chain: Options chain data from Schwab API
            
        Returns:
            Dictionary with all scores and total
        """
        # Get sector configuration
        sector_config = self.sector_configs.get(sector, None)
        weights = self.default_weights.copy()
        
        if sector_config:
            # Use sector-specific weights
            weights = {
                'technical': sector_config.technical_weight,
                'fundamental': sector_config.fundamental_weight,
                'sentiment': sector_config.sentiment_weight,
                'sector': sector_config.sector_weight,
                'flow': sector_config.flow_weight
            }
        
        scores = {}
        
        # Calculate individual scores with sector adjustments
        scores['technical'] = self.calculate_technical_score(ticker, price_data, sector_config)
        scores['fundamental'] = self.calculate_fundamental_score(ticker, sector, fundamentals, sector_config)
        scores['sentiment'] = self.calculate_sentiment_score(ticker, sector, news_items, sector_config)
        scores['sector'] = self.calculate_sector_momentum_score(ticker, sector, price_data, sector_data, sector_config)
        scores['flow'] = self.calculate_options_flow_score(ticker, options_flow, sector_config)
        
        # Calculate Greeks if options chain is available
        if options_chain:
            scores['greeks'] = self.calculate_greeks_score(options_chain)
        
        # Calculate weighted total
        total_score = sum(scores[component] * weights[component] 
                         for component in weights)
        
        # Apply sector volatility adjustment
        if sector_config:
            total_score = self._apply_volatility_adjustment(total_score, sector_config)
        
        scores['total'] = total_score
        
        # Calculate risk metrics
        scores['risk_metrics'] = self.calculate_risk_metrics(
            ticker, price_data, scores, sector_config
        )
        
        logger.info(f"Total score for {ticker} ({sector}): {total_score:.1f}")
        return scores
    
    def calculate_technical_score(self, ticker: str, price_data: pd.DataFrame, 
                                 sector_config: Optional[SectorConfig] = None) -> float:
        """
        Calculate technical analysis score with sector-specific adjustments.
        """
        if price_data.empty or len(price_data) < 20:
            return 50.0
        
        try:
            close_prices = price_data['Close']
            current_price = close_prices.iloc[-1]
            
            # Calculate indicators
            rsi = self._calculate_rsi(close_prices)
            macd_signal = self._calculate_macd_signal(close_prices)
            atr_pct = self._calculate_atr_percentage(price_data)
            bollinger_position = self._calculate_bollinger_position(close_prices)
            
            # Calculate moving averages
            sma_20 = close_prices.rolling(window=20).mean().iloc[-1]
            sma_50 = close_prices.rolling(window=50).mean().iloc[-1]
            sma_200 = close_prices.rolling(window=200).mean().iloc[-1]
            
            # Score components (0-100 scale)
            rsi_score = self._score_rsi(rsi)
            trend_score = self._score_trend(sma_20, sma_50, sma_200, current_price)
            volatility_score = self._score_volatility(atr_pct, sector_config)
            momentum_score = self._score_momentum(macd_signal, bollinger_position)
            
            # Weighted average
            technical_score = (
                rsi_score * 0.25 +
                trend_score * 0.35 +
                volatility_score * 0.20 +
                momentum_score * 0.20
            )
            
            return max(0, min(100, technical_score))
            
        except Exception as e:
            logger.error(f"Error calculating technical score for {ticker}: {e}")
            return 50.0
    
    def calculate_fundamental_score(self, ticker: str, sector: str, 
                                   fundamentals: Dict, 
                                   sector_config: Optional[SectorConfig] = None) -> float:
        """
        Calculate fundamental analysis score with sector-specific metrics.
        """
        if not fundamentals:
            return 50.0
        
        try:
            # Extract fundamental metrics
            pe_ratio = fundamentals.get('pe_ratio', 0)
            eps_growth = fundamentals.get('eps_growth', 0)
            revenue_growth = fundamentals.get('revenue_growth', 0)
            profit_margin = fundamentals.get('profit_margin', 0)
            debt_to_equity = fundamentals.get('debt_to_equity', 0)
            roe = fundamentals.get('return_on_equity', 0)
            
            # Get sector averages
            sector_avg_pe = self._get_sector_average_pe(sector)
            sector_avg_roe = self._get_sector_average_roe(sector)
            
            # Score components
            valuation_score = self._score_valuation(pe_ratio, sector_avg_pe)
            growth_score = self._score_growth(eps_growth, revenue_growth)
            profitability_score = self._score_profitability(profit_margin, roe, sector_avg_roe)
            financial_health_score = self._score_financial_health(debt_to_equity)
            
            # Sector-specific adjustments
            sector_adjustment = 1.0
            if sector_config:
                # Check sector-specific key metrics
                sector_metrics_score = self._score_sector_metrics(fundamentals, sector_config)
                sector_adjustment = 0.8 + (sector_metrics_score / 100) * 0.4
            
            # Weighted average
            fundamental_score = (
                valuation_score * 0.30 +
                growth_score * 0.25 +
                profitability_score * 0.25 +
                financial_health_score * 0.20
            ) * sector_adjustment
            
            return max(0, min(100, fundamental_score))
            
        except Exception as e:
            logger.error(f"Error calculating fundamental score for {ticker}: {e}")
            return 50.0
    
    def calculate_sentiment_score(self, ticker: str, sector: str, 
                                 news_items: List[Dict], 
                                 sector_config: Optional[SectorConfig] = None) -> float:
        """
        Calculate sentiment analysis score with sector-specific adjustments.
        """
        if not news_items:
            return 50.0
        
        try:
            sentiment_scores = []
            relevance_scores = []
            
            for news in news_items:
                # Analyze sentiment
                sentiment = self._analyze_sentiment(news)
                
                # Calculate relevance
                relevance = self._calculate_relevance(news, ticker, sector)
                
                if relevance > 0.3:  # Only include relevant news
                    sentiment_scores.append(sentiment)
                    relevance_scores.append(relevance)
            
            if not sentiment_scores:
                return 50.0
            
            # Weighted average by relevance
            weighted_sentiment = sum(
                s * r for s, r in zip(sentiment_scores, relevance_scores)
            ) / sum(relevance_scores)
            
            # Convert from -1 to 1 scale to 0-100 scale
            sentiment_score = 50 + (weighted_sentiment * 50)
            
            # Sector-specific adjustment
            if sector_config:
                # Some sectors are more sentiment-driven
                sentiment_score = sentiment_score * (0.9 + sector_config.sentiment_weight * 0.2)
            
            return max(0, min(100, sentiment_score))
            
        except Exception as e:
            logger.error(f"Error calculating sentiment score for {ticker}: {e}")
            return 50.0
    
    def calculate_sector_momentum_score(self, ticker: str, sector: str,
                                       price_data: pd.DataFrame,
                                       sector_data: pd.DataFrame,
                                       sector_config: Optional[SectorConfig] = None) -> float:
        """
        Calculate sector momentum and relative strength score.
        """
        if price_data.empty or sector_data.empty:
            return 50.0
        
        try:
            ticker_returns = self._calculate_returns(price_data, periods=[5, 20, 60])
            sector_returns = self._calculate_returns(sector_data, periods=[5, 20, 60])
            
            # Calculate relative strength
            relative_strength = {}
            for period in [5, 20, 60]:
                if period in ticker_returns and period in sector_returns:
                    relative_strength[period] = ticker_returns[period] - sector_returns[period]
            
            # Score based on relative strength
            rs_score = self._score_relative_strength(relative_strength)
            
            # Sector momentum score
            sector_momentum = self._calculate_sector_momentum(sector_data)
            momentum_score = self._score_momentum_trend(sector_momentum)
            
            # Combined score
            sector_score = (rs_score * 0.6 + momentum_score * 0.4)
            
            return max(0, min(100, sector_score))
            
        except Exception as e:
            logger.error(f"Error calculating sector score for {ticker}: {e}")
            return 50.0
    
    def calculate_options_flow_score(self, ticker: str, options_flow: List[Dict],
                                    sector_config: Optional[SectorConfig] = None) -> float:
        """
        Calculate options flow analysis score.
        """
        if not options_flow:
            return 50.0
        
        try:
            # Analyze options flow
            flow_analysis = self._analyze_options_flow(options_flow)
            
            # Calculate flow score
            volume_score = self._score_flow_volume(flow_analysis['total_volume'])
            unusual_score = self._score_unusual_activity(flow_analysis['unusual_volume'])
            sentiment_score = self._score_flow_sentiment(flow_analysis['sentiment'])
            
            # Weighted average
            flow_score = (
                volume_score * 0.4 +
                unusual_score * 0.3 +
                sentiment_score * 0.3
            )
            
            # Sector adjustment for flow sensitivity
            if sector_config:
                flow_score = flow_score * (0.8 + sector_config.flow_weight * 0.4)
            
            return max(0, min(100, flow_score))
            
        except Exception as e:
            logger.error(f"Error calculating options flow score for {ticker}: {e}")
            return 50.0
    
    def calculate_greeks_score(self, options_chain: Dict) -> Dict[str, float]:
        """
        Calculate Greeks and options pricing metrics.
        """
        try:
            # Extract option data
            calls = options_chain.get('callExpDateMap', {})
            puts = options_chain.get('putExpDateMap', {})
            
            # Calculate Greeks for ATM options
            atm_greeks = self._calculate_atm_greeks(calls, puts, options_chain.get('underlyingPrice', 0))
            
            # Score Greeks
            delta_score = self._score_greek('delta', atm_greeks.get('delta', 0))
            gamma_score = self._score_greek('gamma', atm_greeks.get('gamma', 0))
            theta_score = self._score_greek('theta', atm_greeks.get('theta', 0))
            vega_score = self._score_greek('vega', atm_greeks.get('vega', 0))
            
            # Calculate implied volatility metrics
            iv_metrics = self._calculate_iv_metrics(calls, puts)
            
            return {
                'delta': delta_score,
                'gamma': gamma_score,
                'theta': theta_score,
                'vega': vega_score,
                'iv_percentile': iv_metrics.get('iv_percentile', 50),
                'iv_rank': iv_metrics.get('iv_rank', 50),
                'skew': iv_metrics.get('skew', 0)
            }
            
        except Exception as e:
            logger.error(f"Error calculating Greeks: {e}")
            return {
                'delta': 50,
                'gamma': 50,
                'theta': 50,
                'vega': 50,
                'iv_percentile': 50,
                'iv_rank': 50,
                'skew': 0
            }
    
    def calculate_risk_metrics(self, ticker: str, price_data: pd.DataFrame,
                              scores: Dict[str, float],
                              sector_config: Optional[SectorConfig] = None) -> Dict[str, float]:
        """
        Calculate comprehensive risk metrics.
        """
        try:
            if price_data.empty:
                return {
                    'value_at_risk': 0,
                    'expected_shortfall': 0,
                    'beta': 1.0,
                    'sharpe_ratio': 0,
                    'max_drawdown': 0,
                    'volatility': 0
                }
            
            returns = price_data['Close'].pct_change().dropna()
            
            # Calculate risk metrics
            var_95 = self._calculate_var(returns, confidence=0.95)
            expected_shortfall = self._calculate_expected_shortfall(returns, confidence=0.95)
            volatility = returns.std() * np.sqrt(self.days_per_year)
            sharpe_ratio = self._calculate_sharpe_ratio(returns)
            max_drawdown = self._calculate_max_drawdown(price_data['Close'])
            
            # Sector-adjusted risk tolerance
            risk_tolerance = 1.0
            if sector_config:
                risk_tolerance = sector_config.risk_tolerance
            
            # Beta calculation (simplified)
            beta = self._calculate_beta(returns, returns)
            
            return {
                'value_at_risk': var_95 * 100,  # Convert to percentage
                'expected_shortfall': expected_shortfall * 100,
                'beta': beta,
                'sharpe_ratio': sharpe_ratio,
                'max_drawdown': max_drawdown * 100,
                'volatility': volatility * 100,
                'risk_tolerance_adjusted': risk_tolerance
            }
            
        except Exception as e:
            logger.error(f"Error calculating risk metrics for {ticker}: {e}")
            return {
                'value_at_risk': 0,
                'expected_shortfall': 0,
                'beta': 1.0,
                'sharpe_ratio': 0,
                'max_drawdown': 0,
                'volatility': 0,
                'risk_tolerance_adjusted': 1.0
            }
    
    # Helper methods for scoring components
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> float:
        """Calculate RSI indicator."""
        if len(prices) < period:
            return 50.0
        
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50.0
    
    def _calculate_macd_signal(self, prices: pd.Series) -> float:
        """Calculate MACD signal line."""
        if len(prices) < 26:
            return 0.0
        
        exp1 = prices.ewm(span=12, adjust=False).mean()
        exp2 = prices.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        
        return (macd.iloc[-1] - signal.iloc[-1]) / prices.iloc[-1] * 100
    
    def _calculate_atr_percentage(self, price_data: pd.DataFrame, period: int = 14) -> float:
        """Calculate ATR as percentage of price."""
        if len(price_data) < period:
            return 0.0
        
        high_low = price_data['High'] - price_data['Low']
        high_close = abs(price_data['High'] - price_data['Close'].shift())
        low_close = abs(price_data['Low'] - price_data['Close'].shift())
        
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        
        return (atr.iloc[-1] / price_data['Close'].iloc[-1] * 100) if not pd.isna(atr.iloc[-1]) else 0.0
    
    def _calculate_bollinger_position(self, prices: pd.Series, period: int = 20) -> float:
        """Calculate position within Bollinger Bands."""
        if len(prices) < period:
            return 0.0
        
        sma = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        
        upper_band = sma + (std * 2)
        lower_band = sma - (std * 2)
        
        current_price = prices.iloc[-1]
        band_width = upper_band.iloc[-1] - lower_band.iloc[-1]
        
        if band_width > 0:
            position = (current_price - lower_band.iloc[-1]) / band_width * 100
            return max(0, min(100, position))
        
        return 50.0
    
    def _score_rsi(self, rsi: float) -> float:
        """Score RSI value (0-100)."""
        if 30 <= rsi <= 70:
            return 80.0
        elif 20 <= rsi < 30 or 70 < rsi <= 80:
            return 60.0
        elif rsi < 20 or rsi > 80:
            return 40.0
        else:
            return 50.0
    
    def _score_trend(self, sma_20: float, sma_50: float, sma_200: float, current_price: float) -> float:
        """Score trend strength and direction."""
        score = 50.0
        
        # Golden cross/death cross
        if sma_20 > sma_50 > sma_200:
            score += 20  # Strong uptrend
        elif sma_20 < sma_50 < sma_200:
            score -= 20  # Strong downtrend
        
        # Price relative to moving averages
        if current_price > sma_20 > sma_50:
            score += 15
        elif current_price < sma_20 < sma_50:
            score -= 15
        
        return max(0, min(100, score))
    
    def _score_volatility(self, atr_pct: float, sector_config: Optional[SectorConfig]) -> float:
        """Score volatility (lower is better for most strategies)."""
        if atr_pct == 0:
            return 50.0
        
        # Adjust threshold based on sector
        threshold = 2.0  # Default 2% ATR
        if sector_config:
            threshold *= sector_config.volatility_adjustment
        
        if atr_pct <= threshold:
            return 80.0
        elif atr_pct <= threshold * 1.5:
            return 60.0
        elif atr_pct <= threshold * 2:
            return 40.0
        else:
            return 20.0
    
    def _score_momentum(self, macd_signal: float, bollinger_position: float) -> float:
        """Score momentum indicators."""
        score = 50.0
        
        # MACD signal
        if macd_signal > 0.5:
            score += 15
        elif macd_signal < -0.5:
            score -= 15
        
        # Bollinger position (middle is neutral)
        if 40 <= bollinger_position <= 60:
            score += 5  # Not at extremes
        elif bollinger_position > 80 or bollinger_position < 20:
            score -= 10  # At extremes
        
        return max(0, min(100, score))
    
    def _get_sector_average_pe(self, sector: str) -> float:
        """Get sector average P/E ratio."""
        sector_pe = {
            'defense': 18.0,
            'energy': 12.0,
            'logistics': 16.0,
            'medical': 22.0,
            'technology': 25.0,
            'financial': 14.0
        }
        return sector_pe.get(sector, 15.0)
    
    def _get_sector_average_roe(self, sector: str) -> float:
        """Get sector average ROE."""
        sector_roe = {
            'defense': 0.20,
            'energy': 0.15,
            'logistics': 0.12,
            'medical': 0.18,
            'technology': 0.22,
            'financial': 0.10
        }
        return sector_roe.get(sector, 0.15)
    
    def _score_valuation(self, pe_ratio: float, sector_avg_pe: float) -> float:
        """Score valuation metrics."""
        if pe_ratio <= 0:
            return 50.0
        
        pe_ratio_vs_sector = pe_ratio / sector_avg_pe
        
        if pe_ratio_vs_sector < 0.8:
            return 90.0  # Undervalued
        elif pe_ratio_vs_sector < 1.0:
            return 75.0  # Slightly undervalued
        elif pe_ratio_vs_sector < 1.2:
            return 60.0  # Fairly valued
        elif pe_ratio_vs_sector < 1.5:
            return 40.0  # Overvalued
        else:
            return 20.0  # Highly overvalued
    
    def _score_growth(self, eps_growth: float, revenue_growth: float) -> float:
        """Score growth metrics."""
        avg_growth = (eps_growth + revenue_growth) / 2
        
        if avg_growth >= 0.20:
            return 90.0
        elif avg_growth >= 0.10:
            return 75.0
        elif avg_growth >= 0.05:
            return 60.0
        elif avg_growth >= 0.0:
            return 50.0
        elif avg_growth >= -0.05:
            return 40.0
        else:
            return 20.0
    
    def _score_profitability(self, profit_margin: float, roe: float, sector_avg_roe: float) -> float:
        """Score profitability metrics."""
        margin_score = min(100, profit_margin * 500)  # Convert to 0-100 scale
        
        roe_vs_sector = roe / sector_avg_roe if sector_avg_roe > 0 else 1.0
        roe_score = 50.0
        if roe_vs_sector > 1.5:
            roe_score = 90.0
        elif roe_vs_sector > 1.2:
            roe_score = 75.0
        elif roe_vs_sector > 1.0:
            roe_score = 60.0
        elif roe_vs_sector > 0.8:
            roe_score = 50.0
        else:
            roe_score = 30.0
        
        return (margin_score * 0.4 + roe_score * 0.6)
    
    def _score_financial_health(self, debt_to_equity: float) -> float:
        """Score financial health (debt levels)."""
        if debt_to_equity <= 0.5:
            return 90.0
        elif debt_to_equity <= 1.0:
            return 75.0
        elif debt_to_equity <= 1.5:
            return 60.0
        elif debt_to_equity <= 2.0:
            return 40.0
        else:
            return 20.0
    
    def _score_sector_metrics(self, fundamentals: Dict, sector_config: SectorConfig) -> float:
        """Score sector-specific key metrics."""
        score = 50.0
        
        for metric in sector_config.key_metrics:
            value = fundamentals.get(metric, 0)
            
            # Simple scoring based on metric type
            if 'growth' in metric or 'increase' in metric:
                if value > 0.05:
                    score += 10
                elif value > 0:
                    score += 5
            elif 'risk' in metric:
                if value < 0.3:
                    score += 10
                elif value < 0.5:
                    score += 5
        
        return max(0, min(100, score))
    
    def _analyze_sentiment(self, news_item: Dict) -> float:
        """Analyze sentiment of a news article."""
        # Simple sentiment analysis
        title = news_item.get('title', '').lower()
        content = news_item.get('content', '').lower()
        
        positive_words = ['beat', 'strong', 'growth', 'increase', 'profit', 'gain', 'bullish']
        negative_words = ['miss', 'weak', 'decline', 'decrease', 'loss', 'bearish', 'cut']
        
        sentiment = 0.0
        text = title + ' ' + content
        
        for word in positive_words:
            if word in text:
                sentiment += 0.1
        
        for word in negative_words:
            if word in text:
                sentiment -= 0.1
        
        return max(-1.0, min(1.0, sentiment))
    
    def _calculate_relevance(self, news_item: Dict, ticker: str, sector: str) -> float:
        """Calculate relevance of news to ticker/sector."""
        title = news_item.get('title', '').lower()
        content = news_item.get('content', '').lower()
        
        relevance = 0.0
        
        # Check for ticker mention
        if ticker.lower() in title or ticker.lower() in content:
            relevance += 0.5
        
        # Check for sector keywords
        sector_keywords = {
            'defense': ['defense', 'military', 'contract', 'pentagon', 'weapon'],
            'energy': ['oil', 'gas', 'energy', 'drilling', 'refinery'],
            'logistics': ['shipping', 'transport', 'logistics', 'supply chain'],
            'medical': ['medical', 'health', 'fda', 'drug', 'treatment']
        }
        
        keywords = sector_keywords.get(sector, [])
        for keyword in keywords:
            if keyword in title or keyword in content:
                relevance += 0.3
                break
        
        return min(1.0, relevance)
    
    def _calculate_returns(self, price_data: pd.DataFrame, periods: List[int]) -> Dict[int, float]:
        """Calculate returns over different periods."""
        returns = {}
        close_prices = price_data['Close']
        
        for period in periods:
            if len(close_prices) > period:
                returns[period] = (close_prices.iloc[-1] / close_prices.iloc[-period] - 1) * 100
        
        return returns
    
    def _score_relative_strength(self, relative_strength: Dict[int, float]) -> float:
        """Score relative strength vs sector."""
        if not relative_strength:
            return 50.0
        
        avg_rs = sum(relative_strength.values()) / len(relative_strength)
        
        if avg_rs > 5:
            return 90.0
        elif avg_rs > 2:
            return 75.0
        elif avg_rs > 0:
            return 60.0
        elif avg_rs > -2:
            return 50.0
        elif avg_rs > -5:
            return 40.0
        else:
            return 20.0
    
    def _calculate_sector_momentum(self, sector_data: pd.DataFrame) -> float:
        """Calculate sector momentum."""
        if len(sector_data) < 20:
            return 0.0
        
        close_prices = sector_data['Close']
        sma_20 = close_prices.rolling(window=20).mean()
        
        return ((close_prices.iloc[-1] / sma_20.iloc[-1] - 1) * 100) if not pd.isna(sma_20.iloc[-1]) else 0.0
    
    def _score_momentum_trend(self, sector_momentum: float) -> float:
        """Score sector momentum trend."""
        if sector_momentum > 5:
            return 90.0
        elif sector_momentum > 2:
            return 75.0
        elif sector_momentum > 0:
            return 60.0
        elif sector_momentum > -2:
            return 50.0
        elif sector_momentum > -5:
            return 40.0
        else:
            return 20.0
    
    def _analyze_options_flow(self, options_flow: List[Dict]) -> Dict[str, float]:
        """Analyze options flow data."""
        total_volume = 0
        unusual_volume = 0
        call_volume = 0
        put_volume = 0
        
        for flow in options_flow:
            volume = flow.get('volume', 0)
            total_volume += volume
            
            if flow.get('unusual', False):
                unusual_volume += volume
            
            if flow.get('option_type', '').lower() == 'call':
                call_volume += volume
            elif flow.get('option_type', '').lower() == 'put':
                put_volume += volume
        
        # Calculate sentiment (call/put ratio)
        sentiment = 0.0
        if total_volume > 0:
            sentiment = (call_volume - put_volume) / total_volume
        
        return {
            'total_volume': total_volume,
            'unusual_volume': unusual_volume,
            'sentiment': sentiment,
            'call_put_ratio': call_volume / put_volume if put_volume > 0 else float('inf')
        }
    
    def _score_flow_volume(self, total_volume: float) -> float:
        """Score options flow volume."""
        if total_volume > 10000:
            return 90.0
        elif total_volume > 5000:
            return 75.0
        elif total_volume > 1000:
            return 60.0
        elif total_volume > 100:
            return 50.0
        else:
            return 30.0
    
    def _score_unusual_activity(self, unusual_volume: float) -> float:
        """Score unusual options activity."""
        if unusual_volume > 5000:
            return 90.0
        elif unusual_volume > 2000:
            return 75.0
        elif unusual_volume > 500:
            return 60.0
        elif unusual_volume > 100:
            return 50.0
        else:
            return 30.0
    
    def _score_flow_sentiment(self, sentiment: float) -> float:
        """Score options flow sentiment."""
        if sentiment > 0.5:
            return 90.0  # Very bullish
        elif sentiment > 0.2:
            return 75.0  # Bullish
        elif sentiment > -0.2:
            return 60.0  # Neutral
        elif sentiment > -0.5:
            return 40.0  # Bearish
        else:
            return 20.0  # Very bearish
    
    def _calculate_atm_greeks(self, calls: Dict, puts: Dict, underlying_price: float) -> Dict[str, float]:
        """Calculate Greeks for at-the-money options."""
        # Simplified Greeks calculation
        # In production, would use proper options pricing model
        
        # Find ATM strike (closest to underlying price)
        atm_strike = self._find_atm_strike(calls, puts, underlying_price)
        
        # Simplified Greeks (for demonstration)
        delta = 0.5  # ATM options have ~0.5 delta
        gamma = 0.05  # Gamma peaks at ATM
        theta = -0.03  # Time decay
        vega = 0.12  # Vega peaks at ATM
        
        return {
            'delta': delta,
            'gamma': gamma,
            'theta': theta,
            'vega': vega
        }
    
    def _find_atm_strike(self, calls: Dict, puts: Dict, underlying_price: float) -> float:
        """Find at-the-money strike price."""
        # Simplified implementation
        return round(underlying_price / 5) * 5  # Round to nearest $5
    
    def _calculate_iv_metrics(self, calls: Dict, puts: Dict) -> Dict[str, float]:
        """Calculate implied volatility metrics."""
        # Simplified IV calculation
        return {
            'iv_percentile': 65.0,  # IV percentile
            'iv_rank': 70.0,  # IV rank
            'skew': 0.05  # Volatility skew
        }
    
    def _score_greek(self, greek_name: str, value: float) -> float:
        """Score individual Greek value."""
        # Simplified scoring based on typical ranges
        if greek_name == 'delta':
            if 0.4 <= value <= 0.6:
                return 80.0  # Good for directional plays
            elif 0.2 <= value <= 0.8:
                return 60.0
            else:
                return 40.0
        
        elif greek_name == 'gamma':
            if 0.03 <= value <= 0.07:
                return 80.0  # Moderate gamma
            elif value <= 0.1:
                return 60.0
            else:
                return 40.0
        
        elif greek_name == 'theta':
            if -0.02 <= value <= -0.05:
                return 80.0  # Reasonable time decay
            elif value > -0.02:
                return 90.0  # Low time decay
            else:
                return 40.0  # High time decay
        
        elif greek_name == 'vega':
            if 0.08 <= value <= 0.15:
                return 80.0  # Good vega exposure
            elif value <= 0.2:
                return 60.0
            else:
                return 40.0
        
        return 50.0
    
    def _calculate_var(self, returns: pd.Series, confidence: float = 0.95) -> float:
        """Calculate Value at Risk."""
        if len(returns) == 0:
            return 0.0
        
        return np.percentile(returns, (1 - confidence) * 100)
    
    def _calculate_expected_shortfall(self, returns: pd.Series, confidence: float = 0.95) -> float:
        """Calculate Expected Shortfall (CVaR)."""
        if len(returns) == 0:
            return 0.0
        
        var = self._calculate_var(returns, confidence)
        tail_returns = returns[returns <= var]
        
        return tail_returns.mean() if len(tail_returns) > 0 else var
    
    def _calculate_sharpe_ratio(self, returns: pd.Series) -> float:
        """Calculate Sharpe ratio."""
        if len(returns) == 0 or returns.std() == 0:
            return 0.0
        
        return (returns.mean() * self.days_per_year) / (returns.std() * np.sqrt(self.days_per_year))
    
    def _calculate_max_drawdown(self, prices: pd.Series) -> float:
        """Calculate maximum drawdown."""
        if len(prices) == 0:
            return 0.0
        
        peak = prices.expanding(min_periods=1).max()
        drawdown = (peak - prices) / peak
        
        return drawdown.max()
    
    def _calculate_beta(self, stock_returns: pd.Series, market_returns: pd.Series) -> float:
        """Calculate beta vs market/sector."""
        if len(stock_returns) < 2 or len(market_returns) < 2:
            return 1.0
        
        # Align returns
        aligned_returns = pd.concat([stock_returns, market_returns], axis=1).dropna()
        if len(aligned_returns) < 2:
            return 1.0
        
        stock = aligned_returns.iloc[:, 0]
        market = aligned_returns.iloc[:, 1]
        
        # Calculate beta
        covariance = stock.cov(market)
        market_variance = market.var()
        
        return covariance / market_variance if market_variance > 0 else 1.0
    
    def _apply_volatility_adjustment(self, score: float, sector_config: SectorConfig) -> float:
        """Apply sector-specific volatility adjustment to score."""
        adjustment = sector_config.volatility_adjustment
        
        if adjustment > 1.0:
            # High volatility sectors get penalty
            return score * (2.0 - adjustment)
        else:
            # Low volatility sectors get boost
            return score * (1.0 + (1.0 - adjustment) * 0.5)


# Example usage
if __name__ == "__main__":
    # Initialize scoring engine
    engine = APHELIONScoringEngine()
    
    print("APHELION 5-Factor Scoring Engine - Quant Rex Update")
    print("=" * 60)
    print(f"Sectors configured: {list(engine.sector_configs.keys())}")
    print(f"Default weights: {engine.default_weights}")
    print("\nReady for integration with:")
    print("1. Backend API server")
    print("2. Desktop application")
    print("3. Schwab API for market data")
    print("4. Sector-specific scoring adaptations")