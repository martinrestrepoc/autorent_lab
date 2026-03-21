import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  Matches,
  Length,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty({ message: 'Campo obligatorio' })
  @Length(6, 6, { message: 'La placa debe tener 6 caracteres' })
  @Matches(/^[A-Z]{3}[0-9]{3}$/, {
    message: 'Formato de placa inválido (ej: ABC123)',
  })
  plate!: string;

  /*  
   ! le dice a Typescript
   “Aunque no haya constructor, esta propiedad definitivamente tendrá valor cuando se use.”
   */

  @IsString()
  @IsNotEmpty({ message: 'Campo obligatorio' })
  brand!: string;

  @IsString()
  @IsNotEmpty({ message: 'Campo obligatorio' })
  model!: string;

  @IsInt({ message: 'Campo obligatorio' })
  @Min(1950, { message: 'Año inválido' })
  @Max(2100, { message: 'Año inválido' })
  year!: number;
}
