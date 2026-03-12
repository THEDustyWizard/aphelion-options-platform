        # Adjust for risk score
        risk_adjustment = 1.0 - (risk_score / 100)
        adjusted_allocation = base_allocation * risk_adjustment
        
        # Apply position sizing method
        method = self.risk_parameters['position_sizing_method']
        
        if method == 'kelly_conservative':
            # Conservative Kelly (half-Kelly)
            final_allocation = adjusted_allocation * 0.5
        elif method == 'kelly_moderate':
            # Standard Kelly
            final_allocation = adjusted_allocation
        else:  # kelly_aggressive
            # Aggressive Kelly (1.5x Kelly)
            final_allocation = adjusted_allocation * 1.5
        
        # Ensure within bounds
        final_allocation = max(0.005, min(final_allocation, 0.10))  # 0.5% to 10%
        
        return final_allocation
    
    def monitor_portfolio_risk(self, portfolio_state: Dict) -> Dict:
        """
        Monitor ongoing portfolio risk.
        
        Args:
            portfolio_state: Current portfolio state
            
        Returns:
            Risk monitoring results
        """
        monitoring_results = {}
        
        # 1. Calculate current risk metrics
        current_metrics = self._calculate_current_risk_metrics(portfolio_state)
        monitoring_results['current_metrics'] = current_metrics
        
        # 2. Check for risk threshold breaches
        breaches = self._check_risk_thresholds(current_metrics)
        monitoring_results['breaches'] = breaches
        
        # 3. Calculate stress test results
        stress_test = self._run_stress_tests(portfolio_state)
        monitoring_results['stress_test'] = stress_test
        
        # 4. Generate alerts if needed
        alerts = self._generate_risk_alerts(breaches, current_metrics)
        monitoring_results['alerts'] = alerts
        
        # 5. Update risk history
        self._update_risk_history(current_metrics)
        
        logger.info(f"Portfolio risk monitoring completed. Alerts: {len(alerts)}")
        
        return monitoring_results
    
    def _calculate_current_risk_metrics(self, portfolio_state: Dict) -> Dict:
        """Calculate current portfolio risk metrics."""
        metrics = {}
        
        # Basic metrics
        metrics['portfolio_value'] = portfolio_state.get('portfolio_value', self.current_capital)
        metrics['cash_balance'] = portfolio_state.get('cash_balance', self.current_capital)
        metrics['num_positions'] = portfolio_state.get('num_positions', 0)
        
        # Exposure metrics
        metrics['sector_exposure'] = portfolio_state.get('sector_exposure', {})
        metrics['largest_position_pct'] = portfolio_state.get('largest_position_pct', 0)
        metrics['top_3_concentration'] = portfolio_state.get('top_3_concentration', 0)
        
        # Risk metrics
        metrics['portfolio_beta'] = portfolio_state.get('portfolio_beta', 1.0)
        metrics['portfolio_volatility'] = portfolio_state.get('portfolio_volatility', 0.15)
        
        # Calculate Value at Risk
        metrics['daily_var_95'] = self._calculate_portfolio_var(portfolio_state, confidence=0.95)
        metrics['daily_var_99'] = self._calculate_portfolio_var(portfolio_state, confidence=0.99)
        
        # Calculate expected shortfall
        metrics['expected_shortfall_95'] = metrics['daily_var_95'] * 1.5  # Simplified
        
        # Calculate maximum drawdown
        metrics['current_drawdown'] = portfolio_state.get('current_drawdown', 0)
        
        return metrics
    
    def _calculate_portfolio_var(self, portfolio_state: Dict, confidence: float = 0.95) -> float:
        """Calculate portfolio Value at Risk."""
        # Simplified calculation
        # In production, would use historical simulation or parametric methods
        
        portfolio_value = portfolio_state.get('portfolio_value', self.current_capital)
        portfolio_volatility = portfolio_state.get('portfolio_volatility', 0.15)
        
        # Parametric VaR
        from scipy.stats import norm
        z_score = norm.ppf(confidence)
        
        daily_var = portfolio_value * portfolio_volatility / np.sqrt(252) * z_score
        
        return abs(daily_var)
    
    def _check_risk_thresholds(self, current_metrics: Dict) -> List[Dict]:
        """Check for risk threshold breaches."""
        breaches = []
        
        # Check each threshold
        thresholds = [
            ('max_drawdown_pct', 'current_drawdown', 'Max drawdown'),
            ('max_position_size_pct', 'largest_position_pct', 'Position concentration'),
            ('max_sector_exposure_pct', self._get_max_sector_exposure(current_metrics), 'Sector exposure'),
            ('max_portfolio_beta', 'portfolio_beta', 'Portfolio beta'),
            ('max_var_pct', current_metrics['daily_var_95'] / current_metrics['portfolio_value'], 'Daily VaR')
        ]
        
        for param_key, metric_value, description in thresholds:
            if isinstance(metric_value, str):
                # Function call
                if metric_value == '_get_max_sector_exposure':
                    actual_value = self._get_max_sector_exposure(current_metrics)
                else:
                    actual_value = 0
            else:
                actual_value = metric_value
            
            limit = self.risk_parameters.get(param_key, float('inf'))
            
            if actual_value > limit:
                breaches.append({
                    'threshold': description,
                    'value': actual_value,
                    'limit': limit,
                    'severity': self._calculate_breach_severity(actual_value, limit)
                })
        
        return breaches
    
    def _get_max_sector_exposure(self, current_metrics: Dict) -> float:
        """Get maximum sector exposure."""
        sector_exposure = current_metrics.get('sector_exposure', {})
        if not sector_exposure:
            return 0
        
        return max(sector_exposure.values())
    
    def _calculate_breach_severity(self, value: float, limit: float) -> str:
        """Calculate severity of threshold breach."""
        excess = (value - limit) / limit
        
        if excess > 0.5:
            return "CRITICAL"
        elif excess > 0.2:
            return "HIGH"
        elif excess > 0.1:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _run_stress_tests(self, portfolio_state: Dict) -> Dict:
        """Run stress tests on portfolio."""
        stress_scenarios = {
            'market_crash': -0.10,  # 10% market drop
            'volatility_spike': 0.05,  # 5% increase in volatility
            'sector_downturn': -0.15,  # 15% sector-specific drop
            'liquidity_crisis': -0.20,  # 20% illiquidity discount
            'black_swan': -0.30  # 30% extreme event
        }
        
        results = {}
        portfolio_value = portfolio_state.get('portfolio_value', self.current_capital)
        
        for scenario, impact in stress_scenarios.items():
            # Simplified impact calculation
            # In production, would use detailed scenario analysis
            
            scenario_loss = portfolio_value * impact * portfolio_state.get('portfolio_beta', 1.0)
            results[scenario] = {
                'impact_pct': impact,
                'estimated_loss': abs(scenario_loss),
                'survival': scenario_loss > -portfolio_value * 0.5  # Survive if loss < 50%
            }
        
        return results
    
    def _generate_risk_alerts(self, breaches: List[Dict], current_metrics: Dict) -> List[Dict]:
        """Generate risk alerts."""
        alerts = []
        
        # Add alerts for breaches
        for breach in breaches:
            alerts.append({
                'type': 'THRESHOLD_BREACH',
                'severity': breach['severity'],
                'message': f"{breach['threshold']} breach: {breach['value']:.1%} > {breach['limit']:.1%}",
                'timestamp': datetime.now().isoformat(),
                'action_required': breach['severity'] in ['HIGH', 'CRITICAL']
            })
        
        # Add alerts for high risk levels
        if current_metrics.get('portfolio_beta', 1.0) > 1.3:
            alerts.append({
                'type': 'HIGH_BETA',
                'severity': 'MEDIUM',
                'message': f"Portfolio beta elevated: {current_metrics['portfolio_beta']:.2f}",
                'timestamp': datetime.now().isoformat(),
                'action_required': False
            })
        
        # Add alerts for low diversification
        if current_metrics.get('num_positions', 0) < self.risk_parameters['min_diversification']:
            alerts.append({
                'type': 'LOW_DIVERSIFICATION',
                'severity': 'MEDIUM',
                'message': f"Low diversification: {current_metrics['num_positions']} positions",
                'timestamp': datetime.now().isoformat(),
                'action_required': False
            })
        
        # Add alerts for high drawdown
        if current_metrics.get('current_drawdown', 0) > self.risk_parameters['max_drawdown_pct'] * 0.8:
            alerts.append({
                'type': 'ELEVATED_DRAWDOWN',
                'severity': 'MEDIUM',
                'message': f"Drawdown approaching limit: {current_metrics['current_drawdown']:.1%}",
                'timestamp': datetime.now().isoformat(),
                'action_required': False
            })
        
        return alerts
    
    def _update_risk_history(self, current_metrics: Dict):
        """Update risk history for trend analysis."""
        history_entry = {
            'timestamp': datetime.now().isoformat(),
            'metrics': current_metrics.copy()
        }
        
        self.risk_history.append(history_entry)
        
        # Keep only last 1000 entries
        if len(self.risk_history) > 1000:
            self.risk_history = self.risk_history[-1000:]
    
    def generate_risk_report(self, portfolio_state: Dict) -> str:
        """Generate comprehensive risk report."""
        monitoring_results = self.monitor_portfolio_risk(portfolio_state)
        
        report = []
        report.append("=" * 60)
        report.append("APHELION RISK MANAGEMENT REPORT")
        report.append("=" * 60)
        report.append(f"Risk Level: {self.risk_level.name}")
        report.append(f"Report Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Portfolio Summary
        report.append("PORTFOLIO SUMMARY")
        report.append("-" * 40)
        report.append(f"Portfolio Value: ${portfolio_state.get('portfolio_value', 0):,.2f}")
        report.append(f"Cash Balance: ${portfolio_state.get('cash_balance', 0):,.2f}")
        report.append(f"Number of Positions: {portfolio_state.get('num_positions', 0)}")
        report.append("")
        
        # Risk Metrics
        report.append("RISK METRICS")
        report.append("-" * 40)
        metrics = monitoring_results['current_metrics']
        report.append(f"Portfolio Beta: {metrics.get('portfolio_beta', 1.0):.2f}")
        report.append(f"Portfolio Volatility: {metrics.get('portfolio_volatility', 0):.2%}")
        report.append(f"Current Drawdown: {metrics.get('current_drawdown', 0):.2%}")
        report.append(f"95% Daily VaR: ${metrics.get('daily_var_95', 0):,.2f}")
        report.append(f"99% Daily VaR: ${metrics.get('daily_var_99', 0):,.2f}")
        report.append("")
        
        # Exposure Analysis
        report.append("EXPOSURE ANALYSIS")
        report.append("-" * 40)
        sector_exposure = metrics.get('sector_exposure', {})
        if sector_exposure:
            for sector, exposure in sector_exposure.items():
                limit = self.risk_parameters['max_sector_exposure_pct']
                status = "✓" if exposure <= limit else "⚠"
                report.append(f"{status} {sector.upper():12s}: {exposure:6.1%} (Limit: {limit:.1%})")
        report.append(f"Largest Position: {metrics.get('largest_position_pct', 0):.1%}")
        report.append(f"Top 3 Concentration: {portfolio_state.get('top_3_concentration', 0):.1%}")
        report.append("")
        
        # Threshold Breaches
        breaches = monitoring_results['breaches']
        if breaches:
            report.append("THRESHOLD BREACHES")
            report.append("-" * 40)
            for breach in breaches:
                report.append(f"⚠ {breach['threshold']}: {breach['value']:.1%} > {breach['limit']:.1%} "
                             f"({breach['severity']})")
            report.append("")
        
        # Stress Test Results
        report.append("STRESS TEST RESULTS")
        report.append("-" * 40)
        stress_test = monitoring_results['stress_test']
        for scenario, result in stress_test.items():
            survival = "✓" if result['survival'] else "✗"
            report.append(f"{survival} {scenario.replace('_', ' ').title():20s}: "
                         f"-{result['impact_pct']:.1%} (${result['estimated_loss']:,.2f})")
        report.append("")
        
        # Alerts
        alerts = monitoring_results['alerts']
        if alerts:
            report.append("ACTIVE ALERTS")
            report.append("-" * 40)
            for alert in alerts:
                action = "ACTION REQUIRED" if alert['action_required'] else "Monitor"
                report.append(f"{alert['severity']}: {alert['message']} [{action}]")
            report.append("")
        
        # Recommendations
        report.append("RISK MANAGEMENT RECOMMENDATIONS")
        report.append("-" * 40)
        recommendations = self._generate_recommendations(monitoring_results)
        for i, rec in enumerate(recommendations, 1):
            report.append(f"{i}. {rec}")
        report.append("")
        
        report.append("=" * 60)
        
        return "\n".join(report)
    
    def _generate_recommendations(self, monitoring_results: Dict) -> List[str]:
        """Generate risk management recommendations."""
        recommendations = []
        
        breaches = monitoring_results['breaches']
        metrics = monitoring_results['current_metrics']
        
        # Recommendations for breaches
        for breach in breaches:
            if breach['severity'] in ['HIGH', 'CRITICAL']:
                recommendations.append(
                    f"Reduce {breach['threshold'].lower()} from {breach['value']:.1%} "
                    f"to below {breach['limit']:.1%}"
                )
        
        # Diversification recommendation
        if metrics.get('num_positions', 0) < self.risk_parameters['min_diversification']:
            recommendations.append(
                f"Increase diversification from {metrics['num_positions']} to "
                f"at least {self.risk_parameters['min_diversification']} positions"
            )
        
        # Beta recommendation
        if metrics.get('portfolio_beta', 1.0) > 1.2:
            recommendations.append(
                f"Reduce portfolio beta from {metrics['portfolio_beta']:.2f} to below 1.2 "
                "by adding defensive positions"
            )
        
        # Drawdown protection
        if metrics.get('current_drawdown', 0) > self.risk_parameters['max_drawdown_pct'] * 0.7:
            recommendations.append(
                "Consider implementing stop-losses or reducing position sizes "
                "to protect against further drawdown"
            )
        
        # If no specific issues, provide general guidance
        if not recommendations:
            recommendations.append(
                "Portfolio risk profile appears healthy. Continue current strategy "
                "with regular monitoring"
            )
        
        return recommendations
    
    def adjust_risk_level(self, new_level: RiskLevel):
        """Adjust risk tolerance level."""
        old_level = self.risk_level
        self.risk_level = new_level
        self.risk_parameters = self._get_risk_parameters(new_level)
        
        logger.info(f"Risk level adjusted from {old_level.name} to {new_level.name}")
        
        # Generate adjustment report
        report = self._generate_risk_adjustment_report(old_level, new_level)
        
        return report
    
    def _generate_risk_adjustment_report(self, old_level: RiskLevel, new_level: RiskLevel) -> str:
        """Generate report on risk level adjustment."""
        old_params = self._get_risk_parameters(old_level)
        new_params = self.risk_parameters
        
        report = []
        report.append("=" * 60)
        report.append("RISK LEVEL ADJUSTMENT REPORT")
        report.append("=" * 60)
        report.append(f"From: {old_level.name} → To: {new_level.name}")
        report.append(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        report.append("PARAMETER CHANGES")
        report.append("-" * 40)
        
        for param in old_params:
            old_value = old_params[param]
            new_value = new_params[param]
            
            if old_value != new_value:
                change_pct = (new_value - old_value) / old_value * 100
                
                # Format based on parameter type
                if 'pct' in param:
                    old_str = f"{old_value:.1%}"
                    new_str = f"{new_value:.1%}"
                elif param == 'min_diversification':
                    old_str = str(int(old_value))
                    new_str = str(int(new_value))
                elif param == 'max_portfolio_beta