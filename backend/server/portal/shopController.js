import * as shopService from './shopService.js';

export const handleRegister = async (req, res) => {
  try {
    const customer = await shopService.registerCustomer(req.body);
    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      customer
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const handleLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const customer = await shopService.loginCustomer(phone, password);
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      customer
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const handleGetProfile = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await shopService.getCustomerProfile(customerId);
    res.json({
      success: true,
      customer
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
};

export const handleGetProducts = async (req, res) => {
  try {
    const { categoryId, search, accountType, cursor, limit } = req.query;
    const result = await shopService.getShopProducts({
      categoryId,
      search,
      accountType,
      cursor,
      limit: limit ? Number(limit) : 16
    });
    res.json({
      success: true,
      data: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      totalCount: result.totalCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const handleGetCategories = async (req, res) => {
  try {
    const categories = await shopService.getShopCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const handleGetProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountType } = req.query;
    const product = await shopService.getShopProductDetail(id, accountType);
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
};

export const handlePlaceOrder = async (req, res, io) => {
  try {
    const order = await shopService.placeShopOrder(req.body, io);
    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      order
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const handleGetMyOrders = async (req, res) => {
  try {
    const { customerId } = req.params;
    const orders = await shopService.getCustomerOrders(customerId);
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const handleGetOrderDetail = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const order = await shopService.getOrderDetailByCode(orderCode);
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
};
