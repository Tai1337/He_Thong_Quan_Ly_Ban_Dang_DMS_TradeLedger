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
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, identity: string) {
    if (identity) {
      const key = identity.trim().toLowerCase();
      this.activeSockets.set(key, client.id);
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

  emitToAll(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    }
  }
}
