#!/usr/bin/env python3
"""
APHELION Quant Rex - Engine HTTP Server
Bridges the 5-factor scoring engine to Backend Rex API (port 8000).
Runs on port 8001.
"""

import sys
import os
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timedelta
from typing import Dict

import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)


def _make_mock_price_data(periods: int = 100) -> pd.DataFrame:
    """Generate synthetic price data for scoring when live data is unavailable."""
    dates = pd.date_range(end=datetime.now(), periods=periods, freq='D')
    base = 150.0
    close = base + np.random.normal(0, 2, periods).cumsum()
    return pd.DataFrame({
        'Close': close,
        'High': close + np.abs(np.random.normal(1, 0.5, periods)),
        'Low': close - np.abs(np.random.normal(1, 0.5, periods)),
        'Volume': np.random.randint(500_000, 5_000_000, periods),
    }, index=dates)


def score_ticker(ticker: str, sector: str) -> Dict:
    """Run the 5-factor scoring engine and return the score dict."""
    from scoring.quant_rex_updated import APHELIONScoringEngine

    engine = APHELIONScoringEngine()

    price_data = _make_mock_price_data(100)
    sector_data = _make_mock_price_data(100)

    # Minimal synthetic fundamentals
    fundamentals = {
        'pe_ratio': 18.0,
        'eps_growth': 0.10,
        'revenue_growth': 0.08,
        'profit_margin': 0.15,
        'debt_to_equity': 0.6,
        'return_on_equity': 0.20,
    }

    news_items = [
        {
            'title': f'{ticker} reports strong results',
            'content': f'{ticker} beat expectations with strong revenue growth',
            'sentiment': 0.7,
            'published_at': datetime.now().isoformat(),
        }
    ]

    options_flow = [
        {
            'ticker': ticker,
            'option_type': 'call',
            'strike': 155.0,
            'expiration': (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d'),
            'volume': 1200,
            'premium': 8.50,
            'unusual': False,
        }
    ]

    scores = engine.calculate_total_score(
        ticker=ticker,
        sector=sector,
        price_data=price_data,
        fundamentals=fundamentals,
        news_items=news_items,
        sector_data=sector_data,
        options_flow=options_flow,
    )

    # Build clean response — exclude nested dicts from top-level score fields
    five_factors = {k: round(v, 2) for k, v in scores.items()
                    if k in ('technical', 'fundamental', 'sentiment', 'sector', 'flow', 'total')}

    return {
        'ticker': ticker.upper(),
        'sector': sector,
        'scores': five_factors,
        'risk_metrics': scores.get('risk_metrics', {}),
        'generated_at': datetime.now().isoformat(),
        'engine_version': '1.0',
    }


class EngineHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler for /health and /score endpoints."""

    def log_message(self, format, *args):
        logger.info('%s - %s', self.address_string(), format % args)

    def _send_json(self, status: int, body: dict):
        payload = json.dumps(body).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == '/health':
            self._send_json(200, {'status': 'ok', 'engine': 'quant_rex', 'port': 8001})
        else:
            self._send_json(404, {'error': 'Not found'})

    def do_POST(self):
        if self.path == '/score':
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length)
            try:
                body = json.loads(raw)
            except json.JSONDecodeError:
                self._send_json(400, {'error': 'Invalid JSON'})
                return

            ticker = body.get('ticker', '').strip().upper()
            sector = body.get('sector', 'defense').strip().lower()

            if not ticker:
                self._send_json(400, {'error': 'ticker is required'})
                return

            try:
                result = score_ticker(ticker, sector)
                self._send_json(200, result)
            except Exception as exc:
                logger.exception('Scoring error')
                self._send_json(500, {'error': str(exc)})
        else:
            self._send_json(404, {'error': 'Not found'})


def main():
    port = 8001
    server = HTTPServer(('0.0.0.0', port), EngineHandler)
    logger.info('Quant Rex engine server listening on port %d', port)
    logger.info('POST /score  — 5-factor scoring endpoint')
    logger.info('GET  /health — health check')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info('Shutting down.')
        server.server_close()


if __name__ == '__main__':
    main()
