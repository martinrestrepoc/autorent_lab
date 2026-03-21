import { IsDateString, IsNotEmpty } from "class-validator";

export class FinalizeRentDto {
  @IsNotEmpty()
  @IsDateString()
  fechaFinReal: string;
}
