"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const logger_1 = require("../utils/logger");
class WebSocketService {
    wss;
    logger;
    constructor(wss) {
        this.wss = wss;
        this.logger = new logger_1.Logger('WebSocketService');
    }
    async initialize() {
        this.logger.info('WebSocket service initialized');
        this.wss.on('connection', (socket) => {
            this.logger.debug(`Client connected: ${socket.id}`);
            socket.on('disconnect', () => {
                this.logger.debug(`Client disconnected: ${socket.id}`);
            });
        });
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=websocket.service.js.map