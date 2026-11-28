const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const statusLabelMap = {
  DRAFT: 'Bản nháp',
  WAITING_APPROVAL: 'Chờ duyệt cân kho',
  APPROVED: 'Đã phê duyệt',
  COMPLETED: 'Đã hoàn tất cân kho',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã hủy',
};

export const printInventoryCount = (count, itemsData = []) => {
  if (!count) return;

  const printWindow = window.open('', '_blank', 'width=1024,height=768');
  if (!printWindow) {
    alert('Trình duyệt đang chặn cửa sổ bật lên (Pop-up). Vui lòng cho phép pop-up để in phiếu kiểm kê.');
    return;
  }

  const createdDate = count.createdAt
    ? new Date(count.createdAt).toLocaleDateString('vi-VN')
    : new Date().toLocaleDateString('vi-VN');

  const rowsHtml = itemsData
    .map((item, idx) => {
      const sysQty = Number(item.systemQuantity ?? 0);
      const actQty =
        item.actualQuantity !== '' && item.actualQuantity !== null && item.actualQuantity !== undefined
          ? Number(item.actualQuantity)
          : '';
      const variance =
        item.variance !== null && item.variance !== undefined && item.variance !== ''
          ? Number(item.variance)
          : '';
      const varianceDisplay =
        variance === '' ? '' : variance > 0 ? `+${variance}` : `${variance}`;
      const expDate = item.expiryDate
        ? new Date(item.expiryDate).toLocaleDateString('vi-VN')
        : '-';

      return `
        <tr>
          <td class="center">${idx + 1}</td>
          <td>${escapeHtml(item.productSku)}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td class="center">${escapeHtml(item.lotNumber || '-')}</td>
          <td class="center">${escapeHtml(expDate)}</td>
          <td class="center">${escapeHtml(item.unit || 'THÙNG')}</td>
          <td class="right">${sysQty}</td>
          <td class="right">${actQty}</td>
          <td class="right">${varianceDisplay}</td>
          <td>${escapeHtml(item.reason || '')}</td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Phiếu Kiểm Kê - ${escapeHtml(count.countCode)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0b3d70;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 18px;
      color: #0b3d70;
      text-transform: uppercase;
    }
    .header-sub { font-size: 12px; color: #4b5563; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 16px;
      margin-bottom: 16px;
      background: #f8fafc;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .meta-item strong { color: #334155; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: middle;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: center;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .notes-box {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      min-height: 44px;
      margin-bottom: 24px;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      text-align: center;
      margin-top: 24px;
    }
    .sig-title { font-weight: 700; margin-bottom: 56px; }
    .sig-note { font-style: italic; color: #6b7280; font-size: 11px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Biên Bản Kiểm Kê Kho Hàng</h1>
      <div class="header-sub">Hệ thống Quản lý Phân phối DMS-NPP TradeLedger</div>
    </div>
    <div style="text-align:right">
      <div><strong>Mã phiếu:</strong> ${escapeHtml(count.countCode)}</div>
      <div><strong>Ngày lập:</strong> ${escapeHtml(createdDate)}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>Kho kiểm kê:</strong> ${escapeHtml(count.warehouse?.name || '')} (${escapeHtml(count.warehouse?.code || '')})</div>
    <div class="meta-item"><strong>Hình thức:</strong> ${count.countType === 'MONTHLY' ? 'Định kỳ tháng' : 'Đột xuất theo SKU'}</div>
    <div class="meta-item"><strong>Trạng thái:</strong> ${escapeHtml(statusLabelMap[count.status] || count.status)}</div>
    <div class="meta-item"><strong>Người lập phiếu:</strong> ${escapeHtml(count.createdBy?.fullName || 'Quản trị viên')}</div>
    <div class="meta-item"><strong>Tổng số lô/SKU:</strong> ${itemsData.length}</div>
    <div class="meta-item"><strong>Ngày in:</strong> ${escapeHtml(new Date().toLocaleString('vi-VN'))}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px">STT</th>
        <th style="width:95px">Mã SKU</th>
        <th>Tên sản phẩm</th>
        <th style="width:90px">Số lô</th>
        <th style="width:85px">Hạn SD</th>
        <th style="width:65px">ĐVT</th>
        <th style="width:80px">Tồn HT</th>
        <th style="width:80px">Thực tế</th>
        <th style="width:80px">Chênh lệch</th>
        <th>Lý do giải trình</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="10" class="center">Không có dữ liệu mặt hàng</td></tr>'}
    </tbody>
  </table>

  <div class="notes-box">
    <strong>Ghi chú:</strong> ${escapeHtml(count.notes || 'Không có')}
  </div>

  <div class="signatures">
    <div>
      <div class="sig-title">Thủ kho thực hiện</div>
      <div class="sig-note">(Ký và ghi rõ họ tên)</div>
    </div>
    <div>
      <div class="sig-title">Kế toán kho</div>
      <div class="sig-note">(Ký và ghi rõ họ tên)</div>
    </div>
    <div>
      <div class="sig-title">Quản lý phê duyệt</div>
      <div class="sig-note">(Ký và ghi rõ họ tên)</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 200);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

