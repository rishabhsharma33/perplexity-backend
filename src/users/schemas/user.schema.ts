import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<User, UserMethods>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true, trim: true })
  name!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

UserSchema.methods.comparePassword = function (
  this: UserDocument,
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
