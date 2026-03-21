import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Client } from 'src/clients/schemas/clients.schema';
import { Maintenance } from 'src/maintenances/schemas/maintenance.schema';
import { Vehicle } from 'src/vehicles/schemas/vehicle.schema';
import { RemindersService } from 'src/reminders/reminders.service';
import { ReminderEvent } from 'src/reminders/schemas/reminder.schema';
import { Rent } from './schemas/rent.schema';
import { CreateRentDto } from './dto/create-rent.dto';
import { FinalizeRentDto } from './dto/finalize-rent.dto';
import { CancelRentDto } from './dto/cancel-rent.dto';

@Injectable()
export class AlquileresService {
  constructor(
    @InjectModel(Rent.name) private rentModel: Model<Rent>,
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    @InjectModel(Client.name) private clientModel: Model<Client>,
    @InjectModel(Maintenance.name)
    private maintenanceModel: Model<Maintenance>,
    private remindersService: RemindersService,
  ) {}

  async create(dto: CreateRentDto, userId: string) {
    await this.syncRentalStatuses();

    const { cliente, vehiculo, fechaInicio, fechaFin } = dto;

    if (!isValidObjectId(cliente) || !isValidObjectId(vehiculo)) {
      throw new BadRequestException('ID inválido');
    }

    const inicio = this.parseDateToStartOfDay(fechaInicio);
    const fin = this.parseDateToStartOfDay(fechaFin);
    const today = this.startOfDay(new Date());

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }

    if (fin <= inicio) {
      throw new BadRequestException(
        'La fecha fin debe ser mayor a la fecha inicio',
      );
    }

    if (inicio < today) {
      throw new BadRequestException(
        'La fecha inicio no puede ser anterior a hoy',
      );
    }

