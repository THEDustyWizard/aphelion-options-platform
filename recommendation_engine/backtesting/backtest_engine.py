class BacktestEngine:
    """Main backtesting engine."""
    
    def __init__(self, scoring_engine, initial_capital: float = 100000):
        self.scoring_engine = scoring_engine
        self.initial_capital = initial_capital
        self.signal_generator = SignalGenerator(scoring_engine)
        
        logger.info("Backtest engine initialized")
    
    def run_backtest(self, start_date: str, end_date: str, 
                    universe: List[str], params: Dict) -> Dict:
        """
        Run complete backtest.
        
        Args:
            start_date: Start date for backtest
            end_date: End date for backtest
            universe: List of tickers to test
            params: Backtest parameters
            
        Returns:
            Backtest results
        """
        logger.info(f"Starting backtest: {start_date} to {end_date}")
        
        # Initialize components
        data_provider = BacktestData(start_date, end_date)
        trade_simulator = TradeSimulator(initial_capital=self.initial_capital)
        
        # Generate date range
        dates = pd.date_range(start=start_date, end=end_date, freq='B')  # Business days
        
        # Main backtest loop
        for date in dates:
            try:
                # Generate signals for this date
                signals = self.signal_generator.generate_signals(date, universe, data_provider)
                
                # Execute trades based on signals
                for signal in signals:
                    trade = trade_simulator.execute_trade(signal, date, data_provider)
                    if trade:
                        logger.debug(f"Opened trade: {trade['ticker']} {trade['strategy']}")
                
                # Close expired positions (simplified - would check expiration)
                self._close_expired_positions(trade_simulator, date, data_provider)
                
                # Update equity curve
                trade_simulator.update_equity_curve(date)
                
            except Exception as e:
                logger.error(f"Error in backtest on {date}: {e}")
                continue
        
        # Close all remaining positions at end
        self._close_all_positions(trade_simulator, dates[-1], data_provider)
        
        # Calculate performance metrics
        performance = PerformanceMetrics(trade_simulator.trade_history, trade_simulator.equity_curve)
        metrics = performance.calculate_all_metrics()
        
        # Generate report
        report = performance.generate_report()
        
        results = {
            'parameters': params,
            'performance': metrics,
            'trade_history': trade_simulator.trade_history,
            'equity_curve': trade_simulator.equity_curve,
            'final_capital': trade_simulator.capital,
            'report': report
        }
        
        logger.info(f"Backtest completed. Final capital: ${trade_simulator.capital:,.2f}")
        
        return results
    
    def _close_expired_positions(self, trade_simulator: TradeSimulator, 
                                date: datetime, data_provider: BacktestData):
        """Close positions that have expired."""
        # Simplified implementation
        # In production, would check option expiration dates
        
        positions_to_close = []
        for position in trade_simulator.positions:
            # Check if position has been held for max days
            entry_date = pd.to_datetime(position['date'])
            holding_days = (date - entry_date).days
            
            if holding_days >= position.get('expiration_days', 30):
                positions_to_close.append(position)
        
        for position in positions_to_close:
            # Estimate exit price
            ticker = position['ticker']
            current_price = data_provider.get_price(ticker, date)
            
            if current_price is None:
                continue
            
            # Simplified exit price estimation
            if isinstance(position['strike'], dict):
                exit_price = 0.1  # Small value for expired options
            else:
                # Check if option expired in the money
                strike = position['strike']
                if position['direction'] == 'bullish':
                    itm = current_price > strike
                else:
                    itm = current_price < strike
                
                exit_price = max(0.01, abs(current_price - strike)) if itm else 0.01
            
            trade_simulator.close_position(position, date, exit_price)
    
    def _close_all_positions(self, trade_simulator: TradeSimulator, 
                            date: datetime, data_provider: BacktestData):
        """Close all open positions."""
        for position in trade_simulator.positions[:]:  # Copy list
            ticker = position['ticker']
            current_price = data_provider.get_price(ticker, date)
            
            if current_price is None:
                exit_price = 0.01
            else:
                # Simplified exit logic
                exit_price = 0.1  # Small value for forced closure
            
            trade_simulator.close_position(position, date, exit_price)


