import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  Param,
  Get,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';
import { UploadVehicleDocumentDto } from './dto/upload-vehicle-document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

@Controller(['vehicles', 'vehiculos'])
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateVehicleDto) {
    const vehicle = await this.vehiclesService.create(dto);
    return {
      message: 'Vehículo creado con éxito',
      vehicle,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const vehicle = await this.vehiclesService.findOne(id);
    return vehicle;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    const vehicle = await this.vehiclesService.update(id, dto);
    return {
      message: 'Vehículo actualizado con éxito',
      vehicle,
    };
  }

  @Post(':id/documentos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const relativeBasePath = join('uploads', 'vehicles', req.params.id);
          const absolutePath = join(process.cwd(), relativeBasePath);

          if (!existsSync(absolutePath)) {
            mkdirSync(absolutePath, { recursive: true });
          }
          cb(null, absolutePath);
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname).toLowerCase();
          const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
          cb(null, safeName);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(new BadRequestException('Formato no permitido'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @Body() dto: UploadVehicleDocumentDto,
    @UploadedFile() file: UploadedFile,
  ) {
    return this.vehiclesService.uploadDocument(id, dto, file);
  }

  @Get(':id/documentos')
  async listDocuments(@Param('id') id: string) {
    const documents = await this.vehiclesService.listDocuments(id);
    return { documents };
  }

  @Get(':id/documentos/:docId')
  async getDocument(@Param('id') id: string, @Param('docId') docId: string) {
    const document = await this.vehiclesService.getDocument(id, docId);
    return { document };
  }

  @Get(':id/documentos/:docId/descargar')
  async downloadDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const file = await this.vehiclesService.getDocumentFile(id, docId);
    return res.download(file.storagePath, file.originalName);
  }

  @Get(':id/alquileres')
  @UseGuards(JwtAuthGuard)
  async getVehicleRents(@Param('id') id: string) {
    return this.vehiclesService.getVehicleRentHistory(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteVehicle(@Param('id') id: string) {
    const vehicle = await this.vehiclesService.delete(id);

    return {
      message: 'Vehículo eliminado con éxito',
      vehicle,
    };
  }


}
