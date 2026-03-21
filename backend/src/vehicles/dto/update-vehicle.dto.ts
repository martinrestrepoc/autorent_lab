import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Campo obligatorio' })
  @Length(6, 6, { message: 'La placa debe tener 6 caracteres' })
  @Matches(/^[A-Z]{3}[0-9]{3}$/, {
    message: 'Formato de placa inválido (ej: ABC123)',
  })
  plate?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt({ message: 'Solo debe contener enteros' })
  @Min(1950, { message: 'Año inválido' })
  @Max(2100, { message: 'Año inválido' })
  year?: number;
}
