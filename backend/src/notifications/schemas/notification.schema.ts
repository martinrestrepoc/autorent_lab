import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  RECORDATORIO_MANTENIMIENTO = 'RECORDATORIO_MANTENIMIENTO',
  RECORDATORIO_ALQUILER = 'RECORDATORIO_ALQUILER',
}

@Schema({ timestamps: true, collection: 'notificaciones' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType, index: true })
  tipo: NotificationType;

  @Prop({ type: Types.ObjectId, ref: 'Reminder', required: true, index: true })
  recordatorioId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  titulo: string;

  @Prop({ required: true, trim: true })
  mensaje: string;

  @Prop({ required: true, index: true })
  fechaEvento: Date;

  @Prop({ default: false, index: true })
  leida: boolean;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index(
  { userId: 1, tipo: 1, recordatorioId: 1 },
  { unique: true, name: 'notification_user_recordatorio_unique_idx' },
);
