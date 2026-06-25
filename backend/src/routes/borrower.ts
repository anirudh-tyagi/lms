import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { uploadSalarySlip } from '../middleware/upload';
import {
  savePersonalDetails,
  getPersonalDetails,
  uploadSalarySlip as handleUpload,
  applyForLoan,
  getApplication,
} from '../controllers/borrower.controller';

const router = Router();

router.use(verifyToken, authorizeRoles('borrower'));

router.post('/personal-details', savePersonalDetails);
router.get('/personal-details', getPersonalDetails);

router.post('/upload-salary-slip', (req, res, next) => {
  uploadSalarySlip(req, res, (err) => {
    if (err) {
      res.status(400).json({ message: err.message });
      return;
    }
    next();
  });
}, handleUpload);

router.post('/apply', applyForLoan);
router.get('/application', getApplication);

export default router;