    // 1. Validar cliente
    const clientExists = await this.clientModel.findById(cliente);
    if (!clientExists) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const releaseVehicleLock = await this.acquireVehicleLock(vehiculo);
    try {
      // 2. Validar vehículo
      const vehicle = await this.vehicleModel.findById(vehiculo);
      if (!vehicle) {
        throw new NotFoundException('Vehículo no encontrado');
      }

      // 3. Validar solapamiento
      const overlapping = await this.rentModel.findOne({
        vehiculo,
        estado: { $in: ['PROGRAMADO', 'EN_CURSO', 'ACTIVO'] },
        fechaInicio: { $lte: fin },
        fechaFin: { $gte: inicio },
      });

      if (overlapping) {
        throw new BadRequestException(
          'Vehículo no disponible en las fechas seleccionadas',
        );
      }

      const overlappingMaintenance = await this.maintenanceModel.findOne({
        vehiculo_id: vehiculo,
        fechaInicio: { $lte: fin },
        fechaEntrega: { $gte: inicio },
      });

      if (overlappingMaintenance) {
        throw new BadRequestException(
          'El vehículo tiene un mantenimiento en las fechas seleccionadas',
        );
      }

      // 4. Crear alquiler
      const estadoInicial = inicio <= today ? 'EN_CURSO' : 'PROGRAMADO';

      let rent: Rent;
      try {
        rent = await this.rentModel.create({
          cliente,
          vehiculo,
          fechaInicio: inicio,
          fechaFin: fin,
          estado: estadoInicial,
          diasExceso: 0,
        });
      } catch (error: any) {
        if (error?.code === 11000) {
          throw new BadRequestException(
            'El vehículo ya tiene un contrato en curso',
          );
        }
        throw error;
      }

      if (estadoInicial === 'EN_CURSO') {
        await this.updateVehicleOperationalStatus(String(vehiculo));
      }

      if (dto.createStartReminder) {
        await this.remindersService.upsertRentReminder({
          rentId: String((rent as any)._id),
          vehicleId: String(vehiculo),
          userId,
          fechaRecordatorio: this.parseDateToStartOfDay(
            dto.startReminderDate ?? fechaInicio,
          ),
          clientLabel: clientExists.fullName || clientExists.email,
          evento: ReminderEvent.INICIO,
          titulo: dto.startReminderTitle,
          detalle: dto.startReminderDetail,
        });
      }

      if (dto.createReturnReminder) {
        await this.remindersService.upsertRentReminder({
          rentId: String((rent as any)._id),
          vehicleId: String(vehiculo),
          userId,
          fechaRecordatorio: this.parseDateToStartOfDay(
            dto.returnReminderDate ?? fechaFin,
          ),
          clientLabel: clientExists.fullName || clientExists.email,
          evento: ReminderEvent.DEVOLUCION,
          titulo: dto.returnReminderTitle,
          detalle: dto.returnReminderDetail,
        });
      }

      return rent;
    } finally {
      await releaseVehicleLock();
    }
  }

  async findOne(id: string) {
    await this.syncRentalStatuses();

    const rent = await this.rentModel
      .findById(id)
      .populate('cliente')
      .populate('vehiculo');

    if (!rent) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    return rent;
  }

  async findAll() {
    await this.syncRentalStatuses();

    return this.rentModel
      .find()
      .populate('cliente')
      .populate('vehiculo')
      .sort({ createdAt: -1 });
  }

  async remove(id: string) {
    await this.syncRentalStatuses();

    if (!isValidObjectId(id)) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    const rent = await this.rentModel.findById(id);
    if (!rent) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    if (['EN_CURSO', 'ACTIVO'].includes(rent.estado)) {
      throw new BadRequestException(
        'No se puede eliminar un contrato en curso',
      );
    }

    if (rent.estado === 'PROGRAMADO') {
      await this.remindersService.cancelRentReminder(String(rent._id));
    }

    await this.rentModel.findByIdAndDelete(id);
    await this.updateVehicleOperationalStatus(String(rent.vehiculo));

    return {
      message: 'Contrato eliminado con éxito',
    };
  }

  async finalize(id: string, dto: FinalizeRentDto) {
    await this.syncRentalStatuses();

    if (!isValidObjectId(id)) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    const rent = await this.rentModel.findById(id);
    if (!rent) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    if (!['EN_CURSO', 'ACTIVO'].includes(rent.estado)) {
      throw new BadRequestException(
        'Solo se puede finalizar un contrato en curso',
      );
    }

    const fechaFinReal = this.parseDateToStartOfDay(dto.fechaFinReal);
    const fechaInicio = this.startOfDay(new Date(rent.fechaInicio));

    if (Number.isNaN(fechaFinReal.getTime())) {
      throw new BadRequestException('Fecha de finalización inválida');
    }

    if (fechaFinReal < fechaInicio) {
      throw new BadRequestException(
        'La fecha de finalización no puede ser anterior a la fecha de inicio',
      );
    }

    rent.fechaFinReal = fechaFinReal;
    rent.estado = 'FINALIZADO';
    rent.diasExceso = this.calculateExceededDays(rent.fechaFin, fechaFinReal);
    await rent.save();

    await this.updateVehicleOperationalStatus(String(rent.vehiculo));

    return {
      message: 'Contrato finalizado con éxito',
      alquiler: rent,
    };
  }

  async cancel(id: string, dto: CancelRentDto) {
    await this.syncRentalStatuses();

    if (!isValidObjectId(id)) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    const rent = await this.rentModel.findById(id);
    if (!rent) {
      throw new NotFoundException('Alquiler no encontrado');
    }

    if (!['PROGRAMADO', 'EN_CURSO', 'ACTIVO'].includes(rent.estado)) {
      throw new BadRequestException(
        'Solo se puede cancelar un contrato programado o en curso',
      );
    }

    const motivo = (dto?.motivoCancelacion ?? '').trim();
    if (!motivo) {
      throw new BadRequestException('Ingrese motivo de cancelación');
    }

    rent.estado = 'CANCELADO';
    rent.motivoCancelacion = motivo;
    rent.fechaCancelacion = new Date();
    await rent.save();

    if (rent.estado === 'CANCELADO' && rent.fechaInicio > this.startOfDay(new Date())) {
      await this.remindersService.cancelRentReminder(String(rent._id));
    }
    await this.updateVehicleOperationalStatus(String(rent.vehiculo));

    return {
      message: 'Contrato cancelado con éxito',
      alquiler: rent,
    };
  }

  private calculateExceededDays(fechaFin: Date, fechaFinReal: Date) {
    const end = this.startOfDay(new Date(fechaFin));
    const realEnd = this.startOfDay(new Date(fechaFinReal));

    if (realEnd <= end) {
      return 0;
    }

    const diffMs = realEnd.getTime() - end.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  private async syncRentalStatuses() {
    const today = this.startOfDay(new Date());

    await this.rentModel.updateMany(
      {
        estado: 'ACTIVO',
        fechaInicio: { $gt: today },
      },
      { $set: { estado: 'PROGRAMADO' } },
    );

    const toActivate = await this.rentModel
      .find({
        estado: { $in: ['PROGRAMADO', 'ACTIVO'] },
        fechaInicio: { $lte: today },
      })
      .select('_id vehiculo')
      .sort({ fechaInicio: 1, createdAt: 1 });

    if (toActivate.length === 0) return;

    const updatedVehicleIds = new Set<string>();

    for (const rent of toActivate) {
      const vehicleId = String(rent.vehiculo);
      let releaseVehicleLock: (() => Promise<void>) | null = null;
      try {
        releaseVehicleLock = await this.acquireVehicleLock(vehicleId);
      } catch (error) {
        if (error instanceof BadRequestException) {
          continue;
        }
        throw error;
      }

      try {
        const hasActive = await this.rentModel.exists({
          vehiculo: vehicleId,
          estado: { $in: ['EN_CURSO', 'ACTIVO'] },
        });

        if (hasActive) {
          continue;
        }

        const activated = await this.rentModel.findOneAndUpdate(
          { _id: rent._id, estado: { $in: ['PROGRAMADO', 'ACTIVO'] } },
          { $set: { estado: 'EN_CURSO' } },
          { new: true },
        );

        if (activated) {
          updatedVehicleIds.add(vehicleId);
        }
      } catch (error: any) {
        if (error?.code !== 11000) {
          throw error;
        }
      } finally {
        if (releaseVehicleLock) {
          await releaseVehicleLock();
        }
      }
    }

    if (updatedVehicleIds.size > 0) {
      await this.vehicleModel.updateMany(
        { _id: { $in: Array.from(updatedVehicleIds) } },
        { $set: { status: 'ALQUILADO' } },
      );
    }
  }

  private async updateVehicleOperationalStatus(vehicleId: string) {
    if (!isValidObjectId(vehicleId)) return;

    const today = this.startOfDay(new Date());
    const activeMaintenance = await this.maintenanceModel.exists({
      vehiculo_id: vehicleId,
      fechaInicio: { $lte: today },
      fechaEntrega: { $gte: today },
    });

    if (activeMaintenance) {
      await this.vehicleModel.findByIdAndUpdate(vehicleId, {
        $set: { status: 'MANTENIMIENTO' },
      });
      return;
    }

    const activeRent = await this.rentModel.exists({
      vehiculo: vehicleId,
      estado: { $in: ['EN_CURSO', 'ACTIVO'] },
    });

    await this.vehicleModel.findByIdAndUpdate(vehicleId, {
      $set: { status: activeRent ? 'ALQUILADO' : 'DISPONIBLE' },
    });
  }

  private startOfDay(date: Date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private parseDateToStartOfDay(value: string) {
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (dateOnlyRegex.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    return this.startOfDay(new Date(value));
  }

  private async acquireVehicleLock(vehicleId: string) {
    if (!isValidObjectId(vehicleId)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const token = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const now = new Date();
    const lockUntil = new Date(now.getTime() + 15000);

    const lockedVehicle = await this.vehicleModel.findOneAndUpdate(
      {
        _id: vehicleId,
        $or: [
          { rentalLockUntil: { $exists: false } },
          { rentalLockUntil: null },
          { rentalLockUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          rentalLockToken: token,
          rentalLockUntil: lockUntil,
        },
      },
      { new: true },
    );

    if (!lockedVehicle) {
      throw new BadRequestException(
        'El vehículo está siendo procesado. Intenta nuevamente.',
      );
    }

    return async () => {
      await this.vehicleModel.updateOne(
        { _id: vehicleId, rentalLockToken: token },
        {
          $unset: {
            rentalLockToken: '',
            rentalLockUntil: '',
          },
        },
      );
    };
  }
}
