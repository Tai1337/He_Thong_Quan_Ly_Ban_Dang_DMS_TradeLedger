import { getSalesOrdersWithKPIs } from '../services/salesOrderService.js';

export const getSalesOrders = async (req, res) => {
  try {
    // In a real app, distributorId comes from req.user
    // For this mockup, we'll hardcode or take from query if available
    const distributorId = req.query.distributorId || 1; // Fallback to 1 for demo purposes

    const result = await getSalesOrdersWithKPIs(distributorId, req.query);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
};
