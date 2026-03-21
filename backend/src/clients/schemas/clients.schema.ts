import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

export enum ClientStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  documentType: string;

  @Prop({ required: true, trim: true, unique: true, index: true })
  documentNumber: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  email: string;

  @Prop({ default: ClientStatus.ACTIVO, enum: ClientStatus })
  status: ClientStatus;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