class MonteCarloSimulator:
    """Monte Carlo simulation for strategy robustness testing."""
    
    def __init__(self, backtest_results: Dict):
        self.backtest_results = backtest_results
        self.trade_history = backtest_results.get('trade_history', [])
        
        logger.info("Monte Carlo simulator initialized")
    
    def run_simulation(self, num_simulations: int = 1000, 
                      randomization_method: str = 'bootstrap') -> Dict:
        """
        Run Monte Carlo simulation.
        
        Args:
            num_simulations: Number of simulations to run
            randomization_method: 'bootstrap' or 'parametric'
            
        Returns:
            Simulation results
        """
        logger.info(f"Starting Monte Carlo simulation ({num_simulations} runs)")
        
        simulations = []
        
        for i in range(num_simulations):
            try:
                # Create randomized trade sequence
                if randomization_method == 'bootstrap':
                    randomized_trades = self._bootstrap_trades()
                else:
                    randomized_trades = self._parametric_trades()
                
                # Simulate equity curve
                equity_curve = self._simulate_equity_curve(randomized_trades)
                
                # Calculate metrics
                metrics = self._calculate_simulation_metrics(randomized_trades, equity_curve)
                
                simulations.append(metrics)
                
                if (i + 1) % 100 == 0:
                    logger.info(f"Completed {i + 1}/{num_simulations} simulations")
                    
            except Exception as e:
                logger.error(f"Error in simulation {i}: {e}")
                continue
        
        # Calculate statistics across all simulations
        results = self._aggregate_simulation_results(simulations)
        
        logger.info("Monte Carlo simulation completed")
        return results
    
    def _bootstrap_trades(self) -> List[Dict]:
        """Create bootstrap sample of trades."""
        if not self.trade_history:
            return []
        
        # Sample trades with replacement
        n = len(self.trade_history)
        indices = np.random.choice(n, size=n, replace=True)
        
        randomized_trades = []
        for idx in indices:
            trade = self.trade_history[idx].copy()
            # Add some randomness to trade outcomes
            trade['pnl_after_commissions'] *= np.random.normal(1.0, 0.1)
            randomized_trades.append(trade)
        
        return randomized_trades
    
    def _parametric_trades(self) -> List[Dict]:
        """Create parametric sample of trades."""
        if not self.trade_history:
            return []
        
        # Calculate statistics from historical trades
        pnls = [t.get('pnl_after_commissions', 0) for t in self.trade_history]
        mean_pnl = np.mean(pnls)
        std_pnl = np.std(pnls)
        
        # Generate new trades with similar distribution
        randomized_trades = []
        for trade in self.trade_history:
            new_trade = trade.copy()
            # Generate new P&L from distribution
            new_pnl = np.random.normal(mean_pnl, std_pnl)
            new_trade['pnl_after_commissions'] = new_pnl
            randomized_trades.append(new_trade)
        
        return randomized_trades
    
    def _simulate_equity_curve(self, trades: List[Dict]) -> List[Dict]:
        """Simulate equity curve from trades."""
        if not trades:
            return []
        
        # Sort trades by date
        sorted_trades = sorted(trades, key=lambda x: x.get('date', ''))
        
        # Simulate equity curve
        equity = self.backtest_results['performance'].get('initial_capital', 100000)
        equity_curve = []
        
        current_date = None
        for trade in sorted_trades:
            trade_date = trade.get('date')
            if trade_date != current_date:
                if current_date is not None:
                    equity_curve.append({
                        'date': current_date,
                        'equity': equity
                    })
                current_date = trade_date
            
            # Apply trade P&L
            equity += trade.get('pnl_after_commissions', 0)
        
        # Add final point
        if current_date is not None:
            equity_curve.append({
                'date': current_date,
                'equity': equity
            })
        
        return equity_curve
    
    def _calculate_simulation_metrics(self, trades: List[Dict], 
                                     equity_curve: List[Dict]) -> Dict:
        """Calculate metrics for a single simulation."""
        performance = PerformanceMetrics(trades, equity_curve)
        metrics = performance.calculate_all_metrics()
        
        return metrics
    
    def _aggregate_simulation_results(self, simulations: List[Dict]) -> Dict:
        """Aggregate results across all simulations."""
        if not simulations:
            return {}
        
        # Extract key metrics
        total_returns = [s.get('total_return', 0) for s in simulations]
        sharpe_ratios = [s.get('sharpe_ratio', 0) for s in simulations]
        max_drawdowns = [s.get('max_drawdown', 0) for s in simulations]
        win_rates = [s.get('win_rate', 0) for s in simulations]
        
        # Calculate statistics
        results = {
            'num_simulations': len(simulations),
            'mean_return': np.mean(total_returns),
            'std_return': np.std(total_returns),
            'mean_sharpe': np.mean(sharpe_ratios),
            'std_sharpe': np.std(sharpe_ratios),
            'mean_max_dd': np.mean(max_drawdowns),
            'std_max_dd': np.std(max_drawdowns),
            'mean_win_rate': np.mean(win_rates),
            'std_win_rate': np.std(win_rates),
            
            # Percentiles
            'return_5th': np.percentile(total_returns, 5),
            'return_50th': np.percentile(total_returns, 50),
            'return_95th': np.percentile(total_returns, 95),
            
            'sharpe_5th': np.percentile(sharpe_ratios, 5),
            'sharpe_50th': np.percentile(sharpe_ratios, 50),
            'sharpe_95th': np.percentile(sharpe_ratios, 95),
            
            'max_dd_5th': np.percentile(max_drawdowns, 5),
            'max_dd_50th': np.percentile(max_drawdowns, 50),
            'max_dd_95th': np.percentile(max_drawdowns, 95),
            
            # Probability calculations
            'prob_positive_return': np.mean([1 if r > 0 else 0 for r in total_returns]),
            'prob_sharpe_gt_1': np.mean([1 if s > 1 else 0 for s in sharpe_ratios]),
            'prob_max_dd_lt_20pct': np.mean([1 if dd < 0.20 else 0 for dd in max_drawdowns])
        }
        
        return results
    
    def generate_monte_carlo_report(self, simulation_results: Dict) -> str:
        """Generate Monte Carlo simulation report."""
        report = []
        report.append("=" * 60)
        report.append("MONTE CARLO SIMULATION REPORT")
        report.append("=" * 60)
        report.append(f"Number of Simulations: {simulation_results['num_simulations']:,}")
        report.append("")
        
        # Return distribution
        report.append("RETURN DISTRIBUTION")
        report.append("-" * 40)
        report.append(f"Mean Return: {simulation_results['mean_return']:.2%}")
        report.append(f"Std Dev: {simulation_results['std_return']:.2%}")
        report.append(f"5th Percentile: {simulation_results['return_5th']:.2%}")
        report.append(f"Median (50th): {simulation_results['return_50th']:.2%}")
        report.append(f"95th Percentile: {simulation_results['return_95th']:.2%}")
        report.append(f"Probability of Positive Return: {simulation_results['prob_positive_return']:.1%}")
        report.append("")
        
        # Risk metrics
        report.append("RISK METRICS DISTRIBUTION")
        report.append("-" * 40)
        report.append(f"Mean Sharpe Ratio: {simulation_results['mean_sharpe']:.2f}")
        report.append(f"Std Dev: {simulation_results['std_sharpe']:.2f}")
        report.append(f"Probability Sharpe > 1: {simulation_results['prob_sharpe_gt_1']:.1%}")
        report.append("")
        report.append(f"Mean Max Drawdown: {simulation_results['mean_max_dd']:.2%}")
        report.append(f"Std Dev: {simulation_results['std_max_dd']:.2%}")
        report.append(f"Probability Max DD < 20%: {simulation_results['prob_max_dd_lt_20pct']:.1%}")
        report.append("")
        
        # Win rate distribution
        report.append("WIN RATE DISTRIBUTION")
        report.append("-" * 40)
        report.append(f"Mean Win Rate: {simulation_results['mean_win_rate']:.2%}")
        report.append(f"Std Dev: {simulation_results['std_win_rate']:.2%}")
        report.append("")
        
        # Interpretation
        report.append("INTERPRETATION")
        report.append("-" * 40)
        if simulation_results['prob_positive_return'] > 0.7:
            report.append("✓ Strategy shows high probability of positive returns")
        else:
            report.append("⚠ Strategy has moderate probability of positive returns")
        
        if simulation_results['prob_sharpe_gt_1'] > 0.6:
            report.append("✓ Strategy likely to achieve good risk-adjusted returns")
        else:
            report.append("⚠ Risk-adjusted returns may be suboptimal")
        
        if simulation_results['prob_max_dd_lt_20pct'] > 0.8:
            report.append("✓ Drawdown risk appears well-controlled")
        else:
            report.append("⚠ Significant drawdown risk present")
        
        report.append("")
        report.append("=" * 60)
        
        return "\n".join(report)


# Example usage
if __name__ == "__main__":
    print("APHELION Backtesting Engine")
    print("=" * 50)
    
    # Note: This is a demonstration of the architecture
    # Full implementation would require actual data sources
    
    print("\nBacktesting engine components implemented:")
    print("1. BacktestData - Historical data management")
    print("2. SignalGenerator - Historical signal generation")
    print("3. TradeSimulator - Trade execution simulation")
    print("4. PerformanceMetrics - Comprehensive metrics calculation")
    print("5. BacktestEngine - Main backtesting orchestration")
    print("6. MonteCarloSimulator - Robustness testing")
    
    print("\nKey features:")
    print("- Sector-specific scoring adaptations")
    print("- Realistic trade simulation with commissions/slippage")
    print("- Comprehensive risk metrics (VaR, CVaR, max drawdown)")
    print("- Monte Carlo simulation for strategy robustness")
    print("- Performance reporting and analysis")
    
    print("\nReady for integration with APHELION recommendation engine!")