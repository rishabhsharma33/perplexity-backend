import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Schema({ _id: false })
export class Source {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  url!: string;

  @Prop({ trim: true })
  snippet?: string;
}

export const SourceSchema = SchemaFactory.createForClass(Source);

@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversation!: Types.ObjectId;

  @Prop({ type: String, enum: MessageRole, required: true })
  role!: MessageRole;

  @Prop({ required: true })
  content!: string;

  @Prop({ type: [SourceSchema], default: [] })
  sources!: Source[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
