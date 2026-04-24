import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { RemindersActivationService } from '../reminders/reminders-activation.service';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly remindersActivationService: RemindersActivationService,
  ) {}

  async findForUser(userId: string) {
    this.validateId(userId, 'Usuario');
    const normalizedUserId = new Types.ObjectId(userId);
    await this.remindersActivationService.syncDueReminders();

    const notificaciones = await this.notificationModel
      .find({ userId: normalizedUserId })
      .sort({ leida: 1, fechaEvento: -1, createdAt: -1 })
      .lean();

    return {
      total: notificaciones.length,
      noLeidas: notificaciones.filter((item) => !item.leida).length,
      notificaciones,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    this.validateId(notificationId, 'Notificación');
    this.validateId(userId, 'Usuario');
    const normalizedUserId = new Types.ObjectId(userId);

    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId: normalizedUserId },
      { $set: { leida: true, readAt: new Date() } },
      { returnDocument: 'after' },
    );

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return {
      message: 'Notificación marcada como leída',
      notificacion: notification,
    };
  }

  private validateId(id: string, label = 'ID') {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`${label} inválido`);
    }
  }
}
