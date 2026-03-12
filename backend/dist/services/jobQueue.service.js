"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobQueueService = void 0;
const logger_1 = require("../utils/logger");
class JobQueueService {
    logger;
    constructor() {
        this.logger = new logger_1.Logger('JobQueueService');
    }
    async initialize() {
        this.logger.info('Job queue service initialized');
    }
}
exports.JobQueueService = JobQueueService;
//# sourceMappingURL=jobQueue.service.js.map