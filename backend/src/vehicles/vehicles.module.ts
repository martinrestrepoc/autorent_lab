import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehiclesService } from './vehicles.service';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { VehiclesController } from './vehicles.controller';
import { Rent, RentSchema } from '../rents/schemas/rent.schema';
import { Maintenance, MaintenanceSchema } from '../maintenances/schemas/maintenance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Rent.name, schema: RentSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },
    ]),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
