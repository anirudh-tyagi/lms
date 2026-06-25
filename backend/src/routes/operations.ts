import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import {
  getLeads,
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getApprovedApplications,
  disburseApplication,
  getActiveLoans,
  getLoanPayments,
  recordPayment,
} from '../controllers/operations.controller';

const router = Router();

// All operations routes require authentication
router.use(verifyToken);

// ─── SALES ────────────────────────────────────────────────────────────────────
router.get('/sales/leads', authorizeRoles('sales', 'admin'), getLeads);

// ─── SANCTION ─────────────────────────────────────────────────────────────────
router.get('/sanction/applications', authorizeRoles('sanction', 'admin'), getPendingApplications);
router.patch('/sanction/applications/:id/approve', authorizeRoles('sanction', 'admin'), approveApplication);
router.patch('/sanction/applications/:id/reject', authorizeRoles('sanction', 'admin'), rejectApplication);

// ─── DISBURSEMENT ─────────────────────────────────────────────────────────────
router.get('/disbursement/applications', authorizeRoles('disbursement', 'admin'), getApprovedApplications);
router.patch('/disbursement/applications/:id/disburse', authorizeRoles('disbursement', 'admin'), disburseApplication);

// ─── COLLECTION ───────────────────────────────────────────────────────────────
router.get('/collection/loans', authorizeRoles('collection', 'admin'), getActiveLoans);
router.get('/collection/loans/:id/payments', authorizeRoles('collection', 'admin'), getLoanPayments);
router.post('/collection/loans/:id/payments', authorizeRoles('collection', 'admin'), recordPayment);

export default router;
