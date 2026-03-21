import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateRentDto {
  @IsNotEmpty()
  cliente: string;

  @IsNotEmpty()
  vehiculo: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsBoolean()
  createStartReminder?: boolean;

  @IsOptional()
  @IsDateString()
  startReminderDate?: string;

  @IsOptional()
  @IsString()
  startReminderTitle?: string;

  @IsOptional()
  @IsString()
  startReminderDetail?: string;

  @IsOptional()
  @IsBoolean()
  createReturnReminder?: boolean;

  @IsOptional()
  @IsDateString()
  returnReminderDate?: string;

  @IsOptional()
  @IsString()
  returnReminderTitle?: string;

  @IsOptional()
  @IsString()
  returnReminderDetail?: string;
}
