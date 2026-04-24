import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class FinalizeRentDto {
  @IsNotEmpty()
  @IsDateString()
  fechaFinReal: string;

  @IsBoolean()
  hayDanos: boolean;

  @IsOptional()
  @IsString()
  descripcionReporte?: string;
}
