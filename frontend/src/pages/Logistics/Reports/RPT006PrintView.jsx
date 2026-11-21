import './ReportsPrint.css';

const formatMoney = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(val) || 0) + ' đ';

const formatNumber = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(val) || 0);

export default function RPT006PrintView({ trip = {}, accountantName = 'Kế toán công nợ' }) {
  const orders = trip.orders || trip.salesOrders || [];
  const printDate = new Date().toLocaleString('vi-VN');

  const totalCodToCollect = orders.reduce((sum, o) => {
    const cod = o.codAmount !== undefined ? Number(o.codAmount) : Number(o.totalAmount || 0) - Number(o.paidAmount || 0);
    return sum + Math.max(0, cod);
  }, 0);

  const totalPackages = orders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((s, it) => s + Number(it.quantity || 0), 0);
  }, 0);

  return (
    <div className="rpt-print-document rpt-006-document">
      <div className="rpt-print-page">
        {/* Header */}
        <div className="rpt-doc-header">
          <div className="rpt-company-info">
            <h3>HỆ THỐNG PHÂN PHỐI THƯƠNG MẠI DMS - TRADELedger</h3>
            <p>Phòng Kế toán & Ban Quản trị Vận tải NPP</p>
          </div>
          <div className="rpt-doc-code-badge">
            <span>Biểu mẫu: <strong>RPT006</strong></span>
            <span>Mã chuyến xe: <strong className="text-blue-800">{trip.tripCode}</strong></span>
            <span>Ngày in: {printDate}</span>
          </div>
        </div>

        {/* Title */}
        <div className="rpt-doc-title-block">
          <h1 className="rpt-doc-title">BẢNG KÊ GIAO HÀNG & THU TIỀN CHUYẾN XE (RPT006)</h1>
          <p className="rpt-doc-subtitle">
            (Bảng kê danh sách điểm bán & đối soát dòng tiền thu COD giữa Nhân viên giao nhận và Kế toán)
          </p>
        </div>

        {/* Meta Info */}
        <div className="rpt-meta-grid">
          <div className="rpt-meta-item">
            <span className="rpt-meta-label">Mã chuyến xe:</span>
            <span className="rpt-meta-value font-mono font-bold text-blue-800">{trip.tripCode}</span>
          </div>
          <div className="rpt-meta-item">
            <span className="rpt-meta-label">Nhân viên GH / Tài xế:</span>
            <span className="rpt-meta-value font-bold">
              {trip.driver?.fullName || 'Chưa phân tài xế'} ({trip.driver?.phone || 'N/A'})
            </span>
          </div>
          <div className="rpt-meta-item">
            <span className="rpt-meta-label">Biển số phương tiện:</span>
            <span className="rpt-meta-value font-bold">{trip.licensePlate || 'N/A'}</span>
          </div>
          <div className="rpt-meta-item">
            <span className="rpt-meta-label">Ngày giao hàng:</span>
            <span className="rpt-meta-value font-bold">{trip.expectedDeliveryDate || 'Hôm nay'}</span>
          </div>
          <div className="rpt-meta-item">
            <span className="rpt-meta-label">Kho xuất phát:</span>
            <span className="rpt-meta-value">{trip.warehouse?.name || 'Kho Tổng NPP'}</span>
          </div>
          <div className="rpt-meta-item">
            <span className="rpt-meta-label">Tổng tải trọng:</span>
            <span className="rpt-meta-value">
              {trip.currentWeightKg || 0} / {trip.maxWeightKg || 1500} kg ({trip.loadPercentage || 0}% tải)
            </span>
          </div>
        </div>

        {/* Table of Stops / Deliveries */}
        <table className="rpt-print-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>STT</th>
              <th style={{ width: '11%' }}>Mã Đơn SO</th>
              <th style={{ width: '20%' }}>Tên Cửa Hàng / Khách Hàng</th>
              <th style={{ width: '19%' }}>Địa Chỉ Giao Hàng</th>
              <th style={{ width: '10%' }}>Điện Thoại</th>
              <th style={{ width: '6%' }}>Số Thùng</th>
              <th style={{ width: '11%' }} className="text-right">Tiền Phải Thu</th>
              <th style={{ width: '9%' }} className="text-right">Thực Thu</th>
              <th style={{ width: '5%' }} className="text-center">Hình Thức</th>
              <th style={{ width: '5%' }} className="text-center">Ký Nhận</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((ord, idx) => {
              const retailer = ord.retailer || {};
              const pkgCount = (ord.items || []).reduce((s, it) => s + Number(it.quantity || 0), 0);
              const cod = ord.codAmount !== undefined ? Number(ord.codAmount) : Number(ord.totalAmount || 0) - Number(ord.paidAmount || 0);

              return (
                <tr key={ord.id || idx}>
                  <td className="text-center font-bold">{idx + 1}</td>
                  <td className="font-mono text-center font-bold">{ord.orderCode}</td>
                  <td>
                    <div className="font-bold">{retailer.name || 'Khách vãng lai'}</div>
                    {retailer.code && <span style={{ fontSize: '11px', color: '#64748b' }}>[{retailer.code}]</span>}
                  </td>
                  <td style={{ fontSize: '11px' }}>{retailer.address || 'Tại quầy'}</td>
                  <td className="text-center" style={{ fontSize: '11px' }}>{retailer.phone || 'N/A'}</td>
                  <td className="text-center font-bold">{formatNumber(pkgCount)}</td>
                  <td className="text-right font-bold text-blue-900">{formatMoney(cod)}</td>
                  <td className="text-right" style={{ color: '#cbd5e1' }}>..................</td>
                  <td className="text-center" style={{ fontSize: '10px' }}>[TM/CK/Nợ]</td>
                  <td className="text-center" style={{ color: '#cbd5e1' }}>[ &nbsp;&nbsp;&nbsp;&nbsp; ]</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="rpt-table-total-row">
              <td colSpan={5} className="text-right font-bold">TỔNG CỘNG ({orders.length} ĐIỂM GIAO):</td>
              <td className="text-center font-bold text-blue-900">{formatNumber(totalPackages)}</td>
              <td className="text-right font-bold text-blue-900" style={{ fontSize: '13.5px' }}>
                {formatMoney(totalCodToCollect)}
              </td>
              <td className="text-right font-bold" style={{ color: '#cbd5e1' }}>..................</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        {/* Settlement Notes & Checkbox */}
        <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
          <div><strong>* Quy định đối soát tiền thu:</strong></div>
          <div>1. Nhân viên giao hàng có trách nhiệm thu đủ số tiền theo biên bản giao nhận và bảo quản nguyên vẹn tiền mặt/chứng từ chuyển khoản.</div>
          <div>2. Mọi trường hợp giao thiếu, hàng rớt hoặc khách hàng hẹn thanh toán sau phải được ghi chú rõ ràng vào cột Ghi chú và có chữ ký xác nhận của đại lý.</div>
        </div>

        {/* Signatures */}
        <div className="rpt-signatures-grid">
          <div>
            <div className="rpt-sign-title">Nhân Viên Giao Hàng (Tài Xế)</div>
            <div className="rpt-sign-hint">(Ký cam kết đã nộp đủ tiền thu)</div>
            <div className="rpt-sign-space" />
            <div className="rpt-sign-name">{trip.driver?.fullName || 'Tài xế giao hàng'}</div>
          </div>
          <div>
            <div className="rpt-sign-title">Kế Toán Thu Tiền / Thủ Quỹ</div>
            <div className="rpt-sign-hint">(Ký xác nhận đã nhận đủ tiền nộp)</div>
            <div className="rpt-sign-space" />
            <div className="rpt-sign-name">{accountantName}</div>
          </div>
          <div>
            <div className="rpt-sign-title">Điều Phối Viên / Quản Lý Kho</div>
            <div className="rpt-sign-hint">(Ký duyệt kết thúc chuyến xe)</div>
            <div className="rpt-sign-space" />
            <div className="rpt-sign-name">................................................</div>
          </div>
        </div>
      </div>
    </div>
  );
}

