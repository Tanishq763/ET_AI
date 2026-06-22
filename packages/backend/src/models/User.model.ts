import mongoose, { Schema, Document } from 'mongoose';
import { User as IUser } from '@ikip/shared';
import bcrypt from 'bcryptjs';

export interface UserDocument extends Omit<IUser, '_id'>, Document {
  passwordHash: string;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ['SuperAdmin', 'PlantAdmin', 'Engineer', 'Technician', 'Operator', 'Auditor', 'Viewer'],
      required: true,
      default: 'Viewer',
    },
    plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
    additionalPlants: [{ type: Schema.Types.ObjectId, ref: 'Plant' }],
  },
  { timestamps: true }
);

// Method to compare password
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
export default UserModel;
