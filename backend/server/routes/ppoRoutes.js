import express from 'express';
import {
  generatePpo,
  getPpoSuggestions,
  getPpoSummary,
  getPpoById,
  updatePpoQuantity,
  approvePpoBatch,
  rejectPpo,
  getPpoDailyWindowStatus,
  execute11AmClosing
} from '../controllers/ppoController.js';

const router = express.Router();

router.get('/ppo/window-status', getPpoDailyWindowStatus);
router.post('/ppo/execute-closing', execute11AmClosing);
router.post('/ppo/generate', generatePpo);
router.get('/ppo', getPpoSuggestions);
router.get('/ppo/summary', getPpoSummary);
router.get('/ppo/:id', getPpoById);
router.patch('/ppo/:id', updatePpoQuantity);
router.post('/ppo/approve-batch', approvePpoBatch);
router.patch('/ppo/:id/reject', rejectPpo);

export default router;
