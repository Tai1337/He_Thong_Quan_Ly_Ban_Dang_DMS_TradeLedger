import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  ArrowLeft, 
  Save, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Clock, 
  Calendar, 
  Warehouse as WarehouseIcon, 
  User, 
  AlertCircle,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Printer,
  Upload,
  Trash2,
  X,
  FileUp,
  FileText,
  Search
} from 'lucide-react';
import { 
  getInventoryCountById, 
  updateInventoryCountItems, 
  submitInventoryCount, 
  approveInventoryCount, 
  rejectInventoryCount, 
  cancelInventoryCount,
  exportInventoryCountExcel 
} from '../../../services/api';
import './InventoryCountDetail.css';

const PRESET_REASONS = [
  'Hư hỏng / Bể vỡ trong kho',
  'Hàng hết hạn sử dụng bị tiêu hủy',
  'Sai lệch số lượng khi nhập hàng PO',
  'Giao nhầm số lô cho đại lý',
  'Đại lý trả hàng chưa cập nhật chứng từ',
  'Thất thoát / Hao hụt bảo quản',
  'Khác',
];

const statusBadgeConfig = {
  DRAFT: { label: 'Bản nháp', color: '#64748b', bg: '#f1f5f9' },
  WAITING_APPROVAL: { label: 'Chờ duyệt cân kho', color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'Đã phê duyệt', color: '#0284c7', bg: '#e0f2fe' },
  COMPLETED: { label: 'Đã cân kho thành công', color: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'Bị từ chối duyệt', color: '#dc2626', bg: '#fee2e2' },
  CANCELLED: { label: 'Đã hủy', color: '#94a3b8', bg: '#f8fafc' },
};

/**
 * Hàm parse số an toàn tuyệt đối tránh NaN từ Prisma Decimal object hoặc chuỗi
 */
const parseQty = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') return val.toNumber();
    if (val.d && Array.isArray(val.d)) {
      if (typeof val.toString === 'function') {
        const n = parseFloat(val.toString());
        if (!isNaN(n)) return n;
      }
      const digits = val.d.join('');
      const exp = val.e !== undefined ? val.e : (digits.length - 1);
      const num = parseFloat(digits) * Math.pow(10, exp - digits.length + 1) * (val.s || 1);
      return isNaN(num) ? 0 : num;
    }
  }
  return 0;
};

const InventoryCountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterVarianceOnly, setFilterVarianceOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dữ liệu nhập trên bảng (map theo lotId/itemId)
  const [itemsData, setItemsData] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');

  // Modal Upload lý do chênh lệch
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Lấy chi tiết phiếu kiểm kê
  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getInventoryCountById(id, 1);
      setCount(data);
      setGeneralNotes(data.notes || '');

      // Khởi tạo state chỉnh sửa và parse số an toàn
      const formattedItems = (data.items || []).map((item) => {
        const sysQty = parseQty(item.systemQuantity);
        const hasActual = item.actualQuantity !== null && item.actualQuantity !== undefined && item.actualQuantity !== '';
        const actQty = hasActual ? parseQty(item.actualQuantity) : '';
        const variance = hasActual ? actQty - sysQty : (item.variance !== null && item.variance !== undefined ? parseQty(item.variance) : null);

        return {
          id: item.id,
          lotId: item.lotId,
          productSku: item.stockLot?.product?.sku || '',
          productName: item.stockLot?.product?.name || '',
          unit: item.stockLot?.product?.unit || 'THÙNG',
          lotNumber: item.stockLot?.lotNumber || '',
          expiryDate: item.stockLot?.expiryDate,
          systemQuantity: sysQty,
          actualQuantity: actQty,
          variance: variance,
          reason: item.reason || '',
        };
      });

      setItemsData(formattedItems);
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết phiếu kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // Xử lý thay đổi số lượng thực tế đếm được
  const handleActualQtyChange = (lotId, val) => {
    setItemsData((prev) =>
      prev.map((item) => {
        if (item.lotId === lotId) {
          const numVal = val === '' ? '' : parseFloat(val);
          const sys = parseQty(item.systemQuantity);
          const variance = numVal !== '' && !isNaN(numVal) ? numVal - sys : null;
          return {
            ...item,
            actualQuantity: val === '' || isNaN(numVal) ? '' : numVal,
            variance: variance,
          };
        }
        return item;
      })
    );
  };

  // Tự động điền khớp tồn hệ thống cho các dòng chưa đếm
  const handleAutoFillMatch = () => {
    if (!window.confirm('Tự động điền số lượng thực tế bằng số tồn hệ thống cho tất cả các dòng chưa nhập?')) return;
    setItemsData((prev) =>
      prev.map((item) => {
        if (item.actualQuantity === '' || item.actualQuantity === null) {
          return {
            ...item,
            actualQuantity: item.systemQuantity,
            variance: 0,
          };
        }
        return item;
      })
    );
  };

  // Xử lý thay đổi lý do chênh lệch cho từng dòng
  const handleReasonChange = (lotId, reasonText) => {
    setItemsData((prev) =>
      prev.map((item) => (item.lotId === lotId ? { ...item, reason: reasonText } : item))
    );
  };

  // Áp dụng lý do hàng loạt cho tất cả các dòng chênh lệch trong modal
  const handleApplyBulkReason = () => {
    if (!bulkReason) {
      alert('Vui lòng chọn hoặc nhập lý do cần áp dụng');
      return;
    }
    setItemsData((prev) =>
      prev.map((item) => {
        if (item.variance !== null && item.variance !== 0) {
          return { ...item, reason: bulkReason };
        }
        return item;
      })
    );
    alert(`Đã áp dụng lý do cho tất cả các dòng chênh lệch!`);
    setShowUploadModal(false);
  };

  // Đọc file CSV / text mô phỏng khi người dùng upload file lý do
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n');
        let matched = 0;
        setItemsData((prev) => {
          const updated = [...prev];
          lines.forEach((line) => {
            const parts = line.split(',');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              const reason = parts.slice(1).join(',').trim();
              const target = updated.find(
                (item) => item.productSku === key || item.lotNumber === key
              );
              if (target && target.variance !== 0) {
                target.reason = reason;
                matched++;
              }
            }
          });
          return updated;
        });
        alert(`Đã nạp file thành công! Cập nhật lý do cho ${matched} dòng chênh lệch.`);
        setShowUploadModal(false);
      } catch (err) {
        alert('Không thể đọc file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Lưu tạm kết quả kiểm đếm
  const handleSave = async (showNotification = true) => {
    setSaving(true);
    try {
      const payload = {
        notes: generalNotes,
        items: itemsData.map((item) => ({
          id: item.id,
          lotId: item.lotId,
          actualQuantity: item.actualQuantity !== '' && item.actualQuantity !== null ? Number(item.actualQuantity) : null,
          reason: item.reason || null,
        })),
      };
      await updateInventoryCountItems(id, payload, 1);
      if (showNotification) alert('Đã lưu kết quả kiểm kê thành công!');
      fetchDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu kết quả kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  // Gửi duyệt phiếu (Submit)
  const handleSubmitApproval = async () => {
    // Kiểm tra đã nhập hết SL chưa
    const uncounted = itemsData.filter((i) => i.actualQuantity === '' || i.actualQuantity === null).length;
    if (uncounted > 0) {
      alert(`Còn ${uncounted} mặt hàng chưa được nhập số lượng thực tế. Vui lòng kiểm đếm xong trước khi gửi duyệt.`);
      return;
    }

    // Kiểm tra xem các dòng bị lệch đã có lý do chưa
    const varianceItemsWithoutReason = itemsData.filter(
      (item) => item.variance !== null && item.variance !== 0 && (!item.reason || item.reason.trim() === '')
    );

    if (varianceItemsWithoutReason.length > 0) {
      alert(`Còn ${varianceItemsWithoutReason.length} mặt hàng có chênh lệch nhưng chưa có lý do giải trình. Vui lòng nhập lý do giải trình trước khi gửi duyệt.`);
      return;
    }

    if (!window.confirm('Xác nhận gửi phiếu kiểm kê này lên Quản lý duyệt cân kho? Sau khi gửi sẽ không thể sửa số lượng.')) return;

    setSaving(true);
    try {
      const payload = {
        notes: generalNotes,
        items: itemsData.map((item) => ({
          id: item.id,
          lotId: item.lotId,
          actualQuantity: item.actualQuantity !== '' && item.actualQuantity !== null ? Number(item.actualQuantity) : null,
          reason: item.reason || null,
        })),
      };
      await updateInventoryCountItems(id, payload, 1);
      await submitInventoryCount(id, 1);
      alert('Đã gửi duyệt phiếu kiểm kê thành công!');
      fetchDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi gửi duyệt phiếu kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  // Phê duyệt & Cân kho (Approve)
  const handleApprove = async () => {
    if (!window.confirm('Xác nhận PHÊ DUYỆT & CÂN KHO? Hệ thống sẽ tự động cập nhật số dư tồn kho về số thực tế và ghi nhận giao dịch kho đối ứng.')) return;

    setSaving(true);
    try {
      const res = await approveInventoryCount(id, { userId: 1 }, 1);
      alert(`Phê duyệt & Cân kho thành công! Đã sinh chứng từ điều chỉnh tồn kho ${res.adjustmentCode || ''}`);
      fetchDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi phê duyệt phiếu kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  // Từ chối duyệt (Reject)
  const handleRejectSubmit = async () => {
    if (!rejectReason) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    setSaving(true);
    try {
      await rejectInventoryCount(id, rejectReason, 1);
      setShowRejectModal(false);
      alert('Đã từ chối duyệt phiếu kiểm kê');
      fetchDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi từ chối');
    } finally {
      setSaving(false);
    }
  };

  // Hủy phiếu
  const handleCancel = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn HỦY phiếu kiểm kê này không? Hành động này không thể hoàn tác.')) return;
    setSaving(true);
    try {
      await cancelInventoryCount(id, 1);
      alert('Đã hủy phiếu kiểm kê');
      fetchDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi hủy phiếu');
    } finally {
      setSaving(false);
    }
  };

  // Thống kê nhanh
  const totalItems = itemsData.length;
  const countedItems = itemsData.filter((i) => i.actualQuantity !== '' && i.actualQuantity !== null).length;
  const matchedItems = itemsData.filter((i) => i.variance === 0).length;
  const surplusItems = itemsData.filter((i) => i.variance !== null && i.variance > 0);
  const deficitItems = itemsData.filter((i) => i.variance !== null && i.variance < 0);
  const varianceItems = itemsData.filter((i) => i.variance !== null && i.variance !== 0);

  const isDraft = count?.status === 'DRAFT';
  const isWaitingApproval = count?.status === 'WAITING_APPROVAL';
  const isCompleted = count?.status === 'COMPLETED';
  const isReadOnly = !isDraft;

  // Lọc hiển thị
  const filteredList = itemsData.filter((item) => {
    if (filterVarianceOnly && (item.variance === 0 || item.variance === null)) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchSku = item.productSku.toLowerCase().includes(q);
      const matchName = item.productName.toLowerCase().includes(q);
      const matchLot = item.lotNumber.toLowerCase().includes(q);
      return matchSku || matchName || matchLot;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="count-detail-loading">
        <div className="spinner"></div>
        <p>Đang tải chi tiết phiếu kiểm kê...</p>
      </div>
    );
  }

  if (error || !count) {
    return (
      <div className="count-detail-error">
        <AlertCircle size={36} color="#dc2626" />
        <p>{error || 'Không tìm thấy phiếu kiểm kê'}</p>
        <button onClick={() => navigate('/inventory/counts')} className="btn-back">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
      </div>
    );
  }

  const statusCfg = statusBadgeConfig[count.status] || statusBadgeConfig.DRAFT;

  return (
    <div className="count-detail-container">
      {/* 1. TOP BAR NAVIGATION & DOCUMENT ACTIONS */}
      <div className="detail-top-nav">
        <button className="btn-back-nav" onClick={() => navigate('/inventory/counts')}>
          <ArrowLeft size={18} />
          <span>Danh sách kiểm kê</span>
        </button>

        {/* CỤM NÚT TRÊN ĐẦU TRANG */}
        <div className="top-nav-actions">
          {isDraft && (
            <>
              {/* Nút Lưu số liệu */}
              <button 
                className="btn-action-save"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Save size={16} />
                <span>Lưu số liệu</span>
              </button>

              {/* Nút Gửi duyệt */}
              <button 
                className="btn-action-submit"
                onClick={handleSubmitApproval}
                disabled={saving}
              >
                <Send size={16} />
                <span>Gửi duyệt</span>
              </button>

              {/* Nút Hủy phiếu */}
              <button 
                className="btn-action-cancel-top"
                onClick={handleCancel}
                disabled={saving}
                title="Hủy bỏ phiếu kiểm kê này"
              >
                <Trash2 size={16} />
                <span>Hủy phiếu</span>
              </button>
            </>
          )}

          {isCompleted && (
            <button 
              className="btn-action-excel"
              onClick={() => exportInventoryCountExcel(count.id, 1)}
            >
              <FileSpreadsheet size={16} />
              <span>Xuất Biên Bản Excel</span>
            </button>
          )}

          <button className="btn-action-print" onClick={() => window.print()}>
            <Printer size={16} />
            <span>In Phiếu</span>
          </button>
        </div>
      </div>

      {/* 2. SHEET HEADER INFORMATION & STATS SUMMARY */}
      <div className="count-header-card">
        <div className="card-top-row">
          <div className="doc-code-block">
            <span className="doc-prefix">Phiếu kiểm kê:</span>
            <h1 className="doc-code">{count.countCode}</h1>
            <span 
              className="doc-status-badge"
              style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
            >
              {statusCfg.label}
            </span>
          </div>

          <div className="header-stats-strip">
            <div className="stat-box">
              <span className="stat-title">Tổng SKU</span>
              <strong className="stat-num">{totalItems}</strong>
            </div>
            <div className="stat-box blue">
              <span className="stat-title">Đã kiểm đếm</span>
              <strong className="stat-num">{countedItems} / {totalItems}</strong>
            </div>
            <div className="stat-box green">
              <span className="stat-title">Khớp tồn</span>
              <strong className="stat-num">{matchedItems}</strong>
            </div>
            <div className="stat-box red">
              <span className="stat-title">Chênh lệch</span>
              <strong className="stat-num">{varianceItems.length}</strong>
            </div>
          </div>
        </div>

        <div className="card-bottom-row">
          <div className="meta-badge-group">
            <div className="meta-pill">
              <WarehouseIcon size={15} color="#0b3d70" />
              <span>Kho: <strong>{count.warehouse?.name} ({count.warehouse?.code})</strong></span>
            </div>
            <div className="meta-pill">
              <Clock size={15} color="#0b3d70" />
              <span>Hình thức: <strong>{count.countType === 'MONTHLY' ? 'Định kỳ tháng' : 'Đột xuất theo SKU'}</strong></span>
            </div>
            <div className="meta-pill">
              <Calendar size={15} color="#0b3d70" />
              <span>Ngày tạo: <strong>{new Date(count.createdAt).toLocaleDateString('vi-VN')}</strong></span>
            </div>
            <div className="meta-pill">
              <User size={15} color="#0b3d70" />
              <span>Người lập: <strong>{count.createdBy?.fullName || 'Thủ kho'}</strong></span>
            </div>
          </div>

          {count.notes && (
            <div className="doc-notes-banner">
              <strong>Ghi chú:</strong> {count.notes}
            </div>
          )}
        </div>
      </div>

      {/* APPROVAL BAR CHO QUẢN LÝ (KHI WAITING_APPROVAL) */}
      {isWaitingApproval && (
        <div className="approval-action-bar">
          <div className="approval-info">
            <Clock size={24} color="#d97706" />
            <div>
              <strong>Phiếu kiểm kê đang chờ phê duyệt & cân kho tự động</strong>
              <p>Quản lý kiểm tra kết quả đối soát và các lý do giải trình chênh lệch trước khi bấm phê duyệt.</p>
            </div>
          </div>

          <div className="approval-buttons">
            <button 
              className="btn-action-reject"
              onClick={() => setShowRejectModal(true)}
              disabled={saving}
            >
              <XCircle size={16} />
              <span>Từ chối duyệt</span>
            </button>

            <button 
              className="btn-action-approve"
              onClick={handleApprove}
              disabled={saving}
            >
              <CheckCircle2 size={16} />
              <span>{saving ? 'Đang cân kho...' : 'Phê Duyệt & Cân Kho Tự Động'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN TABLE & LIST OF ITEMS */}
      <div className="step-content-card">
        {/* TOOLBAR VỚI NÚT UPLOAD LÝ DO CHÊNH LỆCH VÀ ĐIỀN KHỚP TỒN TỰ ĐỘNG */}
        <div className="content-toolbar">
          <div className="toolbar-left">
            <div className="search-in-table">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text" 
                placeholder="Tìm mã SKU, tên SP, số lô..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="section-hint">Hiển thị {filteredList.length} / {totalItems} lô hàng</span>
          </div>

          <div className="toolbar-right">
            {isDraft && (
              <>
                {/* Nút Điền khớp tồn tự động */}
                <button 
                  className="btn-secondary"
                  onClick={handleAutoFillMatch}
                  title="Điền nhanh tồn hệ thống cho các mặt hàng chưa kiểm"
                >
                  <Sparkles size={15} />
                  <span>Điền khớp tồn tự động</span>
                </button>

                {/* Nút Upload lý do chênh lệch đưa xuống toolbar bảng bên cạnh Chỉ xem dòng chênh lệch */}
                <button 
                  className="btn-action-upload"
                  onClick={() => setShowUploadModal(true)}
                  title="Upload file giải trình hoặc áp dụng lý do chênh lệch hàng loạt"
                >
                  <Upload size={15} />
                  <span>Upload lý do chênh lệch</span>
                  {varianceItems.length > 0 && (
                    <span className="action-pill-count">{varianceItems.length}</span>
                  )}
                </button>
              </>
            )}

            <button 
              className={`btn-filter-pill ${filterVarianceOnly ? 'active' : ''}`}
              onClick={() => setFilterVarianceOnly(!filterVarianceOnly)}
            >
              <span>Chỉ xem dòng chênh lệch ({varianceItems.length})</span>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="inventory-detail-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>STT</th>
                <th>Mã SKU</th>
                <th>Tên sản phẩm</th>
                <th>ĐVT</th>
                <th>Số Lô</th>
                <th>Hạn sử dụng</th>
                <th style={{ textAlign: 'right' }}>Tồn hệ thống</th>
                <th style={{ textAlign: 'center', width: '150px' }}>
                  Thực tế đếm <span className="req">*</span>
                </th>
                <th style={{ textAlign: 'right', width: '130px' }}>Chênh lệch</th>
                <th style={{ width: '28%' }}>Lý do giải trình chênh lệch</th>
                <th style={{ width: '50px', textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '30px' }}>
                    Không có mặt hàng nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const varVal = item.variance;
                  const isUncounted = item.actualQuantity === '' || item.actualQuantity === null;
                  const hasVariance = varVal !== null && varVal !== 0;

                  let rowClass = '';
                  if (!isUncounted) {
                    if (varVal > 0) rowClass = 'row-surplus';
                    else if (varVal < 0) rowClass = 'row-deficit';
                    else rowClass = 'row-match';
                  }

                  return (
                    <tr key={item.lotId} className={rowClass}>
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                      <td><span className="sku-tag">{item.productSku}</span></td>
                      <td><span className="product-title">{item.productName}</span></td>
                      <td>{item.unit}</td>
                      <td><span className="lot-tag">{item.lotNumber}</span></td>
                      <td>
                        {item.expiryDate ? (
                          <span className="expiry-tag">
                            {new Date(item.expiryDate).toLocaleDateString('vi-VN')}
                          </span>
                        ) : '---'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: '#334155' }}>
                        {item.systemQuantity}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isReadOnly ? (
                          <span className="readonly-qty">{item.actualQuantity !== '' ? item.actualQuantity : '---'}</span>
                        ) : (
                          <input 
                            type="number"
                            min="0"
                            step="any"
                            className="input-actual-qty"
                            placeholder="Nhập SL..."
                            value={item.actualQuantity}
                            onChange={(e) => handleActualQtyChange(item.lotId, e.target.value)}
                          />
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isUncounted ? (
                          <span className="var-badge pending">Chưa đếm</span>
                        ) : varVal > 0 ? (
                          <span className="var-badge surplus">+{varVal} (Thừa)</span>
                        ) : varVal < 0 ? (
                          <span className="var-badge deficit">{varVal} (Thiếu)</span>
                        ) : (
                          <span className="var-badge match">0 (Khớp)</span>
                        )}
                      </td>
                      <td>
                        {isReadOnly ? (
                          <span className="readonly-reason">{item.reason || (hasVariance ? 'Chưa có lý do' : 'Khớp')}</span>
                        ) : hasVariance ? (
                          <div className="table-reason-cell">
                            <input 
                              type="text"
                              className="input-reason-inline"
                              placeholder="Nhập lý do chênh lệch..."
                              value={item.reason}
                              onChange={(e) => handleReasonChange(item.lotId, e.target.value)}
                            />
                            {/* Preset gợi ý nhanh */}
                            <select 
                              className="select-preset-inline"
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleReasonChange(item.lotId, e.target.value);
                              }}
                            >
                              <option value="">Chọn lý do mẫu...</option>
                              {PRESET_REASONS.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="no-variance-text">Khớp số liệu</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isUncounted ? (
                          <span className="status-dot grey" title="Chưa nhập thực tế" />
                        ) : hasVariance ? (
                          <span className="status-dot red" title="Có chênh lệch cần giải trình" />
                        ) : (
                          <span className="status-dot green" title="Khớp số liệu" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ghi chú chung ở chân bảng */}
        <div className="general-notes-box">
          <label><strong>Ghi chú / Đề xuất xử lý của đợt kiểm kê:</strong></label>
          {isReadOnly ? (
            <p className="readonly-notes">{generalNotes || 'Không có ghi chú'}</p>
          ) : (
            <textarea 
              rows={2}
              placeholder="Nhập ghi chú hoặc kiến nghị xử lý chênh lệch..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* 4. MODAL: UPLOAD / GIẢI TRÌNH LÝ DO CHÊNH LỆCH */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="upload-reason-modal">
            <div className="modal-header">
              <div className="modal-title-box">
                <Upload size={22} color="#0b3d70" />
                <h3>Upload / Cập Nhật Lý Do Chênh Lệch</h3>
              </div>
              <button 
                className="btn-close-modal"
                onClick={() => setShowUploadModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-intro-banner">
                <AlertTriangle size={18} color="#d97706" />
                <span>
                  Hiện có <strong>{varianceItems.length} mặt hàng</strong> bị chênh lệch số lượng. Bạn có thể upload file hoặc áp dụng lý do nhanh bên dưới.
                </span>
              </div>

              {/* Lựa chọn 1: Upload File */}
              <div className="upload-box-section">
                <label className="section-label">
                  <FileUp size={16} /> <strong>Cách 1: Upload file lý do giải trình (.csv / .xlsx)</strong>
                </label>
                <p className="section-subtext">
                  File chứa cột mã SKU hoặc Số Lô và cột Lý do chênh lệch
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".csv,.txt,.xlsx,.xls" 
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button 
                  type="button" 
                  className="btn-select-file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>{uploadFileName || 'Chọn file từ máy tính để tải lên'}</span>
                </button>
              </div>

              <div className="modal-divider"><span>HOẶC</span></div>

              {/* Lựa chọn 2: Áp dụng lý do mẫu hàng loạt */}
              <div className="bulk-reason-section">
                <label className="section-label">
                  <Sparkles size={16} /> <strong>Cách 2: Áp dụng nhanh lý do cho tất cả {varianceItems.length} mặt hàng lệch</strong>
                </label>

                <div className="preset-chips-modal">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`chip ${bulkReason === preset ? 'active' : ''}`}
                      onClick={() => setBulkReason(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input 
                  type="text"
                  className="input-bulk-reason"
                  placeholder="Hoặc tự gõ lý do áp dụng chung cho các dòng lệch..."
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                />

                <button 
                  type="button" 
                  className="btn-apply-bulk"
                  onClick={handleApplyBulkReason}
                  disabled={!bulkReason}
                >
                  Áp dụng lý do này cho tất cả {varianceItems.length} dòng lệch
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancel"
                onClick={() => setShowUploadModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. REJECT MODAL */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="reject-modal-card">
            <h3>Từ Chối Duyệt Phiếu Kiểm Kê</h3>
            <p>Vui lòng nhập lý do từ chối để thủ kho kiểm tra và đếm lại:</p>
            <textarea 
              rows={4}
              placeholder="Nhập lý do từ chối (ví dụ: Số lượng lệch quá lớn, kiểm đếm lại lô hàng X)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>Đóng</button>
              <button className="btn-confirm-reject" onClick={handleRejectSubmit}>Xác Nhận Từ Chối</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCountDetail;
