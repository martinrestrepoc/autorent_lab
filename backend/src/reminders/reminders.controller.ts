import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { RemindersService } from './reminders.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post(['vehiculos/:id/recordatorios', 'vehicles/:id/reminders'])
  create(
    @Param('id') vehicleId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateReminderDto,
  ) {
    return this.remindersService.create(vehicleId, req.user.id, dto);
  }

  @Get(['vehiculos/:id/recordatorios', 'vehicles/:id/reminders'])
  findByVehicle(@Param('id') vehicleId: string) {
    return this.remindersService.findByVehicle(vehicleId);
  }

  @Get(['recordatorios', 'reminders'])
  findAssignedToUser(@Req() req: AuthenticatedRequest) {
    return this.remindersService.findAssignedToUser(req.user.id);
  }
}
