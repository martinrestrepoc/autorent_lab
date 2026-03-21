import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '../clients/schemas/clients.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { Rent, RentSchema } from '../rents/schemas/rent.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { RemindersController } from './reminders.controller';
import { RemindersActivationService } from './reminders-activation.service';
import { RemindersService } from './reminders.service';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Rent.name, schema: RentSchema },
      { name: Client.name, schema: ClientSchema },
    ]),
  ],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersActivationService],
  exports: [RemindersActivationService, RemindersService],
})
export class RemindersModule {}
