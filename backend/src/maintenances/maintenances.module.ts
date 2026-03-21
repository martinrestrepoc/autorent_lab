import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemindersModule } from '../reminders/reminders.module';
import { Rent, RentSchema } from '../rents/schemas/rent.schema';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema';
import { MaintenancesController } from './maintenances.controller';
import { MaintenancesService } from './maintenances.service';
import { Maintenance, MaintenanceSchema } from './schemas/maintenance.schema';
 
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Maintenance.name, schema: MaintenanceSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Rent.name, schema: RentSchema },
    ]),
    RemindersModule,
  ],
  controllers: [MaintenancesController],
  providers: [MaintenancesService],
})
export class MaintenancesModule {}
