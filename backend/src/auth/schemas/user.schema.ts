import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLEADO = 'EMPLEADO',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({
    required: true,
    enum: UserRole,
    default: UserRole.EMPLEADO,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;
  // Sirve para habilitar/deshabilitar usuarios sin borrarlos
}

export const UserSchema = SchemaFactory.createForClass(User);
