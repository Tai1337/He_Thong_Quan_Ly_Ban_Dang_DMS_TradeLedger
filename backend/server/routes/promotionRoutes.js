import express from 'express';
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  evaluateOrderPromotions,
} from '../controllers/promotionController.js';

const router = express.Router();

router.get('/promotions', getPromotions);
router.post('/promotions/evaluate', evaluateOrderPromotions);
router.get('/promotions/:id', getPromotionById);
router.post('/promotions', createPromotion);
router.patch('/promotions/:id', updatePromotion);
router.delete('/promotions/:id', deletePromotion);

export default router;

