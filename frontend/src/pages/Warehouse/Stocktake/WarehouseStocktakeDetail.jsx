import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  getInventoryCountById,
  updateInventoryCountItems,
  submitInventoryCount,
  exportInventoryCountExcel,
} from '../../../services/api';
import { useNotification } from '../../../components/Common/NotificationProvider';
import { printInventoryCount } from '../../../utils/printInventoryCount';
import './WarehouseStocktakeDetail.css';

const PRESET_REASONS = [
  'Hư hỏng / Bể vỡ trong kho',
  'Hàng hết hạn sử dụng bị tiêu hủy',
  'Sai lệch số lượng khi nhập hàng PO',
  'Giao nhầm số lô cho đại lý',
  'Thất thoát / Hao hụt bảo quản',
  'Khác',
];

const STATUS_BADGE = {
  DRAFT: { label: 'Chờ kiểm đếm', className: 'badge-draft' },
  REJECTED: { label: 'Bị từ chối — Cần kiểm tra lại', className: 'badge-rejected' },
  WAITING_APPROVAL: { label: 'Đã gửi — Chờ Admin phê duyệt', className: 'badge-waiting' },
  COMPLETED: { label: 'Đã hoàn tất cân kho', className: 'badge-completed' },
  APPROVED: { label: 'Đã phê duyệt', className: 'badge-completed' },
  CANCELLED: { label: 'Đã hủy', className: 'badge-cancelled' },
};

const parseQty = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

const extractLatestRejectReason = (notes) => {
  if (!notes) return '';
  const matches = [...notes.matchAll(/\[Lý do:\s*([^\]]+)\]/g)];
  if (matches.length > 0) {
    return matches[matches.length - 1][1].trim();
  }
  return notes;
};

const WarehouseStocktakeDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, confirm } = useNotification();

  const distributorId = user?.distributorId || 1;

  const [count, setCount] = useState(null);
  const [itemsData, setItemsData] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVarianceOnly, setFilterVarianceOnly] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getInventoryCountById(id, distributorId);
      setCount(data);
      setGeneralNotes(data.notes || '');

      const formatted = (data.items || []).map((item) => {
        const sysQty = parseQty(item.systemQuantity);
        const hasActual =
          item.actualQuantity !== null &&
          item.actualQuantity !== undefined &&
          item.actualQuantity !== '';
        const actQty = hasActual ? parseQty(item.actualQuantity) : '';
        const variance = hasActual ? actQty - sysQty : null;

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
          variance,
          reason: item.reason || '',
        };
      });

      setItemsData(formatted);
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết phiếu kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const canEdit = count?.status === 'DRAFT' || count?.status === 'REJECTED';

  const handleActualQtyChange = (lotId, rawVal) => {
    if (!canEdit) return;
    setItemsData((prev) =>
      prev.map((item) => {
        if (item.lotId !== lotId) return item;
        if (rawVal === '') {
          return { ...item, actualQuantity: '', variance: null };
        }
        const parsed = parseFloat(rawVal);
        if (isNaN(parsed) || parsed < 0) return item;
        const sys = parseQty(item.systemQuantity);
        return {
          ...item,
          actualQuantity: parsed,
          variance: parsed - sys,
        };
      }),
    );
  };

  const handleReasonChange = (lotId, reason) => {
    if (!canEdit) return;
    setItemsData((prev) =>
      prev.map((item) => (item.lotId === lotId ? { ...item, reason } : item)),
    );
  };

  const handleAutoFillMatch = async () => {
    if (!canEdit) return;
    const ok = await confirm({
      title: 'Điền khớp tồn hệ thống',
      message:
        'Tự động điền số lượng thực tế bằng tồn hệ thống cho các dòng chưa nhập?',
      confirmText: 'Điền tự động',
    });
    if (!ok) return;
    setItemsData((prev) =>
      prev.map((item) =>
        item.actualQuantity === '' || item.actualQuantity === null
          ? { ...item, actualQuantity: item.systemQuantity, variance: 0 }
          : item,
      ),
    );
  };

  const buildPayload = () => ({
    notes: generalNotes,
    items: itemsData.map((item) => ({
      id: item.id,
      lotId: item.lotId,
      actualQuantity:
        item.actualQuantity !== '' && item.actualQuantity !== null
          ? Number(item.actualQuantity)
          : null,
      reason: item.reason || null,
    })),
  });

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await updateInventoryCountItems(id, buildPayload(), distributorId);
      notify.success('Đã lưu nháp số liệu kiểm kê.');
      fetchDetail();
    } catch (err) {
      notify.error(err.message || 'Lỗi khi lưu số liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!canEdit) return;

    const uncounted = itemsData.filter(
      (i) => i.actualQuantity === '' || i.actualQuantity === null,
    );
    if (uncounted.length > 0) {
      notify.error(
        `Còn ${uncounted.length} dòng chưa nhập số lượng thực tế. Vui lòng nhập đầy đủ trước khi gửi.`,
      );
      return;
    }

    const missingReason = itemsData.filter(
      (i) =>
        i.variance !== null &&
        i.variance !== 0 &&
        (!i.reason || i.reason.trim() === ''),
    );
    if (missingReason.length > 0) {
      notify.error(
        `Có ${missingReason.length} dòng chênh lệch chưa có lý do giải trình. Bắt buộc nhập lý do khi có chênh lệch.`,
      );
      return;
    }

    const ok = await confirm({
      title: 'Gửi kết quả kiểm kê cho Admin',
      message:
        'Sau khi gửi, phiếu sẽ chuyển sang trạng thái Chờ duyệt và khóa chỉnh sửa cho đến khi Admin phản hồi. Tiếp tục?',
      confirmText: 'Gửi kết quả',
    });
    if (!ok) return;

    setSaving(true);
    try {
      await updateInventoryCountItems(id, buildPayload(), distributorId);
      await submitInventoryCount(id, distributorId);
      notify.success('Đã gửi kết quả kiểm kê cho Admin phê duyệt!');
      fetchDetail();
    } catch (err) {
      notify.error(err.message || 'Không thể gửi kết quả kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = itemsData.filter((item) => {
    if (filterVarianceOnly && (item.variance === 0 || item.variance === null)) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.productSku.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.lotNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="wh-detail-loading">Đang tải chi tiết phiếu kiểm kê...</div>;
  }

  if (error || !count) {
    return (
      <div className="wh-detail-error">
        <p>{error || 'Không tìm thấy phiếu kiểm kê'}</p>
        <button onClick={() => navigate('/warehouse/stocktake')}>Quay lại</button>
      </div>
    );
  }

  const badge = STATUS_BADGE[count.status] || STATUS_BADGE.DRAFT;
  const rejectReasonText =
    count.status === 'REJECTED' ? extractLatestRejectReason(count.notes) : '';
  const totalCounted = itemsData.filter(
    (i) => i.actualQuantity !== '' && i.actualQuantity !== null,
  ).length;
  const totalVariance = itemsData.filter(
    (i) => i.variance !== null && i.variance !== 0,
  ).length;

  return (
    <div className="wh-stocktake-detail">
      <div className="wh-detail-topbar">
        <button
          type="button"
          className="wh-btn-back"
          onClick={() => navigate('/warehouse/stocktake')}
        >
          <ArrowLeft size={16} />
          <span>Danh sách kiểm kê</span>
        </button>

        <div className="wh-detail-actions">
          {canEdit && (
            <>
              <button
                type="button"
                className="wh-btn-save"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} />
                <span>Lưu tạm</span>
              </button>
              <button
                type="button"
                className="wh-btn-submit"
                onClick={handleSubmit}
                disabled={saving}
              >
                <Send size={16} />
                <span>{count.status === 'REJECTED' ? 'Gửi lại kết quả' : 'Gửi kết quả cho Admin'}</span>
              </button>
            </>
          )}

          {count.status === 'COMPLETED' && (
            <button
              type="button"
              className="wh-btn-excel"
              onClick={() => exportInventoryCountExcel(count.id, distributorId)}
            >
              <FileSpreadsheet size={16} />
              <span>Xuất Excel</span>
            </button>
          )}

          <button
            type="button"
            className="wh-btn-print"
            onClick={() => printInventoryCount(count, itemsData)}
          >
            <Printer size={16} />
            <span>In Phiếu</span>
          </button>
        </div>
      </div>

      {count.status === 'REJECTED' && (
        <div className="wh-reject-alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Phiếu kiểm kê đã bị Admin từ chối!</strong>
            <p>
              Lý do từ chối: <strong>{rejectReasonText || 'Vui lòng kiểm tra lại số liệu.'}</strong>
            </p>
          </div>
        </div>
      )}

      {count.status === 'WAITING_APPROVAL' && (
        <div className="wh-waiting-alert">
          <Clock size={18} />
          <span>
            Phiếu đang chờ Admin phê duyệt. Số liệu đã được khóa chỉnh sửa.
          </span>
        </div>
      )}

      {count.status === 'COMPLETED' && (
        <div className="wh-completed-alert">
          <CheckCircle2 size={18} />
          <span>Phiếu đã được Admin duyệt và cập nhật cân kho hoàn tất.</span>
        </div>
      )}

      <div className="wh-meta-card">
        <div className="wh-meta-title">
          <h2>{count.countCode}</h2>
          <span className={`wh-status-badge ${badge.className}`}>{badge.label}</span>
        </div>
        <div className="wh-meta-grid">
          <div>
            <span>Kho kiểm kê:</span>{' '}
            <strong>{count.warehouse?.name || 'Kho chính'}</strong>
          </div>
          <div>
            <span>Hình thức:</span>{' '}
            <strong>{count.countType === 'MONTHLY' ? 'Định kỳ tháng' : 'Đột xuất theo SKU'}</strong>
          </div>
          <div>
            <span>Ngày tạo:</span>{' '}
            <strong>{new Date(count.createdAt).toLocaleString('vi-VN')}</strong>
          </div>
          <div>
            <span>Tiến độ:</span>{' '}
            <strong>
              {totalCounted}/{itemsData.length} dòng ({totalVariance} dòng lệch)
            </strong>
          </div>
        </div>
      </div>

      <div className="wh-items-card">
        <div className="wh-items-toolbar">
          <div className="wh-search-inline">
            <Search size={15} />
            <input
              type="text"
              placeholder="Tìm SKU, tên sản phẩm, số lô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="wh-toolbar-right">
            <label className="wh-checkbox">
              <input
                type="checkbox"
                checked={filterVarianceOnly}
                onChange={(e) => setFilterVarianceOnly(e.target.checked)}
              />
              <span>Chỉ hiện dòng có chênh lệch</span>
            </label>

            {canEdit && (
              <button
                type="button"
                className="wh-btn-autofill"
                onClick={handleAutoFillMatch}
              >
                <Sparkles size={14} />
                <span>Điền khớp tồn HT</span>
              </button>
            )}
          </div>
        </div>

        <div className="wh-table-wrap">
          <table className="wh-detail-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã SKU</th>
                <th>Sản phẩm</th>
                <th>Số lô</th>
                <th style={{ textAlign: 'right' }}>Tồn hệ thống</th>
                <th style={{ textAlign: 'right', width: 130 }}>Thực tế đếm *</th>
                <th style={{ textAlign: 'right' }}>Chênh lệch</th>
                <th style={{ minWidth: 260 }}>Lý do chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => {
                const hasVariance = item.variance !== null && item.variance !== 0;
                const missingReason =
                  hasVariance && (!item.reason || item.reason.trim() === '');

                return (
                  <tr key={item.lotId} className={hasVariance ? 'row-variance' : ''}>
                    <td>{index + 1}</td>
                    <td>
                      <code>{item.productSku}</code>
                    </td>
                    <td>
                      <div className="wh-prod-name">{item.productName}</div>
                      <small>{item.unit}</small>
                    </td>
                    <td>{item.lotNumber || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {item.systemQuantity}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {canEdit ? (
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={`wh-qty-input ${
                            item.actualQuantity === '' ? 'missing' : ''
                          }`}
                          value={item.actualQuantity}
                          onChange={(e) =>
                            handleActualQtyChange(item.lotId, e.target.value)
                          }
                          placeholder="Nhập SL..."
                        />
                      ) : (
                        <strong>
                          {item.actualQuantity === '' ? '-' : item.actualQuantity}
                        </strong>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.variance === null ? (
                        <span className="wh-var-empty">-</span>
                      ) : item.variance === 0 ? (
                        <span className="wh-var-zero">0</span>
                      ) : (
                        <span
                          className={
                            item.variance > 0 ? 'wh-var-plus' : 'wh-var-minus'
                          }
                        >
                          {item.variance > 0 ? `+${item.variance}` : item.variance}
                        </span>
                      )}
                    </td>
                    <td>
                      {hasVariance ? (
                        canEdit ? (
                          <div className="wh-reason-box">
                            <input
                              type="text"
                              className={`wh-reason-input ${
                                missingReason ? 'missing-reason' : ''
                              }`}
                              value={item.reason}
                              onChange={(e) =>
                                handleReasonChange(item.lotId, e.target.value)
                              }
                              placeholder="Bắt buộc nhập lý do..."
                            />
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleReasonChange(item.lotId, e.target.value);
                                }
                              }}
                            >
                              <option value="">Chọn mẫu...</option>
                              {PRESET_REASONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span>{item.reason || '-'}</span>
                        )
                      ) : (
                        <span className="wh-no-var">Khớp số liệu</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="wh-notes-section">
          <label>Ghi chú của Thủ kho / Lịch sử phiếu:</label>
          {canEdit ? (
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Nhập ghi chú bổ sung nếu có..."
            />
          ) : (
            <p className="wh-readonly-notes">{generalNotes || 'Không có ghi chú'}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseStocktakeDetail;

