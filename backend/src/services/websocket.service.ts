import { Server as SocketIOServer } from 'socket.io';
import { Logger } from '../utils/logger';

export class WebSocketService {
  private wss: SocketIOServer;
  private logger: Logger;

  constructor(wss: SocketIOServer) {
    this.wss = wss;
    this.logger = new Logger('WebSocketService');
  }

  async initialize(): Promise<void> {
    this.logger.info('WebSocket service initialized');
    this.wss.on('connection', (socket) => {
      this.logger.debug(`Client connected: ${socket.id}`);
      socket.on('disconnect', () => {
        this.logger.debug(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
