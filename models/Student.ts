import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  studentId: string;
  admissionNumber?: string;
  name: string;
  className: string;
  section: string;
  rollNumber: number;
  gender?: string;
  dateOfBirth?: string;
  admissionDate?: string;
  address?: string;
  parentId: mongoose.Types.ObjectId;
  phone?: string;
  hostelResident: boolean;
  hostelRoom?: string;
  transportRoute?: string;
  status: 'active' | 'transferred' | 'passed' | 'dropped';
  createdAt: Date;
}

const StudentSchema = new Schema({
  studentId:       { type: String, required: true, unique: true },
  admissionNumber: { type: String, sparse: true },
  name:            { type: String, required: true },
  className:       { type: String, required: true },
  section:         { type: String, required: true },
  rollNumber:      { type: Number, required: true },
  gender:          { type: String, default: 'male' },
  dateOfBirth:     String,
  admissionDate:   String,
  address:         String,
  parentId:        { type: Schema.Types.ObjectId, ref: 'Parent' },
  phone:           String,
  hostelResident:  { type: Boolean, default: false },
  hostelRoom:      String,
  transportRoute:  String,
  status:          { type: String, default: 'active' },
  createdAt:       { type: Date, default: Date.now }
});

export default mongoose.models.Student || mongoose.model('Student', StudentSchema);
