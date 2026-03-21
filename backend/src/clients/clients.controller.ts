import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  async create(@Body() dto: CreateClientDto) {
    const client = await this.clientsService.create(dto);
    return {
      message: 'Cliente creado correctamente',
      client,
    };
  }

  @Get()
  async findAll() {
    const clients = await this.clientsService.findAll();
    return { clients };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const client = await this.clientsService.findOne(id);
    return { client };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    const client = await this.clientsService.update(id, dto);
    return { message: 'Cliente actualizado correctamente', client };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const client = await this.clientsService.remove(id);
    return {
      message: 'Cliente eliminado correctamente',
      client,
    };
  }
}
