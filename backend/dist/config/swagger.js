"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwaggerConfig = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const logger_1 = require("../utils/logger");
class SwaggerConfig {
    static logger = new logger_1.Logger('SwaggerConfig');
    static generate() {
        const options = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'APHELION Options Trading Platform API',
                    version: '1.0.0',
                    description: `
            # APHELION Options Trading Platform Backend API
            
            ## Overview
            This API powers the APHELION Options Trading Platform, providing:
            - Real-time market data and options chains
            - AI-powered trading recommendations
            - News aggregation and sentiment analysis
            - Backtesting and performance analytics
            - User portfolio and watchlist management
            
            ## Authentication
            Most endpoints require JWT authentication. Include the token in the Authorization header:
            \`\`\`
            Authorization: Bearer <your-jwt-token>
            \`\`\`
            
            ## Rate Limiting
            API is rate limited to 100 requests per 15 minutes per IP address.
            
            ## WebSocket
            Real-time data is available via WebSocket at \`/ws\`.
            
            ## Sectors
            The platform focuses on four key sectors:
            1. **Defense** (ITA ETF)
            2. **Oil & Gas** (XLE ETF)
            3. **Logistics** (XLI ETF)
            4. **Medical** (XLV ETF)
          `,
                    contact: {
                        name: 'APHELION Team',
                        email: 'support@aphelion-trading.com'
                    },
                    license: {
                        name: 'MIT',
                        url: 'https://opensource.org/licenses/MIT'
                    }
                },
                servers: [
                    {
                        url: process.env.NODE_ENV === 'production'
                            ? 'https://api.aphelion-trading.com/api/v1'
                            : `http://localhost:${process.env.PORT || 3000}/api/v1`,
                        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
                    }
                ],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    },
                    schemas: {
                        Error: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    description: 'Error type'
                                },
                                message: {
                                    type: 'string',
                                    description: 'Error message'
                                },
                                timestamp: {
                                    type: 'string',
                                    format: 'date-time',
                                    description: 'When the error occurred'
                                }
                            }
                        },
                        Recommendation: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    format: 'uuid',
                                    description: 'Unique identifier'
                                },
                                ticker: {
                                    type: 'string',
                                    description: 'Stock symbol'
                                },
                                sector: {
                                    type: 'string',
                                    enum: ['defense', 'energy', 'logistics', 'medical'],
                                    description: 'Sector classification'
                                },
                                confidence: {
                                    type: 'number',
                                    minimum: 0,
                                    maximum: 100,
                                    description: 'Confidence score (0-100)'
                                },
                                riskScore: {
                                    type: 'number',
                                    minimum: 0,
                                    maximum: 100,
                                    description: 'Risk score (0-100, lower is better)'
                                },
                                strategy: {
                                    type: 'string',
                                    enum: ['Long Call', 'Long Put', 'Bull Call Spread', 'Bear Put Spread', 'Iron Condor', 'Strangle', 'Straddle', 'Calendar Spread'],
                                    description: 'Recommended options strategy'
                                },
                                expirationDays: {
                                    type: 'integer',
                                    minimum: 1,
                                    maximum: 365,
                                    description: 'Days to expiration'
                                },
                                strikePrice: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Recommended strike price'
                                },
                                rationale: {
                                    type: 'string',
                                    description: 'Explanation for the recommendation'
                                },
                                generatedAt: {
                                    type: 'string',
                                    format: 'date-time',
                                    description: 'When the recommendation was generated'
                                },
                                validUntil: {
                                    type: 'string',
                                    format: 'date-time',
                                    description: 'When the recommendation expires'
                                }
                            }
                        },
                        Ticker: {
                            type: 'object',
                            properties: {
                                symbol: {
                                    type: 'string',
                                    description: 'Stock symbol'
                                },
                                name: {
                                    type: 'string',
                                    description: 'Company name'
                                },
                                sector: {
                                    type: 'string',
                                    description: 'Sector classification'
                                },
                                marketCap: {
                                    type: 'number',
                                    description: 'Market capitalization in USD'
                                },
                                price: {
                                    type: 'number',
                                    description: 'Current stock price'
                                },
                                volume: {
                                    type: 'number',
                                    description: 'Average daily volume'
                                },
                                hasOptions: {
                                    type: 'boolean',
                                    description: 'Whether options are available'
                                }
                            }
                        },
                        OptionChain: {
                            type: 'object',
                            properties: {
                                ticker: {
                                    type: 'string',
                                    description: 'Stock symbol'
                                },
                                expiration: {
                                    type: 'string',
                                    format: 'date',
                                    description: 'Expiration date'
                                },
                                calls: {
                                    type: 'array',
                                    items: {
                                        $ref: '#/components/schemas/Option'
                                    }
                                },
                                puts: {
                                    type: 'array',
                                    items: {
                                        $ref: '#/components/schemas/Option'
                                    }
                                },
                                impliedVolatility: {
                                    type: 'number',
                                    description: 'Average implied volatility'
                                },
                                updatedAt: {
                                    type: 'string',
                                    format: 'date-time',
                                    description: 'When the chain was last updated'
                                }
                            }
                        },
                        Option: {
                            type: 'object',
                            properties: {
                                strike: {
                                    type: 'number',
                                    description: 'Strike price'
                                },
                                bid: {
                                    type: 'number',
                                    description: 'Best bid price'
                                },
                                ask: {
                                    type: 'number',
                                    description: 'Best ask price'
                                },
                                last: {
                                    type: 'number',
                                    description: 'Last traded price'
                                },
                                volume: {
                                    type: 'integer',
                                    description: 'Trading volume'
                                },
                                openInterest: {
                                    type: 'integer',
                                    description: 'Open interest'
                                },
                                impliedVolatility: {
                                    type: 'number',
                                    description: 'Implied volatility'
                                },
                                delta: {
                                    type: 'number',
                                    description: 'Delta value'
                                },
                                gamma: {
                                    type: 'number',
                                    description: 'Gamma value'
                                },
                                theta: {
                                    type: 'number',
                                    description: 'Theta value'
                                },
                                vega: {
                                    type: 'number',
                                    description: 'Vega value'
                                }
                            }
                        },
                        OptionParameters: {
                            type: 'object',
                            required: ['underlyingPrice', 'strikePrice', 'timeToExpiration', 'riskFreeRate', 'volatility', 'optionType'],
                            properties: {
                                underlyingPrice: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Current price of the underlying asset'
                                },
                                strikePrice: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Option strike price'
                                },
                                timeToExpiration: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Time to expiration in years'
                                },
                                riskFreeRate: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Annual risk-free interest rate'
                                },
                                volatility: {
                                    type: 'number',
                                    minimum: 0,
                                    description: 'Annual volatility of the underlying asset'
                                },
                                optionType: {
                                    type: 'string',
                                    enum: ['call', 'put'],
                                    description: 'Type of option'
                                }
                            }
                        },
                        Greeks: {
                            type: 'object',
                            properties: {
                                delta: {
                                    type: 'number',
                                    description: 'Delta - sensitivity to underlying price changes'
                                },
                                gamma: {
                                    type: 'number',
                                    description: 'Gamma - sensitivity of delta to underlying price changes'
                                },
                                theta: {
                                    type: 'number',
                                    description: 'Theta - time decay (daily)'
                                },
                                vega: {
                                    type: 'number',
                                    description: 'Vega - sensitivity to volatility changes (per 1%)'
                                },
                                rho: {
                                    type: 'number',
                                    description: 'Rho - sensitivity to interest rate changes (per 1%)'
                                }
                            }
                        },
                        PositionMetrics: {
                            type: 'object',
                            properties: {
                                currentValue: {
                                    type: 'number',
                                    description: 'Current value of the position'
                                },
                                costBasis: {
                                    type: 'number',
                                    description: 'Total cost of the position'
                                },
                                unrealizedPnl: {
                                    type: 'number',
                                    description: 'Unrealized profit/loss'
                                },
                                unrealizedPnlPercent: {
                                    type: 'number',
                                    description: 'Unrealized profit/loss percentage'
                                },
                                deltaExposure: {
                                    type: 'number',
                                    description: 'Delta exposure of the position'
                                },
                                gammaExposure: {
                                    type: 'number',
                                    description: 'Gamma exposure of the position'
                                },
                                thetaExposure: {
                                    type: 'number',
                                    description: 'Theta exposure (daily) of the position'
                                },
                                vegaExposure: {
                                    type: 'number',
                                    description: 'Vega exposure of the position'
                                },
                                maxLoss: {
                                    type: 'number',
                                    description: 'Maximum possible loss'
                                },
                                maxProfit: {
                                    type: 'number',
                                    description: 'Maximum possible profit'
                                },
                                breakevenPrice: {
                                    type: 'number',
                                    description: 'Breakeven price of the underlying'
                                },
                                probabilityOfProfit: {
                                    type: 'number',
                                    description: 'Probability of profit (0-1)'
                                }
                            }
                        },
                        RiskMetrics: {
                            type: 'object',
                            properties: {
                                var95: {
                                    type: 'number',
                                    description: 'Value at Risk at 95% confidence level'
                                },
                                expectedShortfall: {
                                    type: 'number',
                                    description: 'Expected shortfall (average loss beyond VaR)'
                                },
                                portfolioBeta: {
                                    type: 'number',
                                    description: 'Portfolio beta relative to market'
                                },
                                correlationMatrix: {
                                    type: 'array',
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'number'
                                        }
                                    },
                                    description: 'Correlation matrix between positions'
                                },
                                concentrationRisk: {
                                    type: 'number',
                                    description: 'Concentration risk score (0-10000)'
                                },
                                liquidityRisk: {
                                    type: 'number',
                                    description: 'Liquidity risk score (0-1)'
                                }
                            }
                        }
                    },
                    responses: {
                        UnauthorizedError: {
                            description: 'Access token is missing or invalid',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Error'
                                    }
                                }
                            }
                        },
                        NotFoundError: {
                            description: 'The requested resource was not found',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Error'
                                    }
                                }
                            }
                        },
                        ValidationError: {
                            description: 'Validation failed',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Error'
                                    }
                                }
                            }
                        }
                    }
                },
                security: [
                    {
                        bearerAuth: []
                    }
                ],
                tags: [
                    {
                        name: 'Authentication',
                        description: 'User authentication and authorization'
                    },
                    {
                        name: 'Market Data',
                        description: 'Real-time market data and options chains'
                    },
                    {
                        name: 'Recommendations',
                        description: 'AI-powered trading recommendations'
                    },
                    {
                        name: 'News',
                        description: 'News aggregation and sentiment analysis'
                    },
                    {
                        name: 'Backtesting',
                        description: 'Historical performance testing'
                    },
                    {
                        name: 'Portfolio',
                        description: 'User portfolio and watchlist management'
                    },
                    {
                        name: 'Calculation',
                        description: 'Option pricing, Greeks, and risk calculations'
                    },
                    {
                        name: 'Admin',
                        description: 'Administrative functions'
                    }
                ]
            },
            apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/models/*.ts']
        };
        try {
            const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
            this.logger.info('Swagger specification generated successfully');
            return swaggerSpec;
        }
        catch (error) {
            this.logger.error('Failed to generate Swagger specification:', error);
            throw error;
        }
    }
}
exports.SwaggerConfig = SwaggerConfig;
//# sourceMappingURL=swagger.js.map