    def calculate_total_score(self, ticker: str, sector: str, 
                             price_data: pd.DataFrame, 
                             fundamentals: Dict,
                             news_items: List[Dict],
                             sector_data: pd.DataFrame,
                             options_flow: List[Dict]) -> Dict[str, float]:
        """
        Calculate all 5 scores and total weighted score.
        
        Args:
            ticker: Stock ticker symbol
            sector: Sector classification
            price_data: Ticker price data
            fundamentals: Fundamental metrics
            news_items: News articles
            sector_data: Sector ETF data
            options_flow: Options flow data
            
        Returns:
            Dictionary with all scores and total
        """
        scores = {}
        
        # Calculate individual scores
        scores['technical'] = self.calculate_technical_score(ticker, price_data)
        scores['fundamental'] = self.calculate_fundamental_score(ticker, sector, fundamentals)
        scores['sentiment'] = self.calculate_sentiment_score(ticker, sector, news_items)
        scores['sector'] = self.calculate_sector_momentum_score(ticker, sector, price_data, sector_data)
        scores['flow'] = self.calculate_options_flow_score(ticker, options_flow)
        
        # Calculate weighted total
        total_score = sum(scores[component] * self.weights[component] 
                         for component in self.weights)
        
        scores['total'] = total_score
        
        logger.info(f"Total score for {ticker}: {total_score:.1f}")
        return scores
    
    def generate_recommendation(self, ticker: str, scores: Dict[str, float], 
                               current_price: float) -> Dict:
        """
        Generate specific options recommendation based on scores.
        
        Args:
            ticker: Stock ticker symbol
            scores: Dictionary of all scores
            current_price: Current stock price
            
        Returns:
            Recommendation dictionary
        """
        total_score = scores['total']
        
        # Determine direction
        if total_score >= 70:
            direction = "bullish"
            option_type = "call"
        elif total_score >= 50:
            direction = "mildly_bullish"
            option_type = "call"
        elif total_score >= 30:
            direction = "neutral"
            option_type = "both"
        else:
            direction = "bearish"
            option_type = "put"
        
        # Calculate implied volatility percentile (simplified)
        iv_percentile = self._calculate_iv_percentile(ticker, current_price)
        
        # Select expiration based on score confidence
        if total_score >= 80:
            expiration_days = 45
        elif total_score >= 60:
            expiration_days = 30
        else:
            expiration_days = 21
        
        # Determine strike selection
        if direction == "bullish":
            strike_price = self._calculate_delta_strike(current_price, delta_target=0.65)
            strategy = "Long Call" if iv_percentile < 50 else "Bull Call Spread"
        elif direction == "bearish":
            strike_price = self._calculate_delta_strike(current_price, delta_target=0.35)
            strategy = "Long Put" if iv_percentile < 50 else "Bear Put Spread"
        else:  # neutral
            strategy = "Iron Condor" if iv_percentile > 50 else "Strangle"
            strikes = self._calculate_neutral_strikes(current_price, iv_percentile)
            strike_price = strikes
        
        # Generate rationale
        rationale = self._generate_rationale(ticker, scores, direction)
        
        return {
            'ticker': ticker,
            'direction': direction,
            'strategy': strategy,
            'option_type': option_type,
            'expiration_days': expiration_days,
            'strike_price': strike_price,
            'confidence_score': total_score,
            'scores': scores,
            'rationale': rationale,
            'generated_at': datetime.now().isoformat()
        }
    
    # ===== Helper Methods =====
    
    def _calculate_rsi(self, price_data: pd.DataFrame, period: int = 14) -> float:
        """Calculate RSI indicator."""
        close_prices = price_data['Close']
        delta = close_prices.diff()
        
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi.iloc[-1] if not rsi.empty else 50
    
    def _calculate_macd_signal(self, price_data: pd.DataFrame) -> str:
        """Calculate MACD signal."""
        close_prices = price_data['Close']
        
        exp1 = close_prices.ewm(span=12, adjust=False).mean()
        exp2 = close_prices.ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        
        if macd.iloc[-1] > signal.iloc[-1] and macd.iloc[-2] <= signal.iloc[-2]:
            return "bullish_crossover"
        elif macd.iloc[-1] < signal.iloc[-1] and macd.iloc[-2] >= signal.iloc[-2]:
            return "bearish_crossover"
        else:
            return "neutral"
    
    def _calculate_atr_percentage(self, price_data: pd.DataFrame, period: int = 14) -> float:
        """Calculate Average True Range as percentage of price."""
        high = price_data['High']
        low = price_data['Low']
        close = price_data['Close']
        
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        
        current_price = close.iloc[-1]
        atr_value = atr.iloc[-1] if not atr.empty else 0
        
        return (atr_value / current_price) * 100 if current_price > 0 else 0
    
    def _calculate_bollinger_position(self, price_data: pd.DataFrame, 
                                     period: int = 20, std_dev: int = 2) -> float:
        """Calculate position within Bollinger Bands (0-1, where 0.5 is middle)."""
        close = price_data['Close']
        sma = close.rolling(window=period).mean()
        std = close.rolling(window=period).std()
        
        upper_band = sma + (std * std_dev)
        lower_band = sma - (std * std_dev)
        
        current_price = close.iloc[-1]
        current_sma = sma.iloc[-1] if not sma.empty else current_price
        current_upper = upper_band.iloc[-1] if not upper_band.empty else current_price * 1.1
        current_lower = lower_band.iloc[-1] if not lower_band.empty else current_price * 0.9
        
        if current_upper == current_lower:
            return 0.5
        
        # Normalize position between bands
        position = (current_price - current_lower) / (current_upper - current_lower)
        return max(0, min(1, position))
    
    def _calculate_support_distance(self, price_data: pd.DataFrame, 
                                   lookback_days: int = 60) -> float:
        """Calculate distance to nearest support level."""
        low_prices = price_data['Low'].tail(lookback_days)
        current_price = price_data['Close'].iloc[-1]
        
        # Find significant support levels (local minima)
        support_levels = []
        for i in range(1, len(low_prices) - 1):
            if low_prices.iloc[i] < low_prices.iloc[i-1] and low_prices.iloc[i] < low_prices.iloc[i+1]:
                support_levels.append(low_prices.iloc[i])
        
        if not support_levels:
            return 1.0  # No support found
        
        nearest_support = max([s for s in support_levels if s < current_price], default=min(support_levels))
        distance = (current_price - nearest_support) / current_price
        
        return distance
    
    def _calculate_resistance_distance(self, price_data: pd.DataFrame, 
                                      lookback_days: int = 60) -> float:
        """Calculate distance to nearest resistance level."""
        high_prices = price_data['High'].tail(lookback_days)
        current_price = price_data['Close'].iloc[-1]
        
        # Find significant resistance levels (local maxima)
        resistance_levels = []
        for i in range(1, len(high_prices) - 1):
            if high_prices.iloc[i] > high_prices.iloc[i-1] and high_prices.iloc[i] > high_prices.iloc[i+1]:
                resistance_levels.append(high_prices.iloc[i])
        
        if not resistance_levels:
            return 1.0  # No resistance found
        
        nearest_resistance = min([r for r in resistance_levels if r > current_price], default=max(resistance_levels))
        distance = (nearest_resistance - current_price) / current_price
        
        return distance
    
    def _get_sector_average_pe(self, sector: str) -> float:
        """Get sector average P/E ratio."""
        # These are approximate averages - would be fetched from data source in production
        sector_pe_map = {
            'defense': 18.5,
            'energy': 12.0,
            'logistics': 16.0,
            'medical': 22.0
        }
        return sector_pe_map.get(sector, 15.0)
    
    def _preprocess_news_text(self, text: str) -> str:
        """Preprocess news text for sentiment analysis."""
        import re
        
        # Remove special characters, URLs, etc.
        text = re.sub(r'http\S+', '', text)
        text = re.sub(r'[^\w\s]', ' ', text)
        text = text.lower().strip()
        
        return text
    
    def _analyze_sentiment_simple(self, text: str) -> float:
        """Simple sentiment analysis (would use VADER/FinBERT in production)."""
        positive_words = ['bullish', 'growth', 'profit', 'gain', 'positive', 'strong', 'beat', 'upgrade']
        negative_words = ['bearish', 'loss', 'decline', 'negative', 'weak', 'miss', 'downgrade', 'cut']
        
        words = text.split()
        pos_count = sum(1 for word in words if word in positive_words)
        neg_count = sum(1 for word in words if word in negative_words)
        
        total = pos_count + neg_count
        if total == 0:
            return 0
        
        # Normalize to -1 to 1
        sentiment = (pos_count - neg_count) / total
        return max(-1, min(1, sentiment))
    
    def _calculate_relevance(self, news: Dict, ticker: str, sector: str) -> float:
        """Calculate relevance of news article to ticker/sector."""
        text = news.get('content', '').lower()
        title = news.get('title', '').lower()
        
        relevance = 0.0
        
        # Check for ticker mention
        if ticker.lower() in text or ticker.lower() in title:
            relevance += 0.6
        
        # Check for sector keywords
        sector_keywords = {
            'defense': ['defense', 'military', 'aerospace', 'weapon', 'contract'],
            'energy': ['oil', 'gas', 'energy', 'crude', 'petroleum', 'drilling'],
            'logistics': ['shipping', 'logistics', 'transport', 'supply chain', 'freight'],
            'medical': ['medical', 'health', 'pharma', 'biotech', 'fda', 'drug']
        }
        
        keywords = sector_keywords.get(sector, [])
        for keyword in keywords:
            if keyword in text or keyword in title:
                relevance += 0.2
                break
        
        return min(1.0, relevance)
    
    def _get_sector_sentiment(self, sector: str) -> float:
        """Get overall sector sentiment (would be from data feed)."""
        # Placeholder - would fetch from sentiment API
        return 50
    
    def _calculate_return(self, price_data: pd.DataFrame, days: int) -> float:
        """Calculate return over specified number of days."""
        if len(price_data) < days:
            return 0
        
        start_price = price_data['Close'].iloc[-days]
        end_price = price_data['Close'].iloc[-1]
        
        return (end_price - start_price) / start_price if start_price > 0 else 0
    
    def _calculate_iv_percentile(self, ticker: str, current_price: float) -> float:
        """Calculate implied volatility percentile (simplified)."""
        # Placeholder - would fetch from options data
        # For now, return random value for testing
        import random
        return random.uniform(20, 80)
    
    def _calculate_delta_strike(self, current_price: float, delta_target: float) -> float:
        """Calculate strike price based on target delta."""
        # Simplified calculation
        # In production, would use options pricing model
        if delta_target > 0.5:  # ITM call
            strike = current_price * 0.95
        else:  # OTM call or ITM put
            strike = current_price * 1.05
        
        # Round to nearest $0.50 for stocks > $10, $0.05 for stocks < $10
        increment = 0.50 if current_price > 10 else 0.05
        strike = round(strike / increment) * increment
        
        return strike
    
    def _calculate_neutral_strikes(self, current_price: float, iv_percentile: float) -> Dict:
        """Calculate strikes for neutral strategies."""
        # For Iron Condor or Strangle
        if iv_percentile > 50:  # High IV - use wider strikes
            call_strike = current_price * 1.10
            put_strike = current_price * 0.90
        else:  # Low IV - use tighter strikes
            call_strike = current_price * 1.05
            put_strike = current_price * 0.95
        
        # Round strikes
        increment = 0.50 if current_price > 10 else 0.05
        call_strike = round(call_strike / increment) * increment
        put_strike = round(put_strike / increment) * increment
        
        return {
            'call_strike': call_strike,
            'put_strike': put_strike
        }
    
    def _generate_rationale(self, ticker: str, scores: Dict[str, float], 
                           direction: str) -> str:
        """Generate rationale for recommendation."""
        rationale_parts = []
        
        # Technical rationale
        tech_score = scores['technical']
        if tech_score >= 70:
            rationale_parts.append("Strong technical setup with favorable trend and volatility.")
        elif tech_score >= 50:
            rationale_parts.append("Moderate technical conditions.")
        else:
            rationale_parts.append("Weak technical indicators suggest caution.")
        
        # Fundamental rationale
        fund_score = scores['fundamental']
        if fund_score >= 70:
            rationale_parts.append("Solid fundamentals with strong financial metrics.")
        elif fund_score >= 50:
            rationale_parts.append("Adequate fundamental profile.")
        else:
            rationale_parts.append("Fundamental concerns present.")
        
        # Sentiment rationale
        sent_score = scores['sentiment']
        if sent_score >= 70:
            rationale_parts.append("Positive market sentiment and news flow.")
        elif sent_score >= 50:
            rationale_parts.append("Neutral sentiment environment.")
        else:
            rationale_parts.append("Negative sentiment weighing on the stock.")
        
        # Sector rationale
        sector_score = scores['sector']
        if sector_score >= 70:
            rationale_parts.append("Sector showing strong momentum and relative strength.")
        elif sector_score >= 50:
            rationale_parts.append("Sector performance in line with market.")
        else:
            rationale_parts.append("Sector underperforming, adding headwinds.")
        
        # Options flow rationale
        flow_score = scores['flow']
        if flow_score >= 70:
            rationale_parts.append("Significant bullish options flow detected.")
        elif flow_score >= 50:
            rationale_parts.append("Options flow shows balanced activity.")
        else:
            rationale_parts.append("Bearish options flow suggests caution.")
        
        # Direction-specific conclusion
        if direction == "bullish":
            conclusion = f"Overall {direction} bias with {scores['total']:.1f} confidence score."
        elif direction == "bearish":
            conclusion = f"Overall {direction} bias with {scores['total']:.1f} confidence score."
        else:
            conclusion = f"Neutral market view with {scores['total']:.1f} confidence score."
        
        rationale_parts.append(conclusion)
        
        return " ".join(rationale_parts)


# Example usage
if __name__ == "__main__":
    # Create scoring engine
    engine = APHELIONScoringEngine()
    
    # Example data (would come from data sources in production)
    example_price_data = pd.DataFrame({
        'Open': [100, 101, 102, 103, 104],
        'High': [102, 103, 104, 105, 106],
        'Low': [99, 100, 101, 102, 103],
        'Close': [101, 102, 103, 104, 105],
        '