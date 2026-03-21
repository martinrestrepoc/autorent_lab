import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Rent } from '../rents/schemas/rent.schema';
import { RemindersService } from '../reminders/reminders.service';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { Maintenance, MaintenanceDocument } from './schemas/maintenance.schema';
 
@Injectable()
export class MaintenancesService {
  constructor(
    @InjectModel(Maintenance.name)
    private readonly maintenanceModel: Model<MaintenanceDocument>,
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
    @InjectModel(Rent.name)
    private readonly rentModel: Model<Rent>,
    private readonly remindersService: RemindersService,
  ) {}
 
  private validateId(id: string, label = 'ID') {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`${label} inválido`);
    }
  }
 
  // POST /vehiculos/:id/mantenimientos
  async create(vehicleId: string, dto: CreateMaintenanceDto, userId: string) {
    this.validateId(vehicleId, 'Vehículo');

    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');

    const fechaInicio = this.parseDateToStartOfDay(dto.fechaInicio);
    const fechaEntrega = this.parseDateToStartOfDay(dto.fechaEntrega);

    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaEntrega.getTime())) {
      throw new BadRequestException('Fechas inválidas');
    }

    if (fechaEntrega < fechaInicio) {
      throw new BadRequestException(
        'La fecha de entrega debe ser mayor o igual a la fecha de inicio',
      );
    }

    const overlappingMaintenance = await this.maintenanceModel.findOne({
      vehiculo_id: vehicleId,
      fechaInicio: { $lte: fechaEntrega },
      fechaEntrega: { $gte: fechaInicio },
    });

    if (overlappingMaintenance) {
      throw new BadRequestException(
        'El vehículo ya tiene un mantenimiento en ese rango de fechas',
      );
    }

    const overlappingRent = await this.rentModel.findOne({
      vehiculo: vehicleId,
      estado: { $in: ['PROGRAMADO', 'EN_CURSO', 'ACTIVO'] },
      fechaInicio: { $lte: fechaEntrega },
      fechaFin: { $gte: fechaInicio },
    });

    if (overlappingRent) {
      throw new BadRequestException(
        'El vehículo tiene un alquiler que se solapa con ese mantenimiento',
      );
    }

    const maintenance = await this.maintenanceModel.create({
      vehiculo_id: vehicleId,
      tipo: dto.tipo,
      descripcion: dto.descripcion,
      fechaInicio,
      fechaEntrega,
      costo: dto.costo ?? 0,
    });

    if (dto.crearRecordatorio) {
      await this.remindersService.create(vehicleId, userId, {
        fechaRecordatorio: dto.fechaRecordatorio ?? dto.fechaInicio,
        titulo:
          dto.tituloRecordatorio?.trim() ||
          `Mantenimiento ${dto.tipo}`,
        detalle:
          dto.detalleRecordatorio?.trim() || dto.descripcion.trim(),
      });
    }

    await this.updateVehicleOperationalStatus(vehicleId);

    return {
      message: 'Mantenimiento registrado con éxito',
      mantenimiento: maintenance,
    };
  }
 
  // GET /vehiculos/:id/mantenimientos
  async findByVehicle(vehicleId: string) {
    this.validateId(vehicleId, 'Vehículo');
 
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
 
    const mantenimientos = await this.maintenanceModel
      .find({ vehiculo_id: vehicleId })
      .sort({ fechaInicio: -1, createdAt: -1 })
      .lean();
 
    return {
      vehicleId,
      total: mantenimientos.length,
      mantenimientos,
    };
  }
 
  // GET /mantenimientos/:id
  async findOne(id: string) {
    this.validateId(id, 'Mantenimiento');
 
    const maintenance = await this.maintenanceModel.findById(id).lean();
    if (!maintenance) throw new NotFoundException('Mantenimiento no encontrado');

    return maintenance;
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

  private async updateVehicleOperationalStatus(vehicleId: string) {
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
}
