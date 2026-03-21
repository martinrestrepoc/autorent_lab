import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { existsSync } from 'fs';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { Maintenance } from '../maintenances/schemas/maintenance.schema';
import { LegalDocument, Vehicle } from './schemas/vehicle.schema';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { UploadVehicleDocumentDto } from './dto/upload-vehicle-document.dto';
import { relative, join } from 'path';
import { Rent } from '../rents/schemas/rent.schema';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
    @InjectModel(Rent.name) private rentModel: Model<Rent>,
    @InjectModel(Maintenance.name)
    private maintenanceModel: Model<Maintenance>,
  ) {}

  async create(dto: CreateVehicleDto) {
    const plate = dto.plate.trim().toUpperCase();

    const exists = await this.vehicleModel.exists({ plate });
    if (exists) {
      throw new BadRequestException('La placa ya existe');
    }

    return this.vehicleModel.create({
      ...dto,
      plate,
      status: 'DISPONIBLE',
    });
  }
  async findAll() {
    await this.syncVehicleStatuses();
    return this.vehicleModel.find({ status: { $ne: 'INACTIVO' } }).sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    await this.syncVehicleStatuses(id);
    const vehicle = await this.vehicleModel.findById(id);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.vehicleModel.findByIdAndUpdate(
      id,
      { $set: dto },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return vehicle;
  }

  async uploadDocument(
    vehicleId: string,
    dto: UploadVehicleDocumentDto,
    file: UploadedFile,
  ) {
    this.validateObjectId(vehicleId, 'Vehículo no encontrado');

    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo');
    }

    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const expiresAt = new Date(dto.expiresAt);
    const relativePath = relative(process.cwd(), file.path);
    const newDocument: LegalDocument = {
      type: dto.type,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: relativePath,
      expiresAt,
      uploadedAt: new Date(),
    };

    vehicle.documents.push(newDocument);
    await vehicle.save();

    const savedDocument = vehicle.documents[vehicle.documents.length - 1];

    return {
      message: 'Documento cargado con éxito',
      document: this.toDocumentResponse(savedDocument),
    };
  }

  async listDocuments(vehicleId: string) {
    this.validateObjectId(vehicleId, 'Vehículo no encontrado');

    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return vehicle.documents.map((document) =>
      this.toDocumentResponse(document),
    );
  }

  async getDocument(vehicleId: string, docId: string) {
    this.validateObjectId(vehicleId, 'Vehículo no encontrado');
    this.validateObjectId(docId, 'Documento no encontrado');

    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const document = vehicle.documents.find(
      (item: any) => item._id.toString() === docId,
    );
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return this.toDocumentResponse(document);
  }

  async getDocumentFile(vehicleId: string, docId: string) {
    this.validateObjectId(vehicleId, 'Vehículo no encontrado');
    this.validateObjectId(docId, 'Documento no encontrado');

    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const document = vehicle.documents.find(
      (item: any) => item._id.toString() === docId,
    );
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const absolutePath = join(process.cwd(), document.storagePath);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Archivo no encontrado en disco');
    }

    return {
      storagePath: absolutePath,
      originalName: document.originalName,
      mimeType: document.mimeType,
    };
  }

  private validateObjectId(value: string, message: string) {
    if (!isValidObjectId(value)) {
      throw new NotFoundException(message);
    }
  }

  private toDocumentResponse(document: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiresAt = new Date(document.expiresAt);
    const expiresAtDate = new Date(expiresAt);
    expiresAtDate.setHours(0, 0, 0, 0);

    const status = expiresAtDate < today ? 'VENCIDO' : 'VIGENTE';

    return {
      id: document._id.toString(),
      type: document.type,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      storagePath: document.storagePath,
      expiresAt: document.expiresAt,
      uploadedAt: document.uploadedAt,
      status,
    };
  }

  async getVehicleRentHistory(vehicleId: string) {
    if (!isValidObjectId(vehicleId)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const rents = await this.rentModel
      .find({ vehiculo: vehicleId })
      .populate('cliente')
      .sort({ createdAt: -1 });

    if (rents.length === 0) {
      return {
        message: 'Sin historial de alquileres',
        historial: [],
      };
    }

    return {
      vehicleId,
      total: rents.length,
      historial: rents,
    };
  }

  private async syncVehicleStatuses(vehicleId?: string) {
    const today = this.startOfDay(new Date());
    const filter = vehicleId ? { _id: vehicleId } : {};
    const vehicles = await this.vehicleModel
    .find({ ...filter, status: { $ne: 'INACTIVO' } })
    .select('_id status');

    for (const vehicle of vehicles) {
      const id = String(vehicle._id);
      const activeMaintenance = await this.maintenanceModel.exists({
        vehiculo_id: id,
        fechaInicio: { $lte: today },
        fechaEntrega: { $gte: today },
      });

      let status = 'DISPONIBLE';

      if (activeMaintenance) {
        status = 'MANTENIMIENTO';
      } else {
        const activeRent = await this.rentModel.exists({
          vehiculo: id,
          estado: { $in: ['EN_CURSO', 'ACTIVO'] },
        });
        status = activeRent ? 'ALQUILADO' : 'DISPONIBLE';
      }

      if (vehicle.status !== status) {
        await this.vehicleModel.updateOne(
          { _id: id },
          { $set: { status } },
        );
      }
    }
  }

  private startOfDay(date: Date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  async delete(id: string) {
    this.validateObjectId(id, 'Vehículo no encontrado');

    const vehicle = await this.vehicleModel.findById(id);

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    } 

    if (vehicle.status === 'INACTIVO') {
      throw new BadRequestException('El vehículo ya está inactivo');
    }

    const activeRent = await this.rentModel.exists({
      vehiculo: id,
      estado: { $in: ['EN_CURSO', 'ACTIVO'] },
    });

    if (activeRent) {
      throw new BadRequestException(
        'No se puede eliminar un vehículo con un alquiler activo',
      );
    }

    vehicle.status = 'INACTIVO';
    await vehicle.save();

    return {
      message: 'Vehículo desactivado correctamente',
      vehicleId: id,
    };
}


}
