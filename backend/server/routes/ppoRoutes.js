import express from 'express';
import {
  generatePpo,
  getPpoSuggestions,
  getPpoSummary,
  getPpoById,
  updatePpoQuantity,
  approvePpoBatch,
  rejectPpo
} from '../controllers/ppoController.js';

const router = express.Router();

router.post('/ppo/generate', generatePpo);
router.get('/ppo', getPpoSuggestions);
router.get('/ppo/summary', getPpoSummary);
router.get('/ppo/:id', getPpoById);
router.patch('/ppo/:id', updatePpoQuantity);
router.post('/ppo/approve-batch', approvePpoBatch);
router.patch('/ppo/:id/reject', rejectPpo);

export default router;
