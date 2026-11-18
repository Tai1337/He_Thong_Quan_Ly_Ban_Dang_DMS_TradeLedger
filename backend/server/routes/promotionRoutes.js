import express from 'express';
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  evaluateOrderPromotions,
  getClearanceCandidates,
  autoGeneratePromotion,
  evaluateCartPromotions,
} from '../controllers/promotionController.js';

const router = express.Router();

router.get('/promotions', getPromotions);
router.get('/promotions/clearance-candidates', getClearanceCandidates);
router.post('/promotions/auto-generate', autoGeneratePromotion);
router.post('/promotions/evaluate-cart', evaluateCartPromotions);
router.post('/promotions/evaluate', evaluateOrderPromotions);
router.get('/promotions/:id', getPromotionById);
router.post('/promotions', createPromotion);
router.patch('/promotions/:id', updatePromotion);
router.delete('/promotions/:id', deletePromotion);

export default router;
