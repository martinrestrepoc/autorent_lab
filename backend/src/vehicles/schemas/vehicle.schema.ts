import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

export enum VehicleDocumentType {
  SOAT = 'SOAT',
  TARJETA_PROPIEDAD = 'TARJETA_PROPIEDAD',
  TECNOMECANICA = 'TECNOMECANICA',
}

@Schema({ _id: true })
export class LegalDocument {
  @Prop({ required: true, enum: VehicleDocumentType })
  type!: VehicleDocumentType;

  @Prop({ required: true, trim: true })
  originalName!: string;

  @Prop({ required: true, trim: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ required: true, trim: true })
  storagePath!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: Date.now })
  uploadedAt?: Date;
}

export const LegalDocumentSchema = SchemaFactory.createForClass(LegalDocument);

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  plate!: string;

  @Prop({ required: true, trim: true })
  brand!: string;

  @Prop({ required: true, trim: true })
  model!: string;

  @Prop({ required: true, min: 1950, max: 2100 })
  year!: number;

  @Prop({
    enum: ['DISPONIBLE', 'ALQUILADO', 'MANTENIMIENTO', 'INACTIVO'],
    default: 'DISPONIBLE',
  })
  status!: string;

  @Prop()
  rentalLockToken?: string;

  @Prop()
  rentalLockUntil?: Date;

  @Prop({ type: [LegalDocumentSchema], default: [] })
  documents!: LegalDocument[];
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
