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
  handleRegister(client: Socket, username: string) {
    if (username) {
      this.activeSockets.set(username, client.id);
    }
  }

  forceLogout(username: string, reason: string = 'Tài khoản của bạn vừa đăng nhập ở một nơi khác!') {
    const existingSocketId = this.activeSockets.get(username);
    if (existingSocketId && this.server) {
      this.server.to(existingSocketId).emit('FORCE_LOGOUT', { reason });
      this.activeSockets.delete(username);
    }
  }

  emitToAll(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    }
  }
}
