import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  telegramId: string;
  storageChannelId: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    telegramId: { type: String, required: true, unique: true },
    storageChannelId: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
