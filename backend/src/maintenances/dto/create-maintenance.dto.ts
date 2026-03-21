import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MaintenanceType } from '../schemas/maintenance.schema';
 
export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType, {
    message: 'tipo debe ser "preventivo" o "correctivo"',
  })
  tipo: MaintenanceType;
 
  @IsString()
  descripcion: string;
 
  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaEntrega: string;
 
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsBoolean()
  crearRecordatorio?: boolean;

  @IsOptional()
  @IsDateString()
  fechaRecordatorio?: string;

  @IsOptional()
  @IsString()
  tituloRecordatorio?: string;

  @IsOptional()
  @IsString()
  detalleRecordatorio?: string;
}
