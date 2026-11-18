import './ReportsPrint.css';

const formatMoney = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(val) || 0) + ' đ';

const formatNumber = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(val) || 0);

export default function RPT004PrintView({ trip = {}, orders = [] }) {
  // Chuẩn hóa danh sách đơn
  const orderList = orders && orders.length > 0 ? orders : (trip.orders || trip.salesOrders || []);
  const printDate = new Date().toLocaleString('vi-VN');

  return (
    <div className="rpt-print-document rpt-004-document">
      {orderList.map((order, orderIdx) => {
        const retailer = order.retailer || {};
        const items = order.items || [];
        const rawSubtotal = items.reduce(
          (sum, it) => sum + (it.isPromotion ? 0 : Number(it.quantity || 0) * Number(it.unitPrice || 0)),
          0
        );
        const totalDiscount = items.reduce((sum, it) => sum + Number(it.discountAmount || 0), 0);
        const totalAmount = order.totalAmount !== undefined ? Number(order.totalAmount) : Math.max(0, rawSubtotal - totalDiscount);
        const paidAmount = Number(order.paidAmount || 0);
        const codToCollect = order.codAmount !== undefined ? Number(order.codAmount) : Math.max(0, totalAmount - paidAmount);

        return (
          <div className="rpt-print-page" key={order.id || orderIdx}>
            {/* Header */}
            <div className="rpt-doc-header">
              <div className="rpt-company-info">
                <h3>NHÀ PHÂN PHỐI HÀNG TIÊU DÙNG (DMS-NPP)</h3>
                <p>Địa chỉ: Kho Vận & Phân Phối Thương Mại</p>
                <p>Hotline hỗ trợ & Khiếu nại: 1900 6868 - 0988 123 456</p>
              </div>
              <div className="rpt-doc-code-badge">
                <span>Biểu mẫu: <strong>RPT004</strong></span>
                <span>Số phiếu: <strong className="text-blue-800">{order.orderCode}</strong></span>
                <span>Ngày in: {printDate}</span>
              </div>
            </div>

            {/* Title */}
            <div className="rpt-doc-title-block">
              <h1 className="rpt-doc-title">PHIẾU GIAO HÀNG KIÊM BIÊN BẢN THANH TOÁN (RPT004)</h1>
              <p className="rpt-doc-subtitle">
                (Liên 2: Giao cho Khách hàng / Cửa hàng lưu giữ đối soát)
              </p>
            </div>

            {/* Meta Info */}
            <div className="rpt-meta-grid">
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Cửa hàng / Đại lý:</span>
                <span className="rpt-meta-value font-bold" style={{ fontSize: '13.5px' }}>
                  {retailer.name || 'Khách hàng vãng lai'}
                </span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Mã chuyến xe:</span>
                <span className="rpt-meta-value font-mono font-bold">{trip.tripCode || 'N/A'}</span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Địa chỉ giao hàng:</span>
                <span className="rpt-meta-value">{retailer.address || 'Chưa cập nhật'}</span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Nhân viên giao hàng:</span>
                <span className="rpt-meta-value font-bold">
                  {trip.driver?.fullName || 'Tài xế NPP'} ({trip.driver?.phone || 'N/A'})
                </span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Số điện thoại:</span>
                <span className="rpt-meta-value font-bold">{retailer.phone || 'N/A'}</span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Biển số phương tiện:</span>
                <span className="rpt-meta-value font-bold">{trip.licensePlate || 'N/A'}</span>
              </div>
            </div>

            {/* Items Table */}
            <table className="rpt-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>STT</th>
                  <th style={{ width: '11%' }}>Mã SKU</th>
                  <th style={{ width: '29%' }}>Tên Sản Phẩm & Quy Cách</th>
                  <th style={{ width: '6%' }}>ĐVT</th>
                  <th style={{ width: '7%' }}>SL Đặt</th>
                  <th style={{ width: '7%' }}>SL Giao</th>
                  <th style={{ width: '11%' }} className="text-right">Đơn Giá</th>
                  <th style={{ width: '11%' }} className="text-right">Chiết Khấu</th>
                  <th style={{ width: '14%' }} className="text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, itIdx) => {
                  const qty = Number(it.quantity) || 0;
                  const price = Number(it.unitPrice) || 0;
                  const discount = Number(it.discountAmount) || 0;
                  const lineTotal = it.isPromotion ? 0 : Math.max(0, qty * price - discount);

                  return (
                    <tr key={itIdx}>
                      <td className="text-center">{itIdx + 1}</td>
                      <td className="font-mono text-center font-bold">{it.productSku || it.product?.sku}</td>
                      <td>
                        <div className="font-bold">{it.productName || it.product?.name}</div>
                        {it.isPromotion && <span className="badge-foc">🎁 Hàng khuyến mãi tặng 0đ (FOC)</span>}
                      </td>
                      <td className="text-center">{it.unit || it.product?.unit || 'THÙNG'}</td>
                      <td className="text-right font-medium">{formatNumber(qty)}</td>
                      <td className="text-right font-bold text-blue-900">{formatNumber(it.deliveredQuantity !== null && it.deliveredQuantity !== undefined ? it.deliveredQuantity : qty)}</td>
                      <td className="text-right">{it.isPromotion ? '0 đ' : formatMoney(price)}</td>
                      <td className="text-right text-slate-600">{discount > 0 ? `-${formatMoney(discount)}` : '0 đ'}</td>
                      <td className="text-right font-bold text-slate-900">{formatMoney(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Financial Settlement Box */}
            <div className="rpt-payment-summary-block">
              <div className="rpt-payment-summary-box">
                <div className="rpt-payment-line">
                  <span>Tổng tiền hàng (chưa trừ CK):</span>
                  <span className="font-medium">{formatMoney(rawSubtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="rpt-payment-line" style={{ color: '#b91c1c' }}>
                    <span>Tổng chiết khấu khuyến mãi:</span>
                    <span className="font-bold">-{formatMoney(totalDiscount)}</span>
                  </div>
                )}
                <div className="rpt-payment-line" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                  <span>Tổng giá trị đơn hàng:</span>
                  <span className="font-bold">{formatMoney(totalAmount)}</span>
                </div>
                {paidAmount > 0 && (
                  <div className="rpt-payment-line" style={{ color: '#059669' }}>
                    <span>Đã thanh toán trước / Công nợ:</span>
                    <span className="font-bold">-{formatMoney(paidAmount)}</span>
                  </div>
                )}
                <div className="rpt-payment-line highlight">
                  <span>SỐ TIỀN THU THỰC TẾ (COD):</span>
                  <span style={{ fontSize: '15px' }}>{formatMoney(codToCollect)}</span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#475569' }}>
                  Hình thức thanh toán: [ &nbsp; ] Tiền mặt &nbsp;&nbsp;&nbsp; [ &nbsp; ] Chuyển khoản &nbsp;&nbsp;&nbsp; [ &nbsp; ] Nợ đại lý
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="rpt-signatures-grid two-cols">
              <div>
                <div className="rpt-sign-title">Đại Diện Khách Hàng / Cửa Hàng</div>
                <div className="rpt-sign-hint">(Ký, ghi rõ họ tên & đóng dấu nếu có)</div>
                <div className="rpt-sign-space" />
                <div className="rpt-sign-name">{retailer.name || 'Người nhận hàng'}</div>
              </div>
              <div>
                <div className="rpt-sign-title">Nhân Viên Giao Hàng (Tài Xế)</div>
                <div className="rpt-sign-hint">(Ký, ghi rõ họ tên)</div>
                <div className="rpt-sign-space" />
                <div className="rpt-sign-name">{trip.driver?.fullName || 'Tài xế giao hàng'}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

