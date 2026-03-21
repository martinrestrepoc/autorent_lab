import { IsNotEmpty, IsString } from "class-validator";

export class CancelRentDto {
  @IsString()
  @IsNotEmpty({ message: "Ingrese motivo de cancelación" })
  motivoCancelacion!: string;
}
