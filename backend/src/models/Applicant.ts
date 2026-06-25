import { Schema, model, Document, Types } from 'mongoose';

export type EmploymentMode = 'salaried' | 'self-employed' | 'unemployed';
export type BreStatus = 'pending' | 'passed' | 'failed';

export interface IApplicant extends Document {
  userId: Types.ObjectId;
  fullName: string;
  pan: string;
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  breStatus: BreStatus;
  breErrors: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantSchema = new Schema<IApplicant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    pan: { type: String, required: true, uppercase: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalary: { type: Number, required: true },
    employmentMode: {
      type: String,
      enum: ['salaried', 'self-employed', 'unemployed'],
      required: true,
    },
    breStatus: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
    breErrors: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Applicant = model<IApplicant>('Applicant', ApplicantSchema);
