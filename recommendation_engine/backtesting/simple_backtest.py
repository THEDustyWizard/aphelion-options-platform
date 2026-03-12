#!/usr/bin/env python3
"""
APHELION Simplified Backtesting Framework - MVP Version
Quant Rex - Focus on essential metrics for desktop app integration
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
class BacktestResult:
    """Results from a backtest run."""
    ticker: str
    sector: str
    strategy: str
    entry_date: datetime
    exit_date: datetime
    entry_price: float
    exit_price: float
    pnl: float
    pnl_percentage: float
    max_drawdown: float
    win_loss: str
    confidence_score: float
    risk_score: float
    metrics: Dict[str, float]

class SimpleBacktestEngine:
    """
    Simplified backtesting engine for APHELION MVP.
    Focuses on essential metrics for desktop app display.
    """
    
    def __init__(self, initial_capital: float = 10000.0):
        self.initial_capital = initial_capital
        self.commission_rate = 0.005  # 0.5% commission per trade
        self.slippage_rate = 0.001  # 0.1% slippage
        
        logger.info(f"Backtest engine initialized with ${initial_capital:,.2f} capital")
    
    def run_backtest(self, recommendations: List[Dict], 
                    historical_data: Dict[str, pd.DataFrame],
                    start_date: datetime, 
                    end_date: datetime) -> Dict[str, Any]:
        """
        Run backtest on a list of recommendations.
        
        Args:
            recommendations: List of recommendation dictionaries
            historical_data: Dict mapping tickers to historical price data
            start_date: Backtest start date
            end_date: Backtest end date
            
        Returns:
            Backtest results summary
        """
        logger.info(f"Running backtest from {start_date.date()} to {end_date.date()}")
        logger.info(f"Testing {len(recommendations)} recommendations")
        
        results = []
        portfolio_value = self.initial_capital
        trade_log = []
        
        # Filter recommendations within backtest period
        valid_recommendations = [
            rec for rec in recommendations
            if start_date <= datetime.fromisoformat(rec['generated_at']) <= end_date
        ]
        
        logger.info(f"Found {len(valid_recommendations)} valid recommendations in period")
        
        for rec in valid_recommendations:
            try:
                ticker = rec['ticker']
                if ticker not in historical_data:
                    logger.warning(f"No historical data for {ticker}, skipping")
                    continue
                
                # Run single trade backtest
                result = self._backtest_single_trade(rec, historical_data[ticker])
                if result:
                    results.append(result)
                    
                    # Update portfolio (simplified - assume 1 contract per trade)
                    trade_pnl = result.pnl
                    commission = abs(trade_pnl) * self.commission_rate
                    net_pnl = trade_pnl - commission
                    
                    portfolio_value += net_pnl
                    
                    trade_log.append({
                        'ticker': ticker,
                        'entry_date': result.entry_date,
                        'exit_date': result.exit_date,
                        'pnl': trade_pnl,
                        'commission': commission,
                        'net_pnl': net_pnl,
                        'portfolio_value': portfolio_value
                    })
                    
            except Exception as e:
                logger.error(f"Error backtesting {rec.get('ticker', 'unknown')}: {e}")
                continue
        
        # Calculate summary statistics
        summary = self._calculate_summary_statistics(results, trade_log, portfolio_value)
        
        logger.info(f"Backtest complete. Final portfolio: ${portfolio_value:,.2f}")
        logger.info(f"Total trades: {len(results)}, Win rate: {summary['win_rate']:.1%}")
        
        return summary
    
    def _backtest_single_trade(self, recommendation: Dict, 
                              price_data: pd.DataFrame) -> Optional[BacktestResult]:
        """
        Backtest a single trade recommendation.
        """
        try:
            ticker = recommendation['ticker']
            sector = recommendation.get('sector', 'unknown')
            strategy = recommendation.get('strategy', 'Long Call')
            confidence = recommendation.get('confidence_score', 50)
            risk_score = recommendation.get('risk_score', 50)
            
            # Get entry date (recommendation generation date)
            entry_date = datetime.fromisoformat(recommendation['generated_at'])
            
            # Determine holding period based on strategy
            holding_days = self._get_holding_period(strategy, confidence)
            
            # Find entry price (next available price after recommendation)
            entry_idx = price_data.index.get_indexer([entry_date], method='pad')[0]
            if entry_idx >= len(price_data) - 1:
                return None
            
            entry_price = price_data.iloc[entry_idx]['Close']
            
            # Apply slippage
            entry_price *= (1 + self.slippage_rate)
            
            # Find exit price (after holding period)
            exit_date = entry_date + timedelta(days=holding_days)
            exit_idx = price_data.index.get_indexer([exit_date], method='pad')[0]
            if exit_idx >= len(price_data):
                exit_idx = len(price_data) - 1
            
            exit_price = price_data.iloc[exit_idx]['Close']
            
            # Apply slippage on exit
            exit_price *= (1 - self.slippage_rate)
            
            # Calculate P&L based on strategy
            pnl, pnl_percentage = self._calculate_pnl(
                strategy, entry_price, exit_price, 
                recommendation.get('strike_price', entry_price),
                recommendation.get('option_type', 'call')
            )
            
            # Calculate max drawdown during holding period
            price_slice = price_data.iloc[entry_idx:exit_idx+1]['Close']
            max_drawdown = self._calculate_max_drawdown_slice(price_slice, entry_price)
            
            # Determine win/loss
            win_loss = 'win' if pnl > 0 else 'loss'
            
            # Calculate additional metrics
            metrics = self._calculate_trade_metrics(
                price_slice, entry_price, exit_price, pnl
            )
            
            return BacktestResult(
                ticker=ticker,
                sector=sector,
                strategy=strategy,
                entry_date=entry_date,
                exit_date=price_data.index[exit_idx],
                entry_price=entry_price,
                exit_price=exit_price,
                pnl=pnl,
                pnl_percentage=pnl_percentage,
                max_drawdown=max_drawdown,
                win_loss=win_loss,
                confidence_score=confidence,
                risk_score=risk_score,
                metrics=metrics
            )
            
        except Exception as e:
            logger.error(f"Error in single trade backtest: {e}")
            return None
    
    def _get_holding_period(self, strategy: str, confidence: float) -> int:
        """
        Determine holding period based on strategy and confidence.
        """
        base_periods = {
            'Long Call': 30,
            'Long Put': 30,
            'Bull Call Spread': 45,
            'Bear Put Spread': 45,
            'Iron Condor': 60,
            'Strangle': 45,
            'Straddle': 30,
            'Calendar Spread': 60
        }
        
        base_days = base_periods.get(strategy, 30)
        
        # Adjust based on confidence
        if confidence >= 80:
            return int(base_days * 0.8)  # Shorter hold for high confidence
        elif confidence >= 60:
            return base_days
        else:
            return int(base_days * 1.2)  # Longer hold for low confidence
    
    def _calculate_pnl(self, strategy: str, entry_price: float, exit_price: float,
                      strike_price: float, option_type: str) -> Tuple[float, float]:
        """
        Calculate P&L for different strategies.
        Simplified for MVP - assumes option price moves 1:1 with underlying.
        """
        # Simplified P&L calculation
        # In production, would use proper options pricing model
        
        price_change = exit_price - entry_price
        price_change_pct = price_change / entry_price if entry_price > 0 else 0
        
        # Directional strategies
        if strategy in ['Long Call', 'Bull Call Spread']:
            if option_type == 'call':
                pnl = price_change
                pnl_pct = price_change_pct
            else:
                pnl = -price_change
                pnl_pct = -price_change_pct
                
        elif strategy in ['Long Put', 'Bear Put Spread']:
            if option_type == 'put':
                pnl = -price_change
                pnl_pct = -price_change_pct
            else:
                pnl = price_change
                pnl_pct = price_change_pct
                
        elif strategy in ['Iron Condor', 'Strangle', 'Straddle']:
            # Neutral strategies - profit from volatility/range
            # Simplified: profit if price stays within range
            price_range = abs(strike_price - entry_price) * 0.1  # 10% range
            if abs(exit_price - entry_price) < price_range:
                pnl = price_range * 0.5  # Simplified profit
                pnl_pct = pnl / entry_price
            else:
                pnl = -price_range
                pnl_pct = -price_range / entry_price
                
        else:
            # Default directional assumption
            pnl = price_change
            pnl_pct = price_change_pct
        
        # Apply leverage factor (simplified)
        leverage = 1.0
        if 'Spread' in strategy:
            leverage = 2.0
        elif strategy in ['Iron Condor', 'Strangle', 'Straddle']:
            leverage = 1.5
        
        return pnl * leverage, pnl_pct * leverage * 100  # Return percentage
    
    def _calculate_max_drawdown_slice(self, price_slice: pd.Series, 
                                     entry_price: float) -> float:
        """
        Calculate maximum drawdown during holding period.
        """
        if len(price_slice) == 0:
            return 0.0
        
        peak = entry_price
        max_drawdown = 0.0
        
        for price in price_slice:
            peak = max(peak, price)
            drawdown = (peak - price) / peak
            max_drawdown = max(max_drawdown, drawdown)
        
        return max_drawdown * 100  # Return as percentage
    
    def _calculate_trade_metrics(self, price_slice: pd.Series, 
                                entry_price: float, exit_price: float,
                                pnl: float) -> Dict[str, float]:
        """
        Calculate additional trade metrics.
        """
        if len(price_slice) < 2:
            return {
                'volatility': 0,
                'sharpe_ratio': 0,
                'sortino_ratio': 0,
                'profit_factor': 1.0
            }
        
        # Calculate returns
        returns = price_slice.pct_change().dropna()
        
        # Volatility (annualized)
        volatility = returns.std() * np.sqrt(252) * 100 if len(returns) > 0 else 0
        
        # Sharpe ratio (simplified)
        sharpe_ratio = 0
        if volatility > 0:
            sharpe_ratio = (pnl / entry_price * 252) / volatility
        
        # Sortino ratio (simplified)
        downside_returns = returns[returns < 0]
        downside_volatility = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else 0
        sortino_ratio = (pnl / entry_price * 252) / downside_volatility if downside_volatility > 0 else 0
        
        # Profit factor (simplified)
        profit_factor = 1.0  # Default
        
        return {
            'volatility': volatility,
            'sharpe_ratio': sharpe_ratio,
            'sortino_ratio': sortino_ratio,
            'profit_factor': profit_factor
        }
    
    def _calculate_summary_statistics(self, results: List[BacktestResult],
                                     trade_log: List[Dict],
                                     final_portfolio: float) -> Dict[str, Any]:
        """
        Calculate summary statistics from backtest results.
        """
        if not results:
            return {
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0.0,
                'total_pnl': 0.0,
                'avg_pnl': 0.0,
                'avg_win': 0.0,
                'avg_loss': 0.0,
                'max_drawdown': 0.0,
                'sharpe_ratio': 0.0,
                'final_portfolio': final_portfolio,
                'total_return': 0.0,
                'annual_return': 0.0,
                'trade_log': trade_log
            }
        
        # Basic statistics
        total_trades = len(results)
        winning_trades = sum(1 for r in results if r.win_loss == 'win')
        losing_trades = total_trades - winning_trades
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        # P&L statistics
        total_pnl = sum(r.pnl for r in results)
        avg_pnl = total_pnl / total_trades if total_trades > 0 else 0
        
        winning_pnls = [r.pnl for r in results if r.win_loss == 'win']
        losing_pnls = [r.pnl for r in results if r.win_loss == 'loss']
        
        avg_win = sum(winning_pnls) / len(winning_pnls) if winning_pnls else 0
        avg_loss = sum(losing_pnls) / len(losing_pnls) if losing_pnls else 0
        
        # Maximum drawdown across all trades
        max_drawdown = max((r.max_drawdown for r in results), default=0.0)
        
        # Portfolio statistics
        total_return = (final_portfolio - self.initial_capital) / self.initial_capital * 100
        
        # Calculate annual return (simplified)
        if trade_log:
            first_date = min(t['entry_date'] for t in trade_log)
            last_date = max(t['exit_date'] for t in trade_log)
            days_elapsed = (last_date - first_date).days
            years_elapsed = max(days_elapsed / 365.25, 0.1)  # Avoid division by zero
            
            annual_return = ((final_portfolio / self.initial_capital) ** (1 / years_elapsed) - 1) * 100
        else:
            annual_return = 0.0
        
        # Calculate Sharpe ratio from trade returns
        trade_returns = [r.pnl_percentage / 100 for r in results]  # Convert to decimal
        avg_return = np.mean(trade_returns) if trade_returns else 0
        std_return = np.std(trade_returns) if len(trade_returns) > 1 else 0
        sharpe_ratio = (avg_return * np.sqrt(252)) / std_return if std_return > 0 else 0
        
        # Sector performance
        sector_performance = {}
        for result in results:
            sector = result.sector
            if sector not in sector_performance:
                sector_performance[sector] = {'trades': 0, 'pnl': 0, 'wins': 0}
            
            sector_performance[sector]['trades'] += 1
            sector_performance[sector]['pnl'] += result.pnl
            if result.win_loss == 'win':
                sector_performance[sector]['wins'] += 1
        
        # Strategy performance
        strategy_performance = {}
        for result in results:
            strategy = result.strategy
            if strategy not in strategy_performance:
                strategy_performance[strategy] = {'trades': 0, 'pnl': 0, 'wins': 0}
            
            strategy_performance[strategy]['trades'] += 1
            strategy_performance[strategy]['pnl'] += result.pnl
            if result.win_loss == 'win':
                strategy_performance[strategy]['wins'] += 1
        
        return {
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'win_rate': win_rate,
            'total_pnl': total_pnl,
            'avg_pnl': avg_pnl,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'final_portfolio': final_portfolio,
            'total_return': total_return,
            'annual_return': annual_return,
            'sector_performance': sector_performance,
            'strategy_performance': strategy_performance,
            'trade_log': trade_log
        }
    
    def generate_report(self, summary: Dict[str, Any], 
                       output_format: str = 'json') -> str:
        """
        Generate backtest report in specified format.
        """
        if output_format == 'json':
            return json.dumps(summary, indent=2, default=str)
        
        elif output_format == 'text':
            report = []
            report.append("=" * 60)
            report.append("APHELION BACKTEST REPORT")
            report.append("=" * 60)
            report.append(f"Period: {summary.get('start_date', 'N/A')} to {summary.get('end_date', 'N/A')}")
            report.append(f"Initial Capital: ${summary.get('initial_capital', 0):,.2f}")
            report.append(f"Final Portfolio: ${summary.get('final_portfolio', 0):,.2f}")
            report.append(f"Total Return: {summary.get('total_return', 0):.1f}%")
            report.append(f"Annual Return: {summary.get('annual_return', 0):.1f}%")
            report.append("")
            report.append(f"Total Trades: {summary.get('total_trades', 0)}")
            report.append(f"Winning Trades: {summary.get('winning_trades', 0)}")
            report.append(f"Losing Trades: {summary.get('losing_trades', 0)}")
            report.append(f"Win Rate: {summary.get('win_rate', 0):.1%}")
            report.append("")
            report.append(f"Total P&L: ${summary.get('total_pnl', 0):,.2f}")
            report.append(f"Average P&L: ${summary.get('avg_pnl', 0):,.2f}")
            report.append(f"Average Win: ${summary.get('avg_win', 0):,.2f}")
            report.append(f"Average Loss: ${summary.get('avg_loss', 0):,.2f}")
            report.append("")
            report.append(f"Max Drawdown: {summary.get('max_drawdown', 0):.1f}%")
            report.append(f"Sharpe Ratio: {summary.get('sharpe_ratio', 0):.2f}")
            report.append("")
            
            # Sector performance
            sector_perf = summary.get('sector_performance', {})
            if sector_perf:
                report.append("SECTOR PERFORMANCE:")
                report.append("-" * 40)
                for sector, perf in sector_perf.items():
                    trades = perf.get('trades', 0)
                    pnl = perf.get('pnl', 0)
                    wins = perf.get('wins', 0)
                    win_rate = (wins / trades * 100) if trades > 0 else 0
                    report.append(f"{sector.upper():12s} {trades:3d} trades  ${pnl:8.2f}  {win_rate:5.1f}%")
                report.append("")
            
            # Strategy performance
            strategy_perf = summary.get('strategy_performance', {})
            if strategy_perf:
                report.append("STRATEGY PERFORMANCE:")
                report.append("-" * 40)
                for strategy, perf in strategy_perf.items():
                    trades = perf.get('trades', 0)
                    pnl = perf.get('pnl', 0)
                    wins = perf.get('wins', 0)
                    win_rate = (wins / trades * 100) if trades > 0 else 0
                    report.append(f"{strategy:20s} {trades:3d} trades  ${pnl:8.2f}  {win_rate:5.1f}%")
            
            report.append("=" * 60)
            return '\n'.join(report)
        
        else:
            raise ValueError(f"Unsupported output format: {output_format}")
    
    def export_to_csv(self, results: List[BacktestResult], filename: str):
        """
        Export backtest results to CSV file.
        """
        import csv
        
        fieldnames = [
            'ticker', 'sector', 'strategy', 'entry_date', 'exit_date',
            'entry_price', 'exit_price', 'pnl', 'pnl_percentage',
            'max_drawdown', 'win_loss', 'confidence_score', 'risk_score'
        ]
        
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for result in results:
                row = {
                    'ticker': result.ticker,
                    'sector': result.sector,
                    'strategy': result.strategy,
                    'entry_date': result.entry_date,
                    'exit_date': result.exit_date,
                    'entry_price': result.entry_price,
                    'exit_price': result.exit_price,
                    'pnl': result.pnl,
                    'pnl_percentage': result.pnl_percentage,
                    'max_drawdown': result.max_drawdown,
                    'win_loss': result.win_loss,
                    'confidence_score': result.confidence_score,
                    'risk_score': result.risk_score
                }
                writer.writerow(row)
        
        logger.info(f"Results exported to {filename}")


# Example usage
if __name__ == "__main__":
    # Initialize backtest engine
    engine = SimpleBacktestEngine(initial_capital=10000.0)
    
    print("APHELION Simplified Backtesting Engine - MVP Version")
    print("=" * 60)
    print(f"Initial capital: ${engine.initial_capital:,.2f}")
    print(f"Commission rate: {engine.commission_rate:.1%}")
    print(f"Slippage rate: {engine.slippage_rate:.1%}")
    print("\nReady for integration with:")
    print("1. Recommendation engine outputs")
    print("2. Historical market data")
    print("3. Desktop app performance display")
    print("4. Risk management protocols")