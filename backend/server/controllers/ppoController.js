import {
  generatePpoSuggestionsService,
  getPpoSuggestionsService,
  getPpoByIdService,
  updatePpoQuantityService,
  approvePpoBatchService,
  rejectPpoService,
  getPpoWindowStatus
} from '../services/ppoService.js';
import { execute11AmClosingService } from '../services/ppoAutoClosingService.js';
import { findPpoSummary } from '../repositories/ppoRepository.js';

export const generatePpo = async (req, res) => {
  try {
    const { distributorId = 1 } = req.body;
    const result = await generatePpoSuggestionsService(distributorId);
    res.json({
      message: 'Đã hoàn tất phân tích ROP và sinh đề xuất đặt hàng mua thành công',
      ...result
    });
  } catch (error) {
    console.error('generatePpo error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server khi sinh đề xuất' });
  }
};

export const getPpoSuggestions = async (req, res) => {
  try {
    const { distributorId = 1, ...filters } = req.query;
    const result = await getPpoSuggestionsService(distributorId, filters);
    res.json(result);
  } catch (error) {
    console.error('getPpoSuggestions error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server khi tải danh sách PPO' });
  }
};

export const getPpoSummary = async (req, res) => {
  try {
    const { distributorId = 1 } = req.query;
    const summary = await findPpoSummary(distributorId);
    res.json(summary);
  } catch (error) {
    console.error('getPpoSummary error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server khi tải thống kê PPO' });
  }
};

export const getPpoById = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1 } = req.query;
    const ppo = await getPpoByIdService(id, distributorId);

    if (!ppo) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất PPO' });
    }

    res.json(ppo);
  } catch (error) {
    console.error('getPpoById error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server khi tải chi tiết PPO' });
  }
};

export const updatePpoQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1, finalQty } = req.body;
    const updated = await updatePpoQuantityService(id, { distributorId, finalQty });
    res.json(updated);
  } catch (error) {
    console.error('updatePpoQuantity error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi cập nhật số lượng' });
  }
};

export const approvePpoBatch = async (req, res) => {
  try {
    const { distributorId = 1, ppoIds, userId } = req.body;
    const result = await approvePpoBatchService({ distributorId, ppoIds, userId });
    res.json(result);
  } catch (error) {
    console.error('approvePpoBatch error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi duyệt đề xuất' });
  }
};

export const rejectPpo = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1, userId, reason } = req.body;
    const updated = await rejectPpoService(id, { distributorId, userId, reason });
    res.json(updated);
  } catch (error) {
    console.error('rejectPpo error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi từ chối đề xuất' });
  }
};

export const getPpoDailyWindowStatus = async (req, res) => {
  try {
    const status = getPpoWindowStatus();
    res.json(status);
  } catch (error) {
    console.error('getPpoDailyWindowStatus error:', error);
    res.status(500).json({ error: 'Lỗi khi kiểm tra khung giờ PPO' });
  }
};

export const execute11AmClosing = async (req, res) => {
  try {
    const { distributorId = 1, userId } = req.body;
    const result = await execute11AmClosingService({ distributorId, userId });
    res.json(result);
  } catch (error) {
    console.error('execute11AmClosing error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi thực thi chốt đơn lúc 11:00' });
  }
};

