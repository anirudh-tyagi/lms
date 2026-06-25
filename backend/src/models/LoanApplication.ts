import { Schema, model, Document, Types } from 'mongoose';

export type LoanStatus = 'pending' | 'sanctioned' | 'rejected' | 'disbursed' | 'closed';

export interface ILoanApplication extends Document {
  userId: Types.ObjectId;
  applicantId: Types.ObjectId;
  salarySlipPath: string;
  salarySlipOriginalName: string;
  loanAmount: number;
  tenure: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  status: LoanStatus;
  rejectionReason?: string;
  disbursedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LoanApplicationSchema = new Schema<ILoanApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true },
    salarySlipPath: { type: String, required: true },
    salarySlipOriginalName: { type: String, required: true },
    loanAmount: { type: Number, required: true, min: 50000, max: 500000 },
    tenure: { type: Number, required: true, min: 30, max: 365 },
    interestRate: { type: Number, required: true, default: 12 },
    simpleInterest: { type: Number, required: true },
    totalRepayment: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'sanctioned', 'rejected', 'disbursed', 'closed'],
      default: 'pending',
    },
    rejectionReason: { type: String },
    disbursedAt: { type: Date },
  },
  { timestamps: true }
);

export const LoanApplication = model<ILoanApplication>('LoanApplication', LoanApplicationSchema);
