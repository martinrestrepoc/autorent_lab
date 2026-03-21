import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(['notificaciones', 'notifications'])
  findForUser(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.findForUser(req.user.id);
  }

  @Patch(['notificaciones/:id/leida', 'notifications/:id/read'])
  markAsRead(
    @Param('id') notificationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.markAsRead(notificationId, req.user.id);
  }
}
