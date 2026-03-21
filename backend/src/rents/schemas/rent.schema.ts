import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class Rent {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  cliente: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehiculo: Types.ObjectId;

  @Prop({ required: true })
  fechaInicio: Date;

  @Prop({ required: true })
  fechaFin: Date;

  @Prop()
  fechaFinReal?: Date;

  @Prop({ default: 0 })
  diasExceso?: number;

  @Prop({ trim: true })
  motivoCancelacion?: string;

  @Prop()
  fechaCancelacion?: Date;

  @Prop({
    enum: ['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO', 'ACTIVO'],
    default: 'PROGRAMADO',
  })
  estado: string;
}

export const RentSchema = SchemaFactory.createForClass(Rent);

// Garantiza máximo un alquiler EN_CURSO por vehículo.
RentSchema.index(
  { vehiculo: 1, estado: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: 'EN_CURSO' },
  },
);
