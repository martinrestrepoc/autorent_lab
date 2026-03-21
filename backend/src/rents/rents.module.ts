import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RemindersModule } from "src/reminders/reminders.module";
import { Client, ClientSchema } from "src/clients/schemas/clients.schema";
import { Maintenance, MaintenanceSchema } from "src/maintenances/schemas/maintenance.schema";
import { Vehicle, VehicleSchema } from "src/vehicles/schemas/vehicle.schema";
import { AlquileresController } from "./rents.controller";
import { AlquileresService } from "./rents.service";
import { Rent, RentSchema } from "./schemas/rent.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rent.name, schema: RentSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Client.name, schema: ClientSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },
    ]),
    RemindersModule,
  ],
  controllers: [AlquileresController],
  providers: [AlquileresService],
})
export class AlquileresModule {}
