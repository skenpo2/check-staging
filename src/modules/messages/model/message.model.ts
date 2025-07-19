import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the interface for a Message document
export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  content: string;
  chat: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const messageSchema: Schema<IMessage> = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, required: true },
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Create and export the model
const Message: Model<IMessage> = mongoose.model<IMessage>(
  'Message',
  messageSchema
);

export default Message;
