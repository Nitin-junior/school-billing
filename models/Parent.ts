import mongoose, { Schema, Document } from 'mongoose';

export interface IParent extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  callmebotApiKey?: string;
  whatsappActivated: boolean;
  createdAt: Date;
}

const ParentSchema = new Schema({
  name:             { type: String, required: true },
  phone:            { type: String, required: true, unique: true },
  email:            String,
  address:          String,
  callmebotApiKey:  String,
  whatsappActivated: { type: Boolean, default: false },
  createdAt:        { type: Date, default: Date.now }
});

export default mongoose.models.Parent || mongoose.model('Parent', ParentSchema);
