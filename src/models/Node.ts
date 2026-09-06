import mongoose, { Schema, Document } from "mongoose";

export interface INode extends Document {
  name: string;
  type: "file" | "folder";
  parentId: mongoose.Types.ObjectId | null;
  ownerId: string;
  telegramMessageId?: number;
  size?: number;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NodeSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["file", "folder"], required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Node", default: null },
    ownerId: { type: String, required: true },
    telegramMessageId: { type: Number },
    size: { type: Number },
    mimeType: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Node || mongoose.model<INode>("Node", NodeSchema);
