import { useMemo } from 'react';
import './ReportsPrint.css';

const formatNumber = (val) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(val) || 0);

export default function RPT002PrintView({ trips = [], currentUserName = 'Thủ kho trưởng' }) {
  // Chuẩn hóa mảng trips
  const tripList = Array.isArray(trips) ? trips : [trips];
  const isMultiple = tripList.length > 1;

  // Gom nhóm toàn bộ sản phẩm xuất kho từ tất cả các chuyến xe
  const aggregatedItems = useMemo(() => {
    const itemMap = {};

    tripList.forEach((trip) => {
      (trip.orders || trip.salesOrders || []).forEach((order) => {
        (order.items || []).forEach((item) => {
          const sku = item.productSku || item.product?.sku || 'N/A';
          const name = item.productName || item.product?.name || 'Sản phẩm';
          const unit = item.unit || item.product?.unit || 'THÙNG';
          const isPromo = Boolean(item.isPromotion);
          const qty = Number(item.quantity) || 0;

          const key = `${sku}_${isPromo ? 'PROMO' : 'COMMERCIAL'}`;

          if (!itemMap[key]) {
            itemMap[key] = {
              sku,
              name,
              unit,
              isPromo,
              totalQuantity: 0,
              lotDetails: new Set(),
              orderCodes: new Set(),
              tripCodes: new Set()
            };
          }

          itemMap[key].totalQuantity += qty;
          itemMap[key].orderCodes.add(order.orderCode);
          if (trip.tripCode) itemMap[key].tripCodes.add(trip.tripCode);

          // Thu thập thông tin lô hàng
          (item.allocations || []).forEach((alloc) => {
            const lotNum = alloc.lotNumber || alloc.stockLot?.lotNumber;
            const exp = alloc.expiryDate ? String(alloc.expiryDate).slice(0, 10) : '';
            const loc = alloc.locationCode || 'Kho';
            if (lotNum && lotNum !== 'N/A') {
              itemMap[key].lotDetails.add(`${lotNum}${exp ? ` (HSD: ${exp})` : ''} - [${loc}]`);
            }
          });
        });
      });
    });

    return Object.values(itemMap).sort((a, b) => a.sku.localeCompare(b.sku));
  }, [tripList]);

  const totalPackages = aggregatedItems.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalOrdersCount = tripList.reduce(
    (sum, t) => sum + ((t.orders || t.salesOrders || []).length),
    0
  );

  const printDate = new Date().toLocaleString('vi-VN');

  return (
    <div className="rpt-print-document rpt-002-document">
      <div className="rpt-print-page">
        {/* Header */}
        <div className="rpt-doc-header">
          <div className="rpt-company-info">
            <h3>HỆ THỐNG PHÂN PHỐI DMS - TRADELedger</h3>
            <p>Đơn vị quản lý: Nhà Phân Phối FMCG</p>
            <p>Địa chỉ kho: Kho Tổng NPP - Phân khu bốc dỡ số 1</p>
          </div>
          <div className="rpt-doc-code-badge">
            <span>Biểu mẫu: <strong>RPT002</strong></span>
            <span>Ngày in: {printDate}</span>
          </div>
        </div>

        {/* Title */}
        <div className="rpt-doc-title-block">
          <h1 className="rpt-doc-title">
            {isMultiple ? 'PHIẾU XUẤT KHO TỔNG HỢP GÔM HÀNG (RPT002)' : 'PHIẾU XUẤT KHO BỐC XẾP CHUYẾN XE (RPT002)'}
          </h1>
          <p className="rpt-doc-subtitle">
            (Dùng cho thủ kho kiểm đếm, lấy hàng từ kệ/lô và bốc xếp lên phương tiện vận chuyển)
          </p>
        </div>

        {/* Meta Info */}
        <div className="rpt-meta-grid">
          {isMultiple ? (
            <>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Danh sách xe:</span>
                <span className="rpt-meta-value font-bold font-mono">
                  {tripList.map((t) => t.tripCode).join(', ')} ({tripList.length} chuyến)
                </span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Tổng số đơn hàng:</span>
                <span className="rpt-meta-value font-bold text-blue-800">{totalOrdersCount} đơn giao</span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Kho xuất hàng:</span>
                <span className="rpt-meta-value">{tripList[0]?.warehouse?.name || 'Kho Tổng NPP'}</span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Phương thức xuất:</span>
                <span className="rpt-meta-value font-bold">Xuất gộp gom hàng nhiều xe</span>
              </div>
            </>
          ) : (
            <>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Mã chuyến xe:</span>
                <span className="rpt-meta-value font-bold font-mono text-blue-800">
                  {tripList[0]?.tripCode || 'N/A'}
                </span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Biển số xe:</span>
                <span className="rpt-meta-value font-bold">{tripList[0]?.licensePlate || 'N/A'}</span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Tài xế / NVGH:</span>
                <span className="rpt-meta-value font-bold">
                  {tripList[0]?.driver?.fullName || 'Chưa phân tài xế'} ({tripList[0]?.driver?.phone || 'N/A'})
                </span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Kho xuất hàng:</span>
                <span className="rpt-meta-value">{tripList[0]?.warehouse?.name || 'Kho Tổng NPP'}</span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Ngày giao dự kiến:</span>
                <span className="rpt-meta-value font-bold">{tripList[0]?.expectedDeliveryDate || 'Hôm nay'}</span>
              </div>
              <div className="rpt-meta-item">
                <span className="rpt-meta-label">Số đơn / Tải trọng:</span>
                <span className="rpt-meta-value">
                  {tripList[0]?.orders?.length || tripList[0]?.ordersCount || 0} đơn ({tripList[0]?.currentWeightKg || 0} / {tripList[0]?.maxWeightKg || 1500} kg)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Table of Goods to Pick & Load */}
        <table className="rpt-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>STT</th>
              <th style={{ width: '13%' }}>Mã SKU</th>
              <th style={{ width: '31%' }}>Tên Sản Phẩm & Quy Cách</th>
              <th style={{ width: '7%' }}>ĐVT</th>
              <th style={{ width: '22%' }}>Số Lô / Hạn Dùng / Vị Trí Kho</th>
              <th style={{ width: '10%' }}>SL Bốc</th>
              <th style={{ width: '12%' }}>Thực Xuất</th>
            </tr>
          </thead>
          <tbody>
            {aggregatedItems.map((item, idx) => (
              <tr key={idx}>
                <td className="text-center font-bold">{idx + 1}</td>
                <td className="font-mono font-bold text-center">{item.sku}</td>
                <td>
                  <div className="font-bold">{item.name}</div>
                  {item.isPromo && <span className="badge-foc">🎁 Hàng tặng khuyến mãi 0đ</span>}
                  {isMultiple && item.tripCodes.size > 0 && (
                    <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '2px' }}>
                      Xe: {Array.from(item.tripCodes).join(', ')}
                    </div>
                  )}
                </td>
                <td className="text-center font-semibold">{item.unit}</td>
                <td style={{ fontSize: '11px', color: '#334155' }}>
                  {item.lotDetails.size > 0 ? (
                    Array.from(item.lotDetails).map((l, i) => (
                      <div key={i}>• {l}</div>
                    ))
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Phân bổ tự động / Lô chuẩn</span>
                  )}
                </td>
                <td className="text-right font-bold text-blue-900" style={{ fontSize: '13px' }}>
                  {formatNumber(item.totalQuantity)}
                </td>
                <td className="text-center" style={{ color: '#94a3b8', fontSize: '11px' }}>
                  [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="rpt-table-total-row">
              <td colSpan={5} className="text-right font-bold">
                TỔNG CỘNG SỐ LƯỢNG HÀNG XUẤT BỐC LÊN XE:
              </td>
              <td className="text-right font-bold text-blue-900" style={{ fontSize: '13.5px' }}>
                {formatNumber(totalPackages)}
              </td>
              <td className="text-center font-bold" style={{ fontSize: '11px' }}>
                Thùng/Kiện
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Chữ ký 3 bên */}
        <div className="rpt-signatures-grid">
          <div>
            <div className="rpt-sign-title">Người Lập Phiếu</div>
            <div className="rpt-sign-hint">(Ký, ghi rõ họ tên)</div>
            <div className="rpt-sign-space" />
            <div className="rpt-sign-name">{currentUserName}</div>
          </div>
          <div>
            <div className="rpt-sign-title">Thủ Kho Xuất Hàng</div>
            <div className="rpt-sign-hint">(Ký xác nhận đã đủ hàng)</div>
            <div className="rpt-sign-space" />
            <div className="rpt-sign-name">................................................</div>
          </div>
          <div>
            <div className="rpt-sign-title">Tài Xế / Người Nhận Hàng</div>
            <div className="rpt-sign-hint">(Ký xác nhận đã bốc lên xe)</div>
            <div className="rpt-sign-space" />
            <div className="rpt-sign-name">
              {tripList.length === 1 && tripList[0]?.driver?.fullName ? tripList[0].driver.fullName : '................................................'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

