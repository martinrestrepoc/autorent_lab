import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRentDto } from './dto/create-rent.dto';
import { AlquileresService } from './rents.service';
import { FinalizeRentDto } from './dto/finalize-rent.dto';
import { CancelRentDto } from './dto/cancel-rent.dto';

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
