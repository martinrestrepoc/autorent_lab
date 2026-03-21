import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  fullName!: string;

   @IsString()
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  @IsIn(['CC', 'CE', 'PAS'], {
    message: 'Tipo de documento inválido',
  })
  documentType!: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @MinLength(5, {
    message: 'El documento debe tener al menos 5 dígitos',
  })
  documentNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Matches(/^[0-9]{7,15}$/, {
    message: 'Teléfono inválido',
  })
  phone!: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email!: string;
}
