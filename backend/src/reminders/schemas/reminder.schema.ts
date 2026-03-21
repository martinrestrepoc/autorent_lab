import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReminderDocument = HydratedDocument<Reminder>;

export enum ReminderType {
  MANTENIMIENTO = 'MANTENIMIENTO',
  ALQUILER = 'ALQUILER',
}

export enum ReminderEvent {
  INICIO = 'INICIO',
  DEVOLUCION = 'DEVOLUCION',
}

export enum ReminderStatus {
  PROGRAMADO = 'PROGRAMADO',
  ACTIVADO = 'ACTIVADO',
  CERRADO = 'CERRADO',
  CANCELADO = 'CANCELADO',
}

@Schema({ timestamps: true, collection: 'recordatorios' })
export class Reminder {
  @Prop({ required: true, enum: ReminderType, default: ReminderType.MANTENIMIENTO })
  tipo: ReminderType;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true, index: true })
  vehiculo_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Rent', default: null, index: true })
  alquiler_id?: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: ReminderEvent,
    default: null,
    index: true,
  })
  evento?: ReminderEvent | null;

  @Prop({ required: true, index: true })
  fechaRecordatorio: Date;

  @Prop({ required: true, trim: true })
  titulo: string;

  @Prop({ trim: true, default: '' })
  detalle: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  assignedUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({
    required: true,
    enum: ReminderStatus,
    default: ReminderStatus.PROGRAMADO,
    index: true,
  })
  estado: ReminderStatus;

  @Prop({ type: Date, default: null, index: true })
  notifiedAt?: Date | null;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

ReminderSchema.index(
  { vehiculo_id: 1, fechaRecordatorio: 1, estado: 1 },
  { name: 'reminder_vehicle_schedule_idx' },
);

ReminderSchema.index(
  { alquiler_id: 1, tipo: 1, evento: 1 },
  { name: 'reminder_rent_event_idx' },
);
