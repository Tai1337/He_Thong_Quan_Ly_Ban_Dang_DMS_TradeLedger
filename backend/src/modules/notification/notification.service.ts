import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';
import { QueryNotificationDto } from './dto/query-notification.dto';

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  receiverId: bigint | number | string;
  senderId?: bigint | number | string | null;
  referenceId?: bigint | number | string | null;
  refType?: string | null;
  navigateTo?: string | null;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private serialize(notification: any) {
    return {
      ...notification,
      id: notification.id?.toString(),
      receiverId: notification.receiverId?.toString(),
      senderId: notification.senderId ? notification.senderId.toString() : null,
      referenceId: notification.referenceId ? notification.referenceId.toString() : null,
      sender: notification.sender
        ? {
            id: notification.sender.id?.toString(),
            fullName: notification.sender.fullName,
            username: notification.sender.username,
          }
        : undefined,
    };
  }

  async createAndEmit(payload: CreateNotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        type: payload.type,
        title: payload.title,
        body: payload.body,
        receiverId: BigInt(payload.receiverId),
        senderId: payload.senderId ? BigInt(payload.senderId) : null,
        referenceId: payload.referenceId ? BigInt(payload.referenceId) : null,
        refType: payload.refType ?? null,
        navigateTo: payload.navigateTo ?? null,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    const serialized = this.serialize(notification);
    this.eventsGateway.emitToUser(
      notification.receiverId.toString(),
      'notification',
      serialized,
    );

    return serialized;
  }

  async notifyRoleUsers(
    distributorId: bigint | number | string | null | undefined,
    roleCodes: string[],
    payload: Omit<CreateNotificationPayload, 'receiverId'>,
  ) {
    const where: any = {
      status: true,
      role: { code: { in: roleCodes } },
    };

    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    if (users.length === 0) return [];

    return Promise.all(
      users.map((u) =>
        this.createAndEmit({
          ...payload,
          receiverId: u.id,
        }),
      ),
    );
  }

  async getForUser(userId: bigint | number | string, query: QueryNotificationDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      receiverId: BigInt(userId),
    };

    if (query.unread === 'true') {
      where.isRead = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, fullName: true, username: true },
          },
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { receiverId: BigInt(userId), isRead: false },
      }),
    ]);

    return {
      data: items.map((item) => this.serialize(item)),
      total,
      unreadCount,
      page,
      limit,
    };
  }

  async getUnreadCount(userId: bigint | number | string) {
    const count = await this.prisma.notification.count({
      where: {
        receiverId: BigInt(userId),
        isRead: false,
      },
    });
    return { unreadCount: count };
  }

  async markRead(id: string | number | bigint, userId: bigint | number | string) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        id: BigInt(id),
        receiverId: BigInt(userId),
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    if (existing.isRead) {
      return this.serialize(existing);
    }

    const updated = await this.prisma.notification.update({
      where: { id: existing.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.serialize(updated);
  }

  async markAllRead(userId: bigint | number | string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        receiverId: BigInt(userId),
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }
}

