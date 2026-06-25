import { Request, Response } from 'express';
import { Applicant } from '../models/Applicant';
import { LoanApplication } from '../models/LoanApplication';
import { Payment } from '../models/Payment';
import { runBRE } from '../services/bre.service';
import { calculateSI, calculateTotalRepayment } from '../services/loan.service';

// POST /api/borrower/personal-details
export async function savePersonalDetails(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { fullName, pan, dateOfBirth, monthlySalary, employmentMode } = req.body;

  if (!fullName || !pan || !dateOfBirth || monthlySalary === undefined || !employmentMode) {
    res.status(400).json({ message: 'All fields are required' });
    return;
  }

  // Check if details already locked (BRE passed)
  const existing = await Applicant.findOne({ userId });
  if (existing && existing.breStatus === 'passed') {
    res.status(409).json({ message: 'Personal details are locked after BRE passes' });
    return;
  }

  const breResult = runBRE({ dateOfBirth, monthlySalary: Number(monthlySalary), pan, employmentMode });

  const applicantData = {
    userId,
    fullName: fullName.trim(),
    pan: pan.trim().toUpperCase(),
    dateOfBirth: new Date(dateOfBirth),
    monthlySalary: Number(monthlySalary),
    employmentMode,
    breStatus: breResult.passed ? 'passed' : 'failed',
    breErrors: breResult.errors,
  };

  let applicant;
  if (existing) {
    Object.assign(existing, applicantData);
    applicant = await existing.save();
  } else {
    applicant = await Applicant.create(applicantData);
  }

  if (!breResult.passed) {
    res.status(422).json({
      message: 'Eligibility check failed',
      errors: breResult.errors,
      breStatus: 'failed',
    });
    return;
  }

  res.status(200).json({ message: 'Eligibility check passed', applicant });
}

// GET /api/borrower/personal-details
export async function getPersonalDetails(req: Request, res: Response): Promise<void> {
  const applicant = await Applicant.findOne({ userId: req.user!.id });
  if (!applicant) {
    res.status(404).json({ message: 'Personal details not found' });
    return;
  }
  res.json({ applicant });
}

// POST /api/borrower/upload-salary-slip
export async function uploadSalarySlip(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  // BRE must have passed
  const applicant = await Applicant.findOne({ userId });
  if (!applicant || applicant.breStatus !== 'passed') {
    res.status(403).json({ message: 'Eligibility check must pass before uploading salary slip' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: 'Salary slip file is required' });
    return;
  }

  res.json({
    message: 'Salary slip uploaded successfully',
    filePath: req.file.filename,
    originalName: req.file.originalname,
  });
}

// POST /api/borrower/apply
export async function applyForLoan(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const applicant = await Applicant.findOne({ userId });
  if (!applicant || applicant.breStatus !== 'passed') {
    res.status(403).json({ message: 'Eligibility check must pass before applying' });
    return;
  }

  // Disallow applying if there is already an active (non-rejected) loan
  const existingLoan = await LoanApplication.findOne({ userId, status: { $ne: 'rejected' } });
  if (existingLoan) {
    res.status(409).json({ message: 'You already have an active loan application', loan: existingLoan });
    return;
  }

  const { loanAmount, tenure, salarySlipPath, salarySlipOriginalName } = req.body;

  if (!loanAmount || !tenure || !salarySlipPath || !salarySlipOriginalName) {
    res.status(400).json({ message: 'loanAmount, tenure, salarySlipPath, and salarySlipOriginalName are required' });
    return;
  }

  const amount = Number(loanAmount);
  const days = Number(tenure);

  if (amount < 50000 || amount > 500000) {
    res.status(400).json({ message: 'Loan amount must be between ₹50,000 and ₹5,00,000' });
    return;
  }
  if (days < 30 || days > 365) {
    res.status(400).json({ message: 'Tenure must be between 30 and 365 days' });
    return;
  }

  const si = calculateSI(amount, days);
  const totalRepayment = calculateTotalRepayment(amount, days);

  const loan = await LoanApplication.create({
    userId,
    applicantId: applicant._id,
    salarySlipPath,
    salarySlipOriginalName,
    loanAmount: amount,
    tenure: days,
    interestRate: 12,
    simpleInterest: si,
    totalRepayment,
    status: 'pending',
  });

  res.status(201).json({ message: 'Loan application submitted', loan });
}

// GET /api/borrower/application
export async function getApplication(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const loan = await LoanApplication.findOne({ userId })
    .sort({ createdAt: -1 })
    .populate('applicantId');

  if (!loan) {
    res.status(404).json({ message: 'No loan application found' });
    return;
  }

  // If loan is disbursed, calculate payments info
  let totalPaid = 0;
  let outstanding = loan.totalRepayment;
  if (loan.status === 'disbursed' || loan.status === 'closed') {
    const payments = await Payment.find({ loanApplicationId: loan._id });
    totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    outstanding = Math.max(0, loan.totalRepayment - totalPaid);
  }

  res.json({ loan, totalPaid, outstanding });
}
