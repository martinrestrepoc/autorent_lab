import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ _id: true })
export class ConditionPhoto {
  @Prop({ required: true, trim: true })
  originalName: string;

  @Prop({ required: true, trim: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, trim: true })
  storagePath: string;

  @Prop({ required: true })
  uploadedAt: Date;
}

export const ConditionPhotoSchema = SchemaFactory.createForClass(ConditionPhoto);

@Schema({ _id: false })
export class FinalConditionReport {
  @Prop({ required: true, default: false })
  hayDanos: boolean;

  @Prop({ required: true, trim: true })
  descripcion: string;

  @Prop({ required: true })
  fechaReporte: Date;
}

export const FinalConditionReportSchema =
  SchemaFactory.createForClass(FinalConditionReport);

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

  @Prop({ type: [ConditionPhotoSchema], default: [] })
  fotosEstadoInicial: ConditionPhoto[];

  @Prop({ type: [ConditionPhotoSchema], default: [] })
  fotosEstadoFinal: ConditionPhoto[];

  @Prop({ type: FinalConditionReportSchema, default: null })
  reporteCierre?: FinalConditionReport | null;
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
