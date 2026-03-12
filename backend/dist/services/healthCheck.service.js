"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckService = void 0;
const logger_1 = require("../utils/logger");
class HealthCheckService {
    logger;
    constructor() {
        this.logger = new logger_1.Logger('HealthCheckService');
    }
    start() {
        this.logger.info('Health check service started');
    }
}
exports.HealthCheckService = HealthCheckService;
//# sourceMappingURL=healthCheck.service.js.map