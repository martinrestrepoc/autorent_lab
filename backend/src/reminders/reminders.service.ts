import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { RemindersActivationService } from './reminders-activation.service';
import {
  Reminder,
  ReminderDocument,
  ReminderEvent,
  ReminderStatus,
  ReminderType,
} from './schemas/reminder.schema';

@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
    private readonly remindersActivationService: RemindersActivationService,
  ) {}

  async create(vehicleId: string, userId: string, dto: CreateReminderDto) {
    this.validateId(vehicleId, 'Vehículo');
    this.validateId(userId, 'Usuario');

    const vehicle = await this.vehicleModel.findById(vehicleId).lean();
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const fechaRecordatorio = this.parseDateToStartOfDay(dto.fechaRecordatorio);
    if (Number.isNaN(fechaRecordatorio.getTime())) {
      throw new BadRequestException('Fecha de recordatorio inválida');
    }

    const today = this.startOfDay(new Date());
    if (fechaRecordatorio < today) {
      throw new BadRequestException(
        'La fecha del recordatorio no puede ser anterior a hoy',
      );
    }

    const reminder = await this.reminderModel.create({
      tipo: ReminderType.MANTENIMIENTO,
      vehiculo_id: new Types.ObjectId(vehicleId),
      alquiler_id: null,
      evento: null,
      fechaRecordatorio,
      titulo: dto.titulo.trim(),
      detalle: dto.detalle?.trim() ?? '',
      assignedUserId: new Types.ObjectId(userId),
      createdBy: new Types.ObjectId(userId),
      estado: ReminderStatus.PROGRAMADO,
      notifiedAt: null,
    });

    return {
      message: 'Recordatorio programado con éxito',
      recordatorio: reminder,
    };
  }

  async upsertRentReminder(params: {
    rentId: string;
    vehicleId: string;
    userId: string;
    fechaRecordatorio: Date;
    clientLabel: string;
    evento: ReminderEvent;
    titulo?: string;
    detalle?: string;
  }) {
    this.validateId(params.rentId, 'Alquiler');
    this.validateId(params.vehicleId, 'Vehículo');
    this.validateId(params.userId, 'Usuario');

    await this.reminderModel.findOneAndUpdate(
      {
        alquiler_id: params.rentId,
        tipo: ReminderType.ALQUILER,
        evento: params.evento,
      },
      {
        $set: {
          tipo: ReminderType.ALQUILER,
          vehiculo_id: new Types.ObjectId(params.vehicleId),
          alquiler_id: new Types.ObjectId(params.rentId),
          evento: params.evento,
          fechaRecordatorio: this.startOfDay(params.fechaRecordatorio),
          titulo:
            params.titulo?.trim() ||
            (params.evento === ReminderEvent.INICIO
              ? 'Inicio de alquiler'
              : 'Devolución de alquiler'),
          detalle:
            params.detalle?.trim() ||
            (params.evento === ReminderEvent.INICIO
              ? `Entrega programada para ${params.clientLabel}`
              : `Recepción programada de ${params.clientLabel}`),
          assignedUserId: new Types.ObjectId(params.userId),
          createdBy: new Types.ObjectId(params.userId),
          estado: ReminderStatus.PROGRAMADO,
          notifiedAt: null,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
  }

  async cancelRentReminder(rentId: string) {
    this.validateId(rentId, 'Alquiler');

    await this.reminderModel.updateMany(
      {
        alquiler_id: rentId,
        tipo: ReminderType.ALQUILER,
        estado: ReminderStatus.PROGRAMADO,
      },
      {
        $set: {
          estado: ReminderStatus.CANCELADO,
        },
      },
    );
  }

  async findByVehicle(vehicleId: string) {
    this.validateId(vehicleId, 'Vehículo');

    const vehicle = await this.vehicleModel.findById(vehicleId).lean();
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    await this.remindersActivationService.syncDueReminders();

    const recordatorios = await this.reminderModel
      .find({ vehiculo_id: vehicleId })
      .sort({ fechaRecordatorio: 1, createdAt: -1 })
      .lean();

    return {
      vehicleId,
      total: recordatorios.length,
      recordatorios,
    };
  }

  async findAssignedToUser(userId: string) {
    this.validateId(userId, 'Usuario');
    const assignedUserId = new Types.ObjectId(userId);

    await this.remindersActivationService.syncDueReminders();

    const recordatorios = await this.reminderModel
      .find({
        assignedUserId,
        estado: { $nin: [ReminderStatus.CANCELADO, ReminderStatus.CERRADO] },
      })
      .populate('vehiculo_id', 'plate brand model')
      .sort({ fechaRecordatorio: 1, createdAt: -1 })
      .lean();

    return {
      total: recordatorios.length,
      recordatorios,
    };
  }

  private validateId(id: string, label = 'ID') {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`${label} inválido`);
    }
  }

  private parseDateToStartOfDay(value: string) {
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (dateOnlyRegex.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    return this.startOfDay(new Date(value));
  }

  private startOfDay(date: Date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }
}
