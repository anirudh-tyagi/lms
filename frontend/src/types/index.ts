export type Role = 'admin' | 'sales' | 'sanction' | 'disbursement' | 'collection' | 'borrower';
export type EmploymentMode = 'salaried' | 'self-employed' | 'unemployed';
export type BreStatus = 'pending' | 'passed' | 'failed';
export type LoanStatus = 'pending' | 'sanctioned' | 'rejected' | 'disbursed' | 'closed';

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface Applicant {
  _id: string;
  userId: string;
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: EmploymentMode;
  breStatus: BreStatus;
  breErrors: string[];
}

export interface LoanApplication {
  _id: string;
  userId: string;
  applicantId: Applicant | string;
  salarySlipPath: string;
  salarySlipOriginalName: string;
  loanAmount: number;
  tenure: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  status: LoanStatus;
  rejectionReason?: string;
  disbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  loanApplicationId: string;
  utrNumber: string;
  amount: number;
  paymentDate: string;
  recordedBy: { email: string; role: Role } | string;
  createdAt: string;
}
