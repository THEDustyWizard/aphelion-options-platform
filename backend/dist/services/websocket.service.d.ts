import { Server as SocketIOServer } from 'socket.io';
export declare class WebSocketService {
    private wss;
    private logger;
    constructor(wss: SocketIOServer);
    initialize(): Promise<void>;
}
//# sourceMappingURL=websocket.service.d.ts.map