import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from '../notifications/schemas/notification.schema';
import { Client, ClientDocument } from '../clients/schemas/clients.schema';
import { Rent } from '../rents/schemas/rent.schema';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema';
import {
  Reminder,
  ReminderDocument,
  ReminderEvent,
  ReminderStatus,
  ReminderType,
} from './schemas/reminder.schema';

@Injectable()
export class RemindersActivationService {
  private readonly logger = new Logger(RemindersActivationService.name);

  constructor(
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
    @InjectModel(Rent.name)
    private readonly rentModel: Model<Rent>,
    @InjectModel(Client.name)
    private readonly clientModel: Model<ClientDocument>,
  ) {}

  async syncDueReminders() {
    const today = this.startOfDay(new Date());

    const dueReminders = await this.reminderModel
      .find({
        estado: ReminderStatus.PROGRAMADO,
        fechaRecordatorio: { $lte: today },
        notifiedAt: null,
      })
      .lean();

    for (const reminder of dueReminders) {
      const activatedReminder = await this.reminderModel.findOneAndUpdate(
        {
          _id: reminder._id,
          estado: ReminderStatus.PROGRAMADO,
          notifiedAt: null,
        },
        {
          $set: {
            estado: ReminderStatus.ACTIVADO,
            notifiedAt: new Date(),
          },
        },
        { new: true },
      );

      if (!activatedReminder) {
        continue;
      }

      try {
        const vehicle = await this.vehicleModel
          .findById(activatedReminder.vehiculo_id)
          .select({ plate: 1 })
          .lean();

        const payload = await this.buildNotificationPayload(
          activatedReminder,
          vehicle?.plate,
        );

        await this.notificationModel.updateOne(
          {
            userId: activatedReminder.assignedUserId,
            tipo: payload.tipo,
            recordatorioId: activatedReminder._id,
          },
          {
            $setOnInsert: {
              userId: activatedReminder.assignedUserId,
              tipo: payload.tipo,
              recordatorioId: activatedReminder._id,
              titulo: activatedReminder.titulo,
              mensaje: payload.mensaje,
              fechaEvento: activatedReminder.fechaRecordatorio,
              leida: false,
              readAt: null,
            },
          },
          { upsert: true },
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo crear la notificación del recordatorio ${activatedReminder._id}: ${String(error)}`,
        );
      }
    }
  }

  private async buildNotificationPayload(
    reminder: {
      tipo: ReminderType;
      vehiculo_id: Types.ObjectId;
      alquiler_id?: Types.ObjectId | null;
      evento?: ReminderEvent | null;
      titulo: string;
      detalle?: string;
    },
    plate?: string,
  ) {
    if (reminder.tipo === ReminderType.ALQUILER && reminder.alquiler_id) {
      const rent = await this.rentModel
        .findById(reminder.alquiler_id)
        .select({ cliente: 1 })
        .lean();

      const client = rent?.cliente
        ? await this.clientModel
            .findById(rent.cliente)
            .select({ fullName: 1, email: 1 })
            .lean()
        : null;

      return {
        tipo: NotificationType.RECORDATORIO_ALQUILER,
        mensaje: this.buildRentalReminderMessage(
          reminder,
          plate,
          client?.fullName,
          client?.email,
        ),
      };
    }

    return {
      tipo: NotificationType.RECORDATORIO_MANTENIMIENTO,
      mensaje: this.buildMaintenanceReminderMessage(reminder, plate),
    };
  }

  private buildMaintenanceReminderMessage(
    reminder: {
      vehiculo_id: Types.ObjectId;
      titulo: string;
      detalle?: string;
      evento?: ReminderEvent | null;
    },
    plate?: string,
  ) {
    const vehicleLabel = plate?.trim()
      ? `vehículo ${plate.trim()}`
      : `vehículo ${reminder.vehiculo_id.toString()}`;
    const detail = reminder.detalle?.trim();
    if (detail) {
      return `Hoy vence el recordatorio "${reminder.titulo}" del ${vehicleLabel}: ${detail}`;
    }

    return `Hoy vence el recordatorio "${reminder.titulo}" del ${vehicleLabel}.`;
  }

  private buildRentalReminderMessage(
    reminder: {
      vehiculo_id: Types.ObjectId;
      titulo: string;
      detalle?: string;
      evento?: ReminderEvent | null;
    },
    plate?: string,
    clientName?: string,
    clientEmail?: string,
  ) {
    const vehicleLabel = plate?.trim()
      ? `vehículo ${plate.trim()}`
      : `vehículo ${reminder.vehiculo_id.toString()}`;
    const clientLabel = clientName?.trim() || clientEmail?.trim() || 'cliente asignado';
    const detail = reminder.detalle?.trim();

    const action =
      reminder.evento === ReminderEvent.DEVOLUCION
        ? 'vence la devolución'
        : 'inicia el alquiler';

    if (detail) {
      return `Hoy ${action} "${reminder.titulo}" del ${vehicleLabel} para ${clientLabel}: ${detail}`;
    }

    return `Hoy ${action} "${reminder.titulo}" del ${vehicleLabel} para ${clientLabel}.`;
  }

  private startOfDay(date: Date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }
}
