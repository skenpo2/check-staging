import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the interface for a Chat document
export interface IChat extends Document {
  chatName?: string;
  users: mongoose.Types.ObjectId[];
  latestMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const chatSchema: Schema<IChat> = new Schema(
  {
    chatName: { type: String, trim: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    latestMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

// Create and export the model
const Chat: Model<IChat> = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
