import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRentDto } from './dto/create-rent.dto';
import { AlquileresService } from './rents.service';
import { FinalizeRentDto } from './dto/finalize-rent.dto';
import { CancelRentDto } from './dto/cancel-rent.dto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

const allowedPhotoMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

type UploadedRentPhoto = {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('alquileres')
@UseGuards(JwtAuthGuard)
export class AlquileresController {
  constructor(private readonly service: AlquileresService) {}

  @Post()
  create(@Body() dto: CreateRentDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post(':id/fotos-iniciales')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const relativeBasePath = join(
            'uploads',
            'rentals',
            req.params.id,
            'initial-condition',
          );
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
        if (!allowedPhotoMimeTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Solo se permiten fotos JPG, PNG o WEBP'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  uploadInitialConditionPhoto(
    @Param('id') id: string,
    @UploadedFile() file: UploadedRentPhoto,
  ) {
    return this.service.uploadInitialConditionPhoto(id, file);
  }

  @Get(':id/fotos-iniciales')
  listInitialConditionPhotos(@Param('id') id: string) {
    return this.service.listInitialConditionPhotos(id);
  }

  @Get(':id/fotos-iniciales/:photoId/descargar')
  async downloadInitialConditionPhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    const file = await this.service.getInitialConditionPhotoFile(id, photoId);
    return res.download(file.storagePath, file.originalName);
  }

  @Post(':id/fotos-finales')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const relativeBasePath = join(
            'uploads',
            'rentals',
            req.params.id,
            'final-condition',
          );
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
        if (!allowedPhotoMimeTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Solo se permiten fotos JPG, PNG o WEBP'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  uploadFinalConditionPhoto(
    @Param('id') id: string,
    @UploadedFile() file: UploadedRentPhoto,
  ) {
    return this.service.uploadFinalConditionPhoto(id, file);
  }

  @Get(':id/fotos-finales')
  listFinalConditionPhotos(@Param('id') id: string) {
    return this.service.listFinalConditionPhotos(id);
  }

  @Get(':id/fotos-finales/:photoId/descargar')
  async downloadFinalConditionPhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Res() res: Response,
  ) {
    const file = await this.service.getFinalConditionPhotoFile(id, photoId);
    return res.download(file.storagePath, file.originalName);
  }

  @Patch(':id/finalizar')
  finalize(@Param('id') id: string, @Body() dto: FinalizeRentDto) {
    return this.service.finalize(id, dto);
  }

  @Patch(':id/cancelar')
  cancel(@Param('id') id: string, @Body() dto: CancelRentDto) {
    return this.service.cancel(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
