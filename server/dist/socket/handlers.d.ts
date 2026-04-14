import { Server } from 'socket.io';
export declare const initSocketHandlers: (io: Server) => void;
export declare const sendNotificationToUser: (io: Server, userId: string, notification: any) => Promise<void>;
//# sourceMappingURL=handlers.d.ts.map