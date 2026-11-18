import * as promotionService from '../services/promotionService.js';

export const getPromotions = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const promotions = await promotionService.getPromotions(distributorId, req.query);
    res.json({ data: promotions });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách khuyến mãi:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPromotionById = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const promotion = await promotionService.getPromotionById(req.params.id, distributorId);
    res.json(promotion);
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết khuyến mãi:', error);
    res.status(404).json({ error: error.message });
  }
};

export const createPromotion = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const promotion = await promotionService.createPromotion(distributorId, req.body);
    res.status(201).json(promotion);
  } catch (error) {
    console.error('Lỗi khi tạo khuyến mãi:', error);
    res.status(400).json({ error: error.message });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const promotion = await promotionService.updatePromotion(req.params.id, distributorId, req.body);
    res.json(promotion);
  } catch (error) {
    console.error('Lỗi khi cập nhật khuyến mãi:', error);
    res.status(400).json({ error: error.message });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const result = await promotionService.deletePromotion(req.params.id, distributorId);
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi xóa khuyến mãi:', error);
    res.status(400).json({ error: error.message });
  }
};

export const evaluateOrderPromotions = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const result = await promotionService.evaluateOrderPromotions(distributorId, req.body);
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi đánh giá khuyến mãi đơn hàng:', error);
    res.status(400).json({ error: error.message });
  }
};

