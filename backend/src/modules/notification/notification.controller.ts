import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getMyNotifications(
    @CurrentUser() user: any,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.getForUser(user.id, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationService.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationService.markRead(id, user.id);
  }
}

