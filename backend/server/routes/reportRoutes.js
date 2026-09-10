import express from 'express';
import { 
  getRpt005, 
  getRpt057, 
  getRpt006, 
  getRpt061 
} from '../controllers/reportController.js';

const router = express.Router();

router.get('/rpt005', getRpt005);
router.get('/rpt057', getRpt057);
router.get('/rpt006', getRpt006);
router.get('/rpt061', getRpt061);

export default router;
