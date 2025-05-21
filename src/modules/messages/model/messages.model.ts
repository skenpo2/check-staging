import mongoose, { Document, Schema, Types } from "mongoose";

// TODO: If a Zod schema exists for Message, import it like:
// import { IMessage as IMessageSchema } from '../schemas/message.schema';

export interface IMessage {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  content: string;
  read: boolean;
  booking?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends IMessage, Document {}

const MessageSchema = new Schema<IMessageDocument>(
  {
    sender: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: [true, 'Sender is required'],
      index: true
    },
    receiver: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: [true, 'Receiver is required'],
      index: true
    },
    content: { 
      type: String, 
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [2000, 'Message is too long'] 
    },
    read: { 
      type: Boolean, 
      default: false,
      index: true
    },
    booking: { 
      type: Schema.Types.ObjectId, 
      ref: "Booking"
    },
  },
  {
    timestamps: true, 
    versionKey: false 
  }
);

// Create indexes for faster queries
MessageSchema.index({ sender: 1, receiver: 1 }); // Conversation between two users
MessageSchema.index({ createdAt: -1 }); // Sort by newest first
MessageSchema.index({ booking: 1 }); // Messages related to a booking

// Define virtual for conversation
MessageSchema.virtual('conversation').get(function() {
  return Message.find({
    $or: [
      { sender: this.sender, receiver: this.receiver },
      { sender: this.receiver, receiver: this.sender }
    ]
  }).sort({ createdAt: -1 });
});

MessageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: mongoose.Document, ret: Record<string, any>, options: any) => {
    delete ret.id;
    return ret;
  }
});

const Message = mongoose.model<IMessageDocument>("Message", MessageSchema);
export default Message;
