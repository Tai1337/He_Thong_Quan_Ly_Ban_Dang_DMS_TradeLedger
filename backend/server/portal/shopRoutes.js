import express from 'express';
import {
  handleRegister,
  handleLogin,
  handleGetProfile,
  handleGetProducts,
  handleGetProductDetail,
  handleGetCategories,
  handlePlaceOrder,
  handleGetMyOrders,
  handleGetOrderDetail
} from './shopController.js';

export const setupShopRoutes = (io) => {
  const router = express.Router();

  // Authentication cho khách hàng Web Bán Hàng
  router.post('/auth/register', handleRegister);
  router.post('/auth/login', handleLogin);
  router.get('/auth/profile/:customerId', handleGetProfile);

  // Catalog & Danh mục
  router.get('/products', handleGetProducts);
  router.get('/products/:id', handleGetProductDetail);
  router.get('/categories', handleGetCategories);

  // Đơn hàng R-
  router.post('/orders', (req, res) => handlePlaceOrder(req, res, io));
  router.get('/my-orders/:customerId', handleGetMyOrders);
  router.get('/orders/:orderCode', handleGetOrderDetail);

  return router;
};

export default setupShopRoutes;
