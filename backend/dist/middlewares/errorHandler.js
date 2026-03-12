"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('ErrorHandler');
class ErrorHandler {
    static handle(error, _req, res, _next) {
        logger.error('Unhandled error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
            timestamp: new Date().toISOString()
        });
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=errorHandler.js.map