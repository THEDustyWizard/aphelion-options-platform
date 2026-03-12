#!/usr/bin/env python3
"""
APHELION Retro Terminal Demo
Demonstrates the 2000s CIA terminal aesthetic for desktop app
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from integration.desktop_integration import DesktopIntegration
from datetime import datetime, timedelta
import time

def demo_recommendation():
    """Demo a recommendation with retro terminal formatting."""
    print("\n" + "="*70)
    print("APHELION RETRO TERMINAL DEMO - 2000s CIA AESTHETIC")
    print("="*70)
    
    desktop = DesktopIntegration(retro_mode=True)
    
    # Create sample recommendations for different sectors
    recommendations = [
        {
            'ticker': 'LMT',
            'sector': 'defense',
            'confidence': 87,
            'strategy': 'Long Call',
            'current_price': 452.30,
            'strike_price': 460.00,
            'expiration_days': 45,
            'scores': {
                'technical': 85,
                'fundamental': 90,
                'sentiment': 82,
                'sector': 88,
                'flow': 75
            },
            'risk_score': 38
        },
        {
            'ticker': 'XOM',
            'sector': 'energy',
            'confidence': 72,
            'strategy': 'Bull Call Spread',
            'current_price': 118.50,
            'strike_price': 120.00,
            'expiration_days': 30,
            'scores': {
                'technical': 68,
                'fundamental': 75,
                'sentiment': 70,
                'sector': 80,
                'flow': 65
            },
            'risk_score': 55
        },
        {
            'ticker': 'UPS',
            'sector': 'logistics',
            'confidence': 65,
            'strategy': 'Iron Condor',
            'current_price': 145.80,
            'strike_price': 150.00,
            'expiration_days': 60,
            'scores': {
                'technical': 62,
                'fundamental': 68,
                'sentiment': 60,
                'sector': 70,
                'flow': 65
            },
            'risk_score': 42
        }
    ]
    
    print("\n📡 RECOMMENDATION STREAM (SIMULATED REAL-TIME)")
    print("-"*70)
    
    for i, rec in enumerate(recommendations, 1):
        print(f"\n📊 RECOMMENDATION #{i}")
        print(desktop.format_recommendation(rec))
        time.sleep(1)
    
    return desktop

def demo_backtest_results():
    """Demo backtest results formatting."""
    desktop = DesktopIntegration(retro_mode=True)
    
    backtest_results = {
        'total_trades': 42,
        'winning_trades': 28,
        'losing_trades': 14,
        'win_rate': 0.667,
        'total_pnl': 15250.75,
        'avg_pnl': 363.11,
        'avg_win': 825.50,
        'avg_loss': -412.25,
        'max_drawdown': 12.5,
        'sharpe_ratio': 1.8,
        'final_portfolio': 25250.75,
        'total_return': 152.5,
        'annual_return': 45.2,
        'sector_performance': {
            'defense': {'trades': 15, 'pnl': 6250.50, 'wins': 11},
            'energy': {'trades': 12, 'pnl': 3250.25, 'wins': 8},
            'logistics': {'trades': 10, 'pnl': 2750.00, 'wins': 6},
            'medical': {'trades': 5, 'pnl': 3000.00, 'wins': 3}
        },
        'strategy_performance': {
            'Long Call': {'trades': 18, 'pnl': 8500.00, 'wins': 12},
            'Bull Call Spread': {'trades': 12, 'pnl': 4500.25, 'wins': 8},
            'Iron Condor': {'trades': 8, 'pnl': 2250.50, 'wins': 6},
            'Strangle': {'trades': 4, 'pnl': 0.00, 'wins': 2}
        }
    }
    
    print("\n" + "="*70)
    print("BACKTEST RESULTS DASHBOARD")
    print("="*70)
    print(desktop.format_backtest_results(backtest_results))
    
    return desktop

def demo_greeks_dashboard():
    """Demo Greeks dashboard."""
    desktop = DesktopIntegration(retro_mode=True)
    
    greeks_data = {
        'delta': 0.62,
        'gamma': 0.035,
        'theta': -0.042,
        'vega': 0.125,
        'iv_percentile': 72.5,
        'iv_rank': 68.0,
        'skew': 0.05
    }
    
    print("\n" + "="*70)
    print("OPTIONS GREEKS DASHBOARD")
    print("="*70)
    print(desktop.format_greeks(greeks_data))
    
    return desktop

def demo_risk_metrics():
    """Demo risk metrics dashboard."""
    desktop = DesktopIntegration(retro_mode=True)
    
    risk_metrics = {
        'value_at_risk': 8.5,
        'expected_shortfall': 12.2,
        'volatility': 24.8,
        'sharpe_ratio': 1.8,
        'max_drawdown': 12.5,
        'beta': 1.2
    }
    
    print("\n" + "="*70)
    print("RISK METRICS DASHBOARD")
    print("="*70)
    print(desktop.format_risk_metrics(risk_metrics))
    
    return desktop

def demo_real_time_stream():
    """Demo simulated real-time data stream."""
    desktop = DesktopIntegration(retro_mode=True)
    
    print("\n" + "="*70)
    print("REAL-TIME DATA STREAM (SIMULATED)")
    print("="*70)
    
    # Simulate real-time updates
    for i in range(3):
        print(f"\n🔄 UPDATE #{i+1} - {datetime.now().strftime('%H:%M:%S')}")
        
        # Simulate changing data
        greeks = {
            'delta': 0.58 + (i * 0.02),
            'gamma': 0.032 + (i * 0.001),
            'theta': -0.045 + (i * 0.001),
            'vega': 0.120 + (i * 0.002),
            'iv_percentile': 70.0 + (i * 1.5)
        }
        
        print(desktop.format_greeks(greeks))
        time.sleep(2)
    
    return desktop

def main():
    """Run all demos."""
    print("\n🚀 APHELION DESKTOP APP - RETRO TERMINAL DEMONSTRATION")
    print("✨ 2000s CIA Terminal Aesthetic ✨")
    print("\nThis demo shows the visual style for the standalone desktop application.")
    
    # Run all demos
    demo_recommendation()
    demo_backtest_results()
    demo_greeks_dashboard()
    demo_risk_metrics()
    demo_real_time_stream()
    
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)
    print("\n✅ Retro terminal aesthetic implemented")
    print("✅ Real-time data formatting ready")
    print("✅ Desktop app integration prepared")
    print("✅ Ready for Electron app development")
    print("\nNext: Integrate with Backend Rex's API server")

if __name__ == "__main__":
    main()