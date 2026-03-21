import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument, ClientStatus } from './schemas/clients.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {}

  async create(dto: CreateClientDto) {
    const exists = await this.clientModel.findOne({
      documentNumber: dto.documentNumber,
    });
    if (exists) throw new ConflictException('El documento ya está registrado');

    return this.clientModel.create({
      ...dto,
      status: ClientStatus.ACTIVO,
    });
  }

  async findAll() {
    return this.clientModel.find().sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    const client = await this.clientModel.findById(id);
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    // Si intentan cambiar el documento, validar duplicado
    if (dto.documentNumber) {
      const duplicate = await this.clientModel.findOne({
        documentNumber: dto.documentNumber,
        _id: { $ne: id },
      });

      if (duplicate)
        throw new ConflictException('El documento ya está registrado');
    }

    const updated = await this.clientModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });

    if (!updated) throw new NotFoundException('Cliente no encontrado');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.clientModel.findByIdAndDelete(id);

    if (!deleted) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return deleted;
  }
}
