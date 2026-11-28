import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeSockets: Map<string, string> = new Map();
  private userSocketMap: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    // client connected
  }

  handleDisconnect(client: Socket) {
    for (const [username, socketId] of this.activeSockets.entries()) {
      if (socketId === client.id) {
        this.activeSockets.delete(username);
        break;
      }
    }
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: string | { username?: string; userId?: string | number }) {
    if (typeof payload === 'string') {
      if (payload) {
        const key = payload.trim().toLowerCase();
        this.activeSockets.set(key, client.id);
      }
      return;
    }

    if (payload?.username) {
      const key = payload.username.trim().toLowerCase();
      this.activeSockets.set(key, client.id);
    }
    if (payload?.userId !== undefined && payload?.userId !== null) {
      this.userSocketMap.set(String(payload.userId), client.id);
    }
  }

  forceLogout(identity: string, reason: string = 'Tài khoản của bạn vừa đăng nhập trên một thiết bị khác!') {
    if (!identity) return;
    const key = identity.trim().toLowerCase();
    const existingSocketId = this.activeSockets.get(key);
    if (existingSocketId && this.server) {
      // Gửi sự kiện forceLogout tới đúng client của phiên cũ
      this.server.to(existingSocketId).emit('forceLogout', { reason, username: identity });
      this.server.to(existingSocketId).emit('FORCE_LOGOUT', { reason, username: identity });

      // Ngắt kết nối socket của client cũ
      const clientSocket = this.server.sockets.sockets.get(existingSocketId);
      if (clientSocket) {
        clientSocket.disconnect(true);
      }
      this.activeSockets.delete(key);
    }
  }

  emitToUser(userId: string | number, event: string, data: any) {
    const socketId = this.userSocketMap.get(String(userId));
    if (socketId && this.server) {
      this.server.to(socketId).emit(event, data);
    }
  }

  emitToAll(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    }
  }
}
