"""
APHELION Recommendation Engine - Core Scoring Module
Quant Rex Implementation
Version 1.0 - March 12, 2026

This module implements the 5-factor scoring algorithm for the APHELION options trading platform.
Focus sectors: Defense, Oil & Gas, Logistics, Medical
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Union
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class APHELIONScoringEngine:
    """
    Main scoring engine implementing the 5-factor algorithm:
    1. Technical Score (30%)
    2. Fundamental Score (25%)
    3. Sentiment Score (20%)
    4. Sector Momentum (15%)
    5. Options Flow (10%)
    """
    
    def __init__(self, weights: Optional[Dict[str, float]] = None):
        """
        Initialize scoring engine with custom or default weights.
        
        Args:
            weights: Dictionary of scoring component weights
                    Default: {'technical': 0.3, 'fundamental': 0.25, 
                             'sentiment': 0.2, 'sector': 0.15, 'flow': 0.1}
        """
        self.default_weights = {
            'technical': 0.3,
            'fundamental': 0.25,
            'sentiment': 0.2,
            'sector': 0.15,
            'flow': 0.1
        }
        
        self.weights = weights if weights else self.default_weights
        
        # Validate weights sum to 1
        weight_sum = sum(self.weights.values())
        if abs(weight_sum - 1.0) > 0.001:
            raise ValueError(f"Weights must sum to 1.0, got {weight_sum}")
        
        # Sector-specific configurations
        self.sector_configs = {
            'defense': {
                'fundamental_weights': {'pe_ratio': 0.2, 'debt_equity': 0.3, 
                                       'roic': 0.3, 'revenue_growth': 0.2},
                'key_metrics': ['government_contracts', 'backlog', 'dividend_yield'],
                'etf': 'ITA'  # iShares U.S. Aerospace & Defense ETF
            },
            'energy': {
                'fundamental_weights': {'pe_ratio': 0.3, 'operating_margin': 0.4, 
                                       'free_cash_flow': 0.3},
                'key_metrics': ['oil_price_beta', 'reserves', 'refining_margin'],
                'etf': 'XLE'  # Energy Select Sector SPDR Fund
            },
            'logistics': {
                'fundamental_weights': {'pe_ratio': 0.25, 'revenue_growth': 0.35, 
                                       'operating_margin': 0.4},
                'key_metrics': ['shipping_rates', 'fuel_costs', 'inventory_turnover'],
                'etf': 'XLI'  # Industrial Select Sector SPDR Fund
            },
            'medical': {
                'fundamental_weights': {'pe_ratio': 0.2, 'profit_margin': 0.3, 
                                       'rnd_growth': 0.3, 'revenue_growth': 0.2},
                'key_metrics': ['fda_approvals', 'pipeline_strength', 'patent_expiry'],
                'etf': 'XLV'  # Health Care Select Sector SPDR Fund
            }
        }
        
        logger.info(f"APHELION Scoring Engine initialized with weights: {self.weights}")
    
    def calculate_technical_score(self, ticker: str, price_data: pd.DataFrame, 
                                 lookback_days: int = 60) -> float:
        """
        Calculate technical score based on multiple indicators.
        
        Args:
            ticker: Stock ticker symbol
            price_data: DataFrame with OHLCV data
            lookback_days: Number of days to look back for calculations
            
        Returns:
            Technical score (0-100)
        """
        try:
            scores = {}
            
            # 1. Trend Strength (RSI + MACD)
            rsi = self._calculate_rsi(price_data)
            macd_signal = self._calculate_macd_signal(price_data)
            
            if 30 <= rsi <= 70:  # Neutral zone
                trend_score = 50
            elif rsi < 30:  # Oversold
                trend_score = 80 if macd_signal == "bullish_crossover" else 60
            else:  # Overbought
                trend_score = 20 if macd_signal == "bearish_crossover" else 40
            
            scores['trend'] = trend_score
            
            # 2. Volatility Analysis (ATR + Bollinger Bands)
            atr_percent = self._calculate_atr_percentage(price_data)
            bb_position = self._calculate_bollinger_position(price_data)
            
            # Higher volatility preferred for options (but not extreme)
            if 2 <= atr_percent <= 5:  # 2-5% daily ATR ideal
                vol_score = 70
            elif atr_percent < 2:
                vol_score = 40  # Too low volatility
            else:
                vol_score = 30  # Too high, dangerous
            
            scores['volatility'] = vol_score
            
            # 3. Support/Resistance Levels
            support_distance = self._calculate_support_distance(price_data)
            resistance_distance = self._calculate_resistance_distance(price_data)
            
            if support_distance < 0.05:  # Near support (<5%)
                sr_score = 75
            elif resistance_distance < 0.05:  # Near resistance (<5%)
                sr_score = 25
            else:
                sr_score = 50
            
            scores['support_resistance'] = sr_score
            
            # Weighted average
            technical_score = (
                scores['trend'] * 0.4 +
                scores['volatility'] * 0.4 +
                scores['support_resistance'] * 0.2
            )
            
            logger.debug(f"Technical score for {ticker}: {technical_score:.1f}")
            return max(0, min(100, technical_score))
            
        except Exception as e:
            logger.error(f"Error calculating technical score for {ticker}: {e}")
            return 50  # Return neutral score on error
    
    def calculate_fundamental_score(self, ticker: str, sector: str, 
                                   fundamentals: Dict) -> float:
        """
        Calculate sector-specific fundamental score.
        
        Args:
            ticker: Stock ticker symbol
            sector: One of 'defense', 'energy', 'logistics', 'medical'
            fundamentals: Dictionary of fundamental metrics
            
        Returns:
            Fundamental score (0-100)
        """
        try:
            if sector not in self.sector_configs:
                raise ValueError(f"Unknown sector: {sector}. Must be one of {list(self.sector_configs.keys())}")
            
            sector_config = self.sector_configs[sector]
            weights = sector_config['fundamental_weights']
            
            scores = {}
            
            for metric, weight in weights.items():
                if metric not in fundamentals:
                    logger.warning(f"Missing fundamental metric {metric} for {ticker}")
                    scores[metric] = 50  # Neutral if missing
                    continue
                
                value = fundamentals[metric]
                
                if metric == 'pe_ratio':
                    # Lower P/E better, but sector-adjusted
                    sector_avg_pe = self._get_sector_average_pe(sector)
                    if value < sector_avg_pe * 0.8:
                        scores[metric] = 80
                    elif value < sector_avg_pe:
                        scores[metric] = 60
                    else:
                        scores[metric] = 40
                
                elif metric == 'debt_equity':
                    # Lower debt/equity better
                    if value < 0.5:
                        scores[metric] = 80
                    elif value < 1.0:
                        scores[metric] = 60
                    elif value < 2.0:
                        scores[metric] = 40
                    else:
                        scores[metric] = 20
                
                elif metric == 'roic':  # Return on Invested Capital
                    if value > 0.15:
                        scores[metric] = 90
                    elif value > 0.10:
                        scores[metric] = 70
                    elif value > 0.05:
                        scores[metric] = 50
                    else:
                        scores[metric] = 30
                
                elif metric == 'revenue_growth':
                    if value > 0.20:
                        scores[metric] = 90
                    elif value > 0.10:
                        scores[metric] = 70
                    elif value > 0.05:
                        scores[metric] = 50
                    elif value > 0:
                        scores[metric] = 40
                    else:
                        scores[metric] = 20
                
                elif metric == 'operating_margin':
                    if value > 0.20:
                        scores[metric] = 90
                    elif value > 0.15:
                        scores[metric] = 70
                    elif value > 0.10:
                        scores[metric] = 50
                    elif value > 0.05:
                        scores[metric] = 40
                    else:
                        scores[metric] = 30
                
                elif metric == 'free_cash_flow':
                    # Positive and growing FCF is good
                    if value > 1_000_000_000:  # $1B+
                        scores[metric] = 90
                    elif value > 100_000_000:  # $100M+
                        scores[metric] = 70
                    elif value > 0:
                        scores[metric] = 50
                    else:
                        scores[metric] = 30
                
                elif metric == 'profit_margin':
                    if value > 0.20:
                        scores[metric] = 90
                    elif value > 0.15:
                        scores[metric] = 70
                    elif value > 0.10:
                        scores[metric] = 50
                    elif value > 0.05:
                        scores[metric] = 40
                    else:
                        scores[metric] = 30
                
                elif metric == 'rnd_growth':
                    # R&D growth important for medical sector
                    if value > 0.15:
                        scores[metric] = 80
                    elif value > 0.10:
                        scores[metric] = 65
                    elif value > 0.05:
                        scores[metric] = 50
                    elif value > 0:
                        scores[metric] = 40
                    else:
                        scores[metric] = 30
            
            # Calculate weighted score
            if not scores:
                return 50  # Neutral if no scores calculated
            
            fundamental_score = sum(scores[metric] * weight 
                                   for metric, weight in weights.items() 
                                   if metric in scores)
            
            logger.debug(f"Fundamental score for {ticker} ({sector}): {fundamental_score:.1f}")
            return max(0, min(100, fundamental_score))
            
        except Exception as e:
            logger.error(f"Error calculating fundamental score for {ticker}: {e}")
            return 50  # Return neutral score on error
    
    def calculate_sentiment_score(self, ticker: str, sector: str, 
                                 news_items: List[Dict], 
                                 lookback_hours: int = 24) -> float:
        """
        Calculate sentiment score from news and social media.
        
        Args:
            ticker: Stock ticker symbol
            sector: Sector classification
            news_items: List of news articles with content and timestamps
            lookback_hours: Hours to look back for news
            
        Returns:
            Sentiment score (0-100)
        """
        try:
            if not news_items:
                return 50  # Neutral if no news
            
            sentiment_scores = []
            relevance_weights = []
            current_time = datetime.now()
            
            for news in news_items:
                # Text preprocessing
                cleaned_text = self._preprocess_news_text(news['content'])
                
                # Sentiment analysis (simplified - would use VADER/FinBERT in production)
                sentiment = self._analyze_sentiment_simple(cleaned_text)
                
                # Relevance scoring
                relevance = self._calculate_relevance(news, ticker, sector)
                
                # Time decay (more recent = higher weight)
                time_diff = (current_time - news['timestamp']).total_seconds() / 3600  # hours
                time_decay = np.exp(-0.5 * time_diff)
                
                sentiment_scores.append(sentiment)
                relevance_weights.append(relevance * time_decay)
            
            # Calculate weighted sentiment
            weighted_sentiment = np.average(sentiment_scores, weights=relevance_weights)
            
            # Convert to 0-100 scale (-1 to 1 → 0 to 100)
            sentiment_score = 50 + (weighted_sentiment * 50)
            
            # Adjust for sector-specific news
            sector_sentiment = self._get_sector_sentiment(sector)
            sentiment_score = sentiment_score * 0.7 + sector_sentiment * 0.3
            
            logger.debug(f"Sentiment score for {ticker}: {sentiment_score:.1f}")
            return max(0, min(100, sentiment_score))
            
        except Exception as e:
            logger.error(f"Error calculating sentiment score for {ticker}: {e}")
            return 50  # Return neutral score on error
    
    def calculate_sector_momentum_score(self, ticker: str, sector: str, 
                                       price_data: pd.DataFrame,
                                       sector_data: pd.DataFrame) -> float:
        """
        Score based on sector relative strength.
        
        Args:
            ticker: Stock ticker symbol
            sector: Sector classification
            price_data: Ticker price data
            sector_data: Sector ETF price data
            
        Returns:
            Sector momentum score (0-100)
        """
        try:
            # 1. Sector ETF performance
            sector_return_1m = self._calculate_return(sector_data, days=21)
            sector_return_3m = self._calculate_return(sector_data, days=63)
            
            # 2. Relative strength vs sector
            ticker_return_1m = self._calculate_return(price_data, days=21)
            relative_strength = ticker_return_1m - sector_return_1m
            
            # 3. Score calculation based on sector health
            if sector_return_1m > 0.05 and sector_return_3m > 0.10:
                sector_health = 80  # Strong uptrend
            elif sector_return_1m > 0:
                sector_health = 60  # Mild uptrend
            elif sector_return_1m > -0.05:
                sector_health = 40  # Mild downtrend
            else:
                sector_health = 20  # Strong downtrend
            
            # 4. Adjust for relative strength
            if relative_strength > 0.03:
                rs_adjustment = +20
            elif relative_strength > 0:
                rs_adjustment = +10
            elif relative_strength > -0.03:
                rs_adjustment = -10
            else:
                rs_adjustment = -20
            
            final_score = sector_health + rs_adjustment
            
            logger.debug(f"Sector momentum score for {ticker} ({sector}): {final_score:.1f}")
            return max(0, min(100, final_score))
            
        except Exception as e:
            logger.error(f"Error calculating sector momentum score for {ticker}: {e}")
            return 50  # Return neutral score on error
    
    def calculate_options_flow_score(self, ticker: str, 
                                    options_flow: List[Dict]) -> float:
        """
        Analyze unusual options activity.
        
        Args:
            ticker: Stock ticker symbol
            options_flow: List of unusual options flow data
            
        Returns:
            Options flow score (0-100)
        """
        try:
            if not options_flow:
                return 50  # Neutral if no data
            
            # Analyze flow patterns
            bullish_flow = 0
            bearish_flow = 0
            total_premium = 0
            
            for flow in options_flow:
                flow_type = flow.get('type', '')
                premium = flow.get('premium', 0)
                
                if flow_type in ['call_buy', 'put_sell']:
                    bullish_flow += premium
                else:
                    bearish_flow += premium
                total_premium += premium
            
            if total_premium == 0:
                return 50
            
            # Calculate bullish percentage
            bullish_percentage = bullish_flow / total_premium
            
            # Score based on flow strength and direction
            if total_premium > 10_000_000:  # $10M+ in unusual flow
                volume_multiplier = 1.5
            elif total_premium > 1_000_000:
                volume_multiplier = 1.2
            else:
                volume_multiplier = 1.0
            
            if bullish_percentage > 0.7:
                base_score = 80
            elif bullish_percentage > 0.55:
                base_score = 65
            elif bullish_percentage > 0.45:
                base_score = 50
            elif bullish_percentage > 0.3:
                base_score = 35
            else:
                base_score = 20
            
            final_score = base_score * volume_multiplier
            
            logger.debug(f"Options flow score for {ticker}: {final_score:.1f}")
            return min(100, final_score)
            
        except Exception as e:
            logger.error(f"Error calculating options flow score for {ticker}: {e}")
            return 50
    
    def calculate_total_score(self,