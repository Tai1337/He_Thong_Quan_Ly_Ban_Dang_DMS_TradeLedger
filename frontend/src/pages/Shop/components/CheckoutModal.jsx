import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Copy, 
  Check, 
  PackageCheck, 
  AlertCircle, 
  Store, 
  User,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { placeShopOrder } from '../../../services/api';
import './CheckoutModal.css';

export default function CheckoutModal({
  isOpen,
  onClose,
  customer,
  cartItems,
  onOrderSuccess
}) {
  const [shippingAddress, setShippingAddress] = useState(customer?.address || '');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'BANK_TRANSFER'

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isStore = customer?.accountType === 'STORE';
  const totalAmount = cartItems.reduce((sum, item) => {
    const price = isStore ? item.wholesalePrice : item.basePrice;
    return sum + price * item.quantity;
  }, 0);

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!shippingAddress.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ nhận hàng');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customerId: customer.id,
        items: cartItems.map(it => ({
          productId: it.id,
          quantity: it.quantity,
          unitPrice: isStore ? it.wholesalePrice : it.basePrice
        })),
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim(),
        paymentMethod
      };

      const res = await placeShopOrder(payload);
      setPlacedOrder(res.order);
      onOrderSuccess(res.order);
    } catch (err) {
      setErrorMsg(err.message || 'Đặt hàng thất bại. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (placedOrder?.orderCode) {
      navigator.clipboard.writeText(placedOrder.orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="portal-modal-overlay" onClick={onClose}>
      <div className="checkout-modal-card" onClick={(e) => e.stopPropagation()}>
        {!placedOrder ? (
          <>
            <div className="checkout-modal-header">
              <div className="checkout-title-area">
                <div className="checkout-icon-badge">
                  <PackageCheck size={20} color="#059669" />
                </div>
                <div>
                  <h3>Xác Nhận Đặt Hàng</h3>
                  <p>Mã đơn hàng sẽ được tạo với tiền tố <strong>R-</strong></p>
                </div>
              </div>
              <button className="checkout-close-btn" onClick={onClose} aria-label="Đóng">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="checkout-error-alert">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form className="checkout-form" onSubmit={handleConfirmOrder}>
              {/* Customer Box */}
              <div className="checkout-customer-box">
                <div className="customer-box-row">
                  <div className="box-avatar">
                    {isStore ? <Store size={18} color="#d97706" /> : <User size={18} color="#2563eb" />}
                  </div>
                  <div className="customer-texts">
                    <strong>{customer?.storeName || customer?.fullName}</strong>
                    <span className="customer-box-phone">SĐT: {customer?.phone}</span>
                  </div>
                  <span className={`customer-pill-tag ${isStore ? 'store' : 'consumer'}`}>
                    {isStore ? 'Đại Lý • Giá Sỉ' : 'Khách Cá Nhân'}
                  </span>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="form-field">
                <label>Địa chỉ nhận hàng <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  required
                />
              </div>

              {/* Delivery Notes */}
              <div className="form-field">
                <label>Ghi chú đơn hàng (tuỳ chọn)</label>
                <textarea
                  rows="2"
                  placeholder="VD: Giao giờ hành chính, gọi trước khi đến..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div className="form-field">
                <label>Hình thức thanh toán</label>
                <div className="payment-options-grid">
                  <button
                    type="button"
                    className={`payment-option-card ${paymentMethod === 'COD' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('COD')}
                  >
                    <div className="pay-card-icon">
                      <Banknote size={20} color="#059669" />
                    </div>
                    <div className="pay-info">
                      <strong>Thanh toán khi nhận hàng (COD)</strong>
                      <small>Kiểm tra hàng đầy đủ rồi thanh toán tiền mặt</small>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`payment-option-card ${paymentMethod === 'BANK_TRANSFER' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  >
                    <div className="pay-card-icon">
                      <QrCode size={20} color="#2563eb" />
                    </div>
                    <div className="pay-info">
                      <strong>Chuyển khoản QR ngân hàng (VietQR)</strong>
                      <small>Quét mã ngân hàng qua App tiện lợi</small>
                    </div>
                  </button>
                </div>
              </div>

              {/* QR transfer instructions if selected */}
              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="qr-guide-box">
                  <div className="qr-card-header">
                    <ShieldCheck size={16} color="#059669" />
                    <span>Thông tin chuyển khoản chính thức</span>
                  </div>
                  <div className="qr-info-row">
                    <span>Ngân hàng thụ hưởng:</span> <strong>MB Bank (Quân Đội)</strong>
                  </div>
                  <div className="qr-info-row">
                    <span>Số tài khoản:</span> <strong className="acc-number">090123456789</strong>
                  </div>
                  <div className="qr-info-row">
                    <span>Chủ tài khoản:</span> <strong>NPP THỰC PHẨM & ĐỒ UỐNG DMS</strong>
                  </div>
                  <div className="qr-info-row">
                    <span>Cú pháp nội dung:</span> <strong className="transfer-memo">{customer?.phone} thanh toan don R</strong>
                  </div>
                </div>
              )}

              {/* Order summary table */}
              <div className="checkout-summary-box">
                <div className="checkout-summary-row">
                  <span>Số lượng mặt hàng:</span>
                  <strong>{cartItems.length} mặt hàng ({cartItems.reduce((s, it) => s + it.quantity, 0)} kiện)</strong>
                </div>
                <div className="checkout-summary-row total">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="checkout-total-val">
                    {totalAmount.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="checkout-submit-btn"
                disabled={loading}
              >
                {loading ? 'Đang khởi tạo đơn hàng...' : 'Xác Nhận Đặt Hàng Ngay'}
              </button>
            </form>
          </>
        ) : (
          /* Success Screen */
          <div className="order-success-card">
            <div className="success-icon-badge">
              <Check size={36} color="#059669" strokeWidth={2.8} />
            </div>
            <h2>Đặt Hàng Thành Công!</h2>
            <p className="success-desc">
              Đơn hàng của bạn đã được tiếp nhận tự động vào hệ thống DMS và gửi tới bộ phận điều phối kho.
            </p>

            <div className="order-code-box">
              <span className="code-label">MÃ ĐƠN HÀNG CỦA BẠN:</span>
              <div className="code-display-row">
                <span className="code-value">{placedOrder.orderCode}</span>
                <button
                  type="button"
                  className="copy-code-btn"
                  onClick={handleCopyCode}
                  title="Sao chép mã đơn"
                >
                  {copied ? (
                    <>
                      <Check size={13} color="#059669" /> <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <small className="code-hint">Mã đơn hàng mang tiền tố <strong>R-</strong> dành cho đơn đặt trực tuyến.</small>
            </div>

            <div className="success-details-summary">
              <div className="detail-line">
                <span>Trạng thái đơn hàng:</span>
                <span className="status-badge pending">Chờ NPP tiếp nhận</span>
              </div>
              <div className="detail-line">
                <span>Tổng giá trị đơn:</span>
                <strong>{placedOrder.totalAmount?.toLocaleString('vi-VN')} ₫</strong>
              </div>
            </div>

            <button
              type="button"
              className="finish-btn"
              onClick={onClose}
            >
              <span>Tiếp Tục Mua Sắm</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
