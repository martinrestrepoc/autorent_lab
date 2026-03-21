import { IsDateString, IsEnum } from 'class-validator';
import { VehicleDocumentType } from '../schemas/vehicle.schema';

export class UploadVehicleDocumentDto {
  @IsEnum(VehicleDocumentType)
  type!: VehicleDocumentType;

  @IsDateString()
  expiresAt!: string;
}
