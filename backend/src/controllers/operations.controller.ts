import { Request, Response } from 'express';
import { User } from '../models/User';
import { LoanApplication } from '../models/LoanApplication';
import { Payment } from '../models/Payment';

// ─── SALES ────────────────────────────────────────────────────────────────────

// GET /api/operations/sales/leads
// Borrowers who have registered but have NOT submitted any loan application
export async function getLeads(req: Request, res: Response): Promise<void> {
  const borrowers = await User.find({ role: 'borrower' }).select('-password').lean();

  const borrowerIds = borrowers.map((b) => b._id);
  const appliedIds = await LoanApplication.distinct('userId', { userId: { $in: borrowerIds } });

  const appliedSet = new Set(appliedIds.map(String));
  const leads = borrowers.filter((b) => !appliedSet.has(String(b._id)));

  res.json({ leads });
}

// ─── SANCTION ─────────────────────────────────────────────────────────────────

// GET /api/operations/sanction/applications
export async function getPendingApplications(req: Request, res: Response): Promise<void> {
  const applications = await LoanApplication.find({ status: 'pending' })
    .populate('userId', '-password')
    .populate('applicantId')
    .sort({ createdAt: -1 });

  res.json({ applications });
}

// PATCH /api/operations/sanction/applications/:id/approve
export async function approveApplication(req: Request, res: Response): Promise<void> {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) {
    res.status(404).json({ message: 'Loan application not found' });
    return;
  }
  if (loan.status !== 'pending') {
    res.status(409).json({ message: `Cannot approve a loan with status: ${loan.status}` });
    return;
  }
  loan.status = 'sanctioned';
  await loan.save();
  res.json({ message: 'Loan sanctioned', loan });
}

// PATCH /api/operations/sanction/applications/:id/reject
export async function rejectApplication(req: Request, res: Response): Promise<void> {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    res.status(400).json({ message: 'Rejection reason is required' });
    return;
  }

  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) {
    res.status(404).json({ message: 'Loan application not found' });
    return;
  }
  if (loan.status !== 'pending') {
    res.status(409).json({ message: `Cannot reject a loan with status: ${loan.status}` });
    return;
  }
  loan.status = 'rejected';
  loan.rejectionReason = reason.trim();
  await loan.save();
  res.json({ message: 'Loan rejected', loan });
}

// ─── DISBURSEMENT ─────────────────────────────────────────────────────────────

// GET /api/operations/disbursement/applications
export async function getApprovedApplications(req: Request, res: Response): Promise<void> {
  const applications = await LoanApplication.find({ status: 'sanctioned' })
    .populate('userId', '-password')
    .populate('applicantId')
    .sort({ createdAt: -1 });

  res.json({ applications });
}

// PATCH /api/operations/disbursement/applications/:id/disburse
export async function disburseApplication(req: Request, res: Response): Promise<void> {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) {
    res.status(404).json({ message: 'Loan application not found' });
    return;
  }
  if (loan.status !== 'sanctioned') {
    res.status(409).json({ message: `Cannot disburse a loan with status: ${loan.status}` });
    return;
  }
  loan.status = 'disbursed';
  loan.disbursedAt = new Date();
  await loan.save();
  res.json({ message: 'Loan disbursed', loan });
}

// ─── COLLECTION ───────────────────────────────────────────────────────────────

// GET /api/operations/collection/loans
export async function getActiveLoans(req: Request, res: Response): Promise<void> {
  const loans = await LoanApplication.find({ status: { $in: ['disbursed', 'closed'] } })
    .populate('userId', '-password')
    .populate('applicantId')
    .sort({ disbursedAt: -1 });

  // Attach total paid for each loan
  const loansWithPayments = await Promise.all(
    loans.map(async (loan) => {
      const payments = await Payment.find({ loanApplicationId: loan._id });
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = Math.max(0, loan.totalRepayment - totalPaid);
      return { ...loan.toObject(), totalPaid, outstanding };
    })
  );

  res.json({ loans: loansWithPayments });
}

// GET /api/operations/collection/loans/:id/payments
export async function getLoanPayments(req: Request, res: Response): Promise<void> {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) {
    res.status(404).json({ message: 'Loan not found' });
    return;
  }

  const payments = await Payment.find({ loanApplicationId: loan._id })
    .populate('recordedBy', 'email role')
    .sort({ paymentDate: -1 });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = Math.max(0, loan.totalRepayment - totalPaid);

  res.json({ payments, totalPaid, outstanding, totalRepayment: loan.totalRepayment });
}

// POST /api/operations/collection/loans/:id/payments
export async function recordPayment(req: Request, res: Response): Promise<void> {
  const loan = await LoanApplication.findById(req.params.id);
  if (!loan) {
    res.status(404).json({ message: 'Loan not found' });
    return;
  }
  if (loan.status !== 'disbursed') {
    res.status(409).json({ message: `Cannot record payment for loan with status: ${loan.status}` });
    return;
  }

  const { utrNumber, amount, paymentDate } = req.body;
  if (!utrNumber || !amount || !paymentDate) {
    res.status(400).json({ message: 'utrNumber, amount, and paymentDate are required' });
    return;
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    res.status(400).json({ message: 'Amount must be a positive number' });
    return;
  }

  // Calculate outstanding balance
  const existingPayments = await Payment.find({ loanApplicationId: loan._id });
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = loan.totalRepayment - totalPaid;

  if (parsedAmount > outstanding) {
    res.status(400).json({
      message: `Payment amount (₹${parsedAmount}) exceeds outstanding balance (₹${outstanding.toFixed(2)})`,
    });
    return;
  }

  // Ensure UTR is unique
  const utr = utrNumber.trim().toUpperCase();
  const duplicate = await Payment.findOne({ utrNumber: utr });
  if (duplicate) {
    res.status(409).json({ message: `UTR number ${utr} already exists` });
    return;
  }

  const payment = await Payment.create({
    loanApplicationId: loan._id,
    utrNumber: utr,
    amount: parsedAmount,
    paymentDate: new Date(paymentDate),
    recordedBy: req.user!.id,
  });

  // Auto-close if fully paid
  const newTotalPaid = totalPaid + parsedAmount;
  if (newTotalPaid >= loan.totalRepayment) {
    loan.status = 'closed';
    await loan.save();
  }

  const newOutstanding = Math.max(0, loan.totalRepayment - newTotalPaid);

  res.status(201).json({
    message: loan.status === 'closed' ? 'Payment recorded. Loan is now closed.' : 'Payment recorded',
    payment,
    totalPaid: newTotalPaid,
    outstanding: newOutstanding,
    loanStatus: loan.status,
  });
}
