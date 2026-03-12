#!/usr/bin/env python3
"""
APHELION Desktop App Integration Module
Quant Rex - Integration with Electron desktop app (2000s CIA terminal aesthetic)
"""

import json
import logging
import socket
import threading
import time
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
import sys
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DesktopIntegration:
    """
    Integration with APHELION desktop application.
    Handles communication with Electron app using WebSocket/HTTP.
    Implements retro terminal aesthetic data formatting.
    """
    
    def __init__(self, host: str = "localhost", port: int = 3001,
                 retro_mode: bool = True):
        self.host = host
        self.port = port
        self.retro_mode = retro_mode
        self.connected = False
        self.callbacks = {}
        
        # Retro terminal color codes (ANSI)
        self.colors = {
            'black': '\033[30m',
            'red': '\033[31m',
            'green': '\033[32m',
            'yellow': '\033[33m',
            'blue': '\033[34m',
            'magenta': '\033[35m',
            'cyan': '\033[36m',
            'white': '\033[37m',
            'bright_black': '\033[90m',
            'bright_red': '\033[91m',
            'bright_green': '\033[92m',
            'bright_yellow': '\033[93m',
            'bright_blue': '\033[94m',
            'bright_magenta': '\033[95m',
            'bright_cyan': '\033[96m',
            'bright_white': '\033[97m',
            'reset': '\033[0m',
            'bold': '\033[1m',
            'dim': '\033[2m',
            'underline': '\033[4m',
            'blink': '\033[5m',
            'reverse': '\033[7m'
        }
        
        # Terminal box drawing characters
        self.box_chars = {
            'horizontal': '─',
            'vertical': '│',
            'top_left': '┌',
            'top_right': '┐',
            'bottom_left': '└',
            'bottom_right': '┘',
            'cross': '┼',
            't_left': '├',
            't_right': '┤',
            't_top': '┬',
            't_bottom': '┴'
        }
        
        logger.info(f"Desktop integration initialized (retro mode: {retro_mode})")
    
    def format_recommendation(self, recommendation: Dict[str, Any]) -> str:
        """
        Format recommendation for retro terminal display.
        """
        if not self.retro_mode:
            return json.dumps(recommendation, indent=2)
        
        ticker = recommendation.get('ticker', 'UNKNOWN')
        sector = recommendation.get('sector', 'UNKNOWN').upper()
        confidence = recommendation.get('confidence', 0)
        strategy = recommendation.get('strategy', 'UNKNOWN')
        current_price = recommendation.get('current_price', 0)
        strike_price = recommendation.get('strike_price', 0)
        expiration_days = recommendation.get('expiration_days', 0)
        
        # Determine color based on confidence
        if confidence >= 80:
            ticker_color = self.colors['bright_green']
            confidence_color = self.colors['green']
        elif confidence >= 60:
            ticker_color = self.colors['bright_yellow']
            confidence_color = self.colors['yellow']
        else:
            ticker_color = self.colors['bright_red']
            confidence_color = self.colors['red']
        
        # Determine strategy color
        if 'Call' in strategy:
            strategy_color = self.colors['bright_green']
        elif 'Put' in strategy:
            strategy_color = self.colors['bright_red']
        else:
            strategy_color = self.colors['bright_cyan']
        
        # Create terminal-style display
        width = 60
        
        lines = []
        lines.append(self._create_box_top(width))
        
        # Header line
        header = f"APHELION // {ticker} ({sector})"
        padded_header = header.center(width - 4)
        lines.append(f"{self.box_chars['vertical']} {self.colors['bright_white']}{padded_header}{self.colors['reset']} {self.box_chars['vertical']}")
        
        lines.append(self._create_separator(width))
        
        # Confidence line
        conf_bar = self._create_progress_bar(confidence, 20)
        conf_line = f"CONFIDENCE: {confidence_color}{confidence:3d}%{self.colors['reset']} {conf_bar}"
        lines.append(self._format_line(conf_line, width))
        
        # Strategy line
        strat_line = f"STRATEGY:   {strategy_color}{strategy:<20}{self.colors['reset']}"
        lines.append(self._format_line(strat_line, width))
        
        # Price line
        price_line = f"PRICE:      ${current_price:>8.2f} → ${strike_price:>8.2f}"
        lines.append(self._format_line(price_line, width))
        
        # Expiration line
        exp_date = (datetime.now() + timedelta(days=expiration_days)).strftime('%Y-%m-%d')
        exp_line = f"EXPIRES:    {expiration_days:3d} days ({exp_date})"
        lines.append(self._format_line(exp_line, width))
        
        # Scores line (if available)
        if 'scores' in recommendation:
            scores = recommendation['scores']
            scores_line = f"SCORES:     T:{scores.get('technical',0):3d} F:{scores.get('fundamental',0):3d} S:{scores.get('sentiment',0):3d}"
            lines.append(self._format_line(scores_line, width))
        
        # Risk line (if available)
        if 'risk_score' in recommendation:
            risk = recommendation['risk_score']
            risk_color = self.colors['bright_green'] if risk <= 30 else self.colors['bright_yellow'] if risk <= 60 else self.colors['bright_red']
            risk_line = f"RISK:       {risk_color}{risk:3d}/100{self.colors['reset']}"
            lines.append(self._format_line(risk_line, width))
        
        lines.append(self._create_box_bottom(width))
        
        return '\n'.join(lines)
    
    def format_backtest_results(self, results: Dict[str, Any]) -> str:
        """
        Format backtest results for retro terminal display.
        """
        if not self.retro_mode:
            return json.dumps(results, indent=2)
        
        width = 70
        
        lines = []
        lines.append(self._create_box_top(width))
        
        # Header
        header = "BACKTEST RESULTS"
        padded_header = header.center(width - 4)
        lines.append(f"{self.box_chars['vertical']} {self.colors['bright_white']}{padded_header}{self.colors['reset']} {self.box_chars['vertical']}")
        
        lines.append(self._create_separator(width))
        
        # Performance metrics
        total_trades = results.get('total_trades', 0)
        winning_trades = results.get('winning_trades', 0)
        win_rate = results.get('win_rate', 0) * 100
        total_pnl = results.get('total_pnl', 0)
        final_portfolio = results.get('final_portfolio', 0)
        total_return = results.get('total_return', 0)
        max_drawdown = results.get('max_drawdown', 0)
        
        # Win rate color
        if win_rate >= 60:
            win_color = self.colors['bright_green']
        elif win_rate >= 50:
            win_color = self.colors['bright_yellow']
        else:
            win_color = self.colors['bright_red']
        
        # P&L color
        if total_pnl > 0:
            pnl_color = self.colors['bright_green']
        else:
            pnl_color = self.colors['bright_red']
        
        # Drawdown color
        if max_drawdown <= 10:
            dd_color = self.colors['bright_green']
        elif max_drawdown <= 20:
            dd_color = self.colors['bright_yellow']
        else:
            dd_color = self.colors['bright_red']
        
        # Metrics lines
        metrics = [
            f"TRADES:     {total_trades:4d}  (W:{winning_trades:3d} L:{total_trades-winning_trades:3d})",
            f"WIN RATE:   {win_color}{win_rate:6.1f}%{self.colors['reset']}",
            f"TOTAL P&L:  {pnl_color}${total_pnl:10.2f}{self.colors['reset']}",
            f"RETURN:     {pnl_color}{total_return:6.1f}%{self.colors['reset']}",
            f"PORTFOLIO:  ${final_portfolio:10.2f}",
            f"DRAWDOWN:   {dd_color}{max_drawdown:6.1f}%{self.colors['reset']}"
        ]
        
        for metric in metrics:
            lines.append(self._format_line(metric, width))
        
        lines.append(self._create_separator(width))
        
        # Sector performance
        sector_perf = results.get('sector_performance', {})
        if sector_perf:
            lines.append(self._format_line("SECTOR PERFORMANCE:", width))
            
            for sector, perf in sector_perf.items():
                trades = perf.get('trades', 0)
                pnl = perf.get('pnl', 0)
                wins = perf.get('wins', 0)
                win_rate_sector = (wins / trades * 100) if trades > 0 else 0
                
                sector_line = f"  {sector.upper():10s} {trades:3d} trades  ${pnl:8.2f}  {win_rate_sector:5.1f}%"
                lines.append(self._format_line(sector_line, width))
        
        lines.append(self._create_box_bottom(width))
        
        return '\n'.join(lines)
    
    def format_greeks(self, greeks: Dict[str, float]) -> str:
        """
        Format Greeks for retro terminal display.
        """
        if not self.retro_mode:
            return json.dumps(greeks, indent=2)
        
        width = 50
        
        lines = []
        lines.append(self._create_box_top(width))
        
        header = "OPTIONS GREEKS"
        padded_header = header.center(width - 4)
        lines.append(f"{self.box_chars['vertical']} {self.colors['bright_white']}{padded_header}{self.colors['reset']} {self.box_chars['vertical']}")
        
        lines.append(self._create_separator(width))
        
        # Format each Greek with appropriate color
        greek_display = [
            ('DELTA', greeks.get('delta', 0), -1, 1),
            ('GAMMA', greeks.get('gamma', 0), 0, 0.1),
            ('THETA', greeks.get('theta', 0), -0.1, 0),
            ('VEGA', greeks.get('vega', 0), 0, 0.2)
        ]
        
        for name, value, low, high in greek_display:
            # Determine color based on value
            if name == 'THETA':  # Negative is normal for theta
                if value > -0.01:
                    color = self.colors['bright_green']  # Low time decay
                elif value > -0.05:
                    color = self.colors['bright_yellow']  # Moderate decay
                else:
                    color = self.colors['bright_red']  # High decay
            else:
                # For other Greeks, middle range is good
                if low <= value <= high:
                    color = self.colors['bright_green']
                else:
                    color = self.colors['bright_red']
            
            line = f"{name:6s}: {color}{value:8.4f}{self.colors['reset']}"
            lines.append(self._format_line(line, width))
        
        # IV metrics
        if 'iv_percentile' in greeks:
            iv_pct = greeks.get('iv_percentile', 50)
            iv_color = self.colors['bright_green'] if iv_pct >= 70 else self.colors['bright_yellow'] if iv_pct >= 30 else self.colors['bright_red']
            iv_line = f"IV %TILE: {iv_color}{iv_pct:6.1f}%{self.colors['reset']}"
            lines.append(self._format_line(iv_line, width))
        
        lines.append(self._create_box_bottom(width))
        
        return '\n'.join(lines)
    
    def format_risk_metrics(self, risk_metrics: Dict[str, float]) -> str:
        """
        Format risk metrics for retro terminal display.
        """
        if not self.retro_mode:
            return json.dumps(risk_metrics, indent=2)
        
        width = 60
        
        lines = []
        lines.append(self._create_box_top(width))
        
        header = "RISK METRICS"
        padded_header = header.center(width - 4)
        lines.append(f"{self.box_chars['vertical']} {self.colors['bright_white']}{padded_header}{self.colors['reset']} {self.box_chars['vertical']}")
        
        lines.append(self._create_separator(width))
        
        # Format each risk metric
        metrics = [
            ('VaR (95%)', risk_metrics.get('value_at_risk', 0), 'percent', True),
            ('Expected Shortfall', risk_metrics.get('expected_shortfall', 0), 'percent', True),
            ('Volatility', risk_metrics.get('volatility', 0), 'percent', False),
            ('Sharpe Ratio', risk_metrics.get('sharpe_ratio', 0), 'decimal', False),
            ('Max Drawdown', risk_metrics.get('max_drawdown', 0), 'percent', True),
            ('Beta', risk_metrics.get('beta', 1.0), 'decimal', False)
        ]
        
        for name, value, format_type, lower_is_better in metrics:
            # Determine color
            if format_type == 'percent':
                display_value = f"{value:.1f}%"
                if lower_is_better:
                    if value <= 5:
                        color = self.colors['bright_green']
                    elif value <= 10:
                        color = self.colors['bright_yellow']
                    else:
                        color = self.colors['bright_red']
                else:
                    if value >= 20:
                        color = self.colors['bright_green']
                    elif value >= 10:
                        color = self.colors['bright_yellow']
                    else:
                        color = self.colors['bright_red']
                        
            elif format_type == 'decimal':
                display_value = f"{value:.2f}"
                if name == 'Sharpe Ratio':
                    if value >= 1.0:
                        color = self.colors['bright_green']
                    elif value >= 0.5:
                        color = self.colors['bright_yellow']
                    else:
                        color = self.colors['bright_red']
                elif name == 'Beta':
                    if 0.8 <= value <= 1.2:
                        color = self.colors['bright_green']
                    elif 0.5 <= value <= 1.5:
                        color = self.colors['bright_yellow']
                    else:
                        color = self.colors['bright_red']
                else:
                    color = self.colors['bright_white']
            
            line = f"{name:18s}: {color}{display_value:>10}{self.colors['reset']}"
            lines.append(self._format_line(line, width))
        
        lines.append(self._create_box_bottom(width))
        
        return '\n'.join(lines)
    
    def send_to_desktop(self, data_type: str, data: Any, 
                       channel: str = "display") -> bool:
        """
        Send formatted data to desktop app.
        This would connect via WebSocket/HTTP in production.
        """
        try:
            # Format the data based on type
            if data_type == 'recommendation':
                formatted = self.format_recommendation(data)
            elif data_type == 'backtest':
                formatted = self.format_backtest_results(data)
            elif data_type == 'greeks':
                formatted = self.format_greeks(data)
            elif data_type == 'risk':
                formatted = self.format_risk_metrics(data)
            else:
                formatted = str(data)
            
            # In production, this would send via WebSocket
            # For now, just log and simulate
            logger.info(f"Sending {data_type} to desktop app (channel: {channel})")
            
            # Simulate desktop app display
            print("\n" + "=" * 70)
            print(f"DESKTOP APP DISPLAY - {data_type.upper()}")
            print("=" * 70)
            print(formatted)
            print("=" * 70 + "\n")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send data to desktop: {e}")
            return False
    
    def register_callback(self, event_type: str, callback: Callable):
        """
        Register callback for desktop app events.
        """
        if event_type not in self.callbacks:
            self.callbacks[event_type] = []
        
        self.callbacks[event_type].append(callback)
        logger.info(f"Callback registered for event: {event_type}")
    
    def simulate_desktop_event(self, event_type: str, data: Dict[str, Any]):
        """
        Simulate a desktop app event (for testing).
        """
        if event_type in self.callbacks:
            for callback in self.callbacks[event_type]:
                try:
                    callback(data)
                except Exception as e:
                    logger.error(f"Error in callback for {event_type}: {e}")
    
    def _create_box_top(self, width: int) -> str:
        """Create top of terminal box."""
        return f"{self.box_chars['top_left']}{self.box_chars['horizontal'] * (width - 2)}{self.box_chars['top_right']}"
    
    def _create_box_bottom(self, width: int) -> str:
        """Create bottom of terminal box."""
        return f"{self.box_chars['bottom_left']}{self.box_chars['horizontal'] * (width - 2)}{self.box_chars['bottom_right']}"
    
    def _create_separator(self, width: int) -> str:
        """Create separator line."""
        return f"{self.box_chars['t_left']}{self.box_chars['horizontal'] * (width - 2)}{self.box_chars['t_right']}"
    
    def _format_line(self, content: str, width: int) -> str:
        """Format a line for terminal display."""
        # Remove color codes for length calculation
        import re
        clean_content = re.sub(r'\033\[[0-9;]*m', '', content)
        
        # Pad to width
        padding = width - len(clean_content) - 4  # Account for borders and spaces
        if padding > 0:
            content = content + ' ' * padding
        
        return f"{self.box_chars['vertical']} {content}{self.colors['reset']} {self.box_chars['vertical']}"
    
    def _create_progress_bar(self, value: float, length: int = 20) -> str:
        """Create a progress bar for terminal display."""
        filled = int(value / 100 * length)
        empty = length - filled
        
        # Determine color based on value
        if value >= 80:
            color = self.colors['bright_green']
        elif value >= 60:
            color = self.colors['bright_yellow']
        else:
            color = self.colors['bright_red']
        
        bar = f"{color}[{'█' * filled}{'░' * empty}]{self.colors['reset']}"
        return bar


# Example usage
if __name__ == "__main__":
    # Initialize desktop integration
    desktop = DesktopIntegration(retro_mode=True)
    
    print("APHELION Desktop Integration - Retro Terminal Mode")
    print("=" * 60)
    print(f"Retro mode: {desktop.retro_mode}")
    print(f"Colors available: {len(desktop.colors)}")
    print(f"Box characters: {len(desktop.box_chars)}")
    
    # Test formatting
    test_recommendation = {
        'ticker': 'LMT',
        'sector': 'defense',
        'confidence': 87,
        'strategy': 'Long Call',
        'current_price': 452.30,
        'strike_price': 460.00,
        'expiration_days': 45
    }
    
    print("\nSample formatted recommendation:")
    print(desktop.format_recommendation(test_recommendation))
    
    print("\nReady for integration with:")
    print("1. Electron desktop application")
    print("2. Real-time data streaming")
    print("3. Retro terminal aesthetic (2000s CIA style)")
    print("4. WebSocket communication")