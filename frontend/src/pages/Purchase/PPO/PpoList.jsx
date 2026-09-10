import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  CheckCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Ban, 
  Filter, 
  RotateCcw, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  Calculator,
  ExternalLink,
  Layers,
  ArrowRight,
  Truck
} from 'lucide-react';
import { usePpoSuggestions } from '../../../hooks/usePpoSuggestions';
import { 
  getSuppliers, 
  generatePpoSuggestions, 
  updatePpoQuantity, 
  approvePpoBatch,
  getPpoWindowStatus,
  execute11AmClosing
} from '../../../services/api';
import PpoDetailModal from './PpoDetailModal';
import PpoRejectModal from './PpoRejectModal';
import PpoClosingResultModal from './PpoClosingResultModal';
import './PpoList.css';

const STATUS_TAGS = [
  { code: 'NEW', label: 'Mới sinh' },
  { code: 'VIEWED', label: 'Đã xem' },
  { code: 'APPROVED', label: 'Đã duyệt' },
  { code: 'REJECTED', label: 'Đã từ chối' }
];

const PpoList = () => {
  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    supplierId: '',
    priority: '',
    status: '',
    page: 1,
    limit: 15
  });

  const [suppliers, setSuppliers] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [selectedPpoDetail, setSelectedPpoDetail] = useState(null);
  const [selectedPpoReject, setSelectedPpoReject] = useState(null);
  const [closingResult, setClosingResult] = useState(null);
  const [closing, setClosing] = useState(false);
  const [windowStatus, setWindowStatus] = useState(null);

  // Hook fetching PPO
  const { items, summary, total, loading, refetch } = usePpoSuggestions(filters);

  // Load suppliers and window status
  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(console.error);
    getPpoWindowStatus().then(setWindowStatus).catch(console.error);
    const interval = setInterval(() => {
      getPpoWindowStatus().then(setWindowStatus).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Chỉ chọn các dòng chưa APPROVED và chưa REJECTED
      const valid = items.filter(i => i.status !== 'APPROVED' && i.status !== 'REJECTED').map(i => i.id);
      setSelectedIds(valid);
    } else {
      setSelectedIds([]);
    }
  };

  const handleRowSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Kích hoạt AI sinh đề xuất
  const handleRunAiAnalysis = async () => {
    setGenerating(true);
    try {
      const res = await generatePpoSuggestions(1);
      alert(`Phân tích ROP hoàn tất!\nĐã quét ${res.totalEvaluated} sản phẩm, sinh ${res.suggestionsCount} đề xuất đặt hàng (Trong đó có ${res.highPriorityCount} mặt hàng cần đặt gấp).`);
      refetch();
    } catch (err) {
      alert(err.message || 'Lỗi khi chạy đề xuất AI');
    } finally {
      setGenerating(false);
    }
  };

  // Duyệt các dòng đã chọn thành đơn PO
  const handleApproveSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Xác nhận duyệt ${selectedIds.length} đề xuất đã chọn và tự động tạo các đơn đặt hàng mua (PO Nháp)?`)) return;

    setApproving(true);
    try {
      const res = await approvePpoBatch({
        distributorId: 1,
        ppoIds: selectedIds,
        userId: 1
      });

      alert(res.message);
      setSelectedIds([]);
      refetch();
    } catch (err) {
      alert(err.message || 'Lỗi khi duyệt đề xuất');
    } finally {
      setApproving(false);
    }
  };

  // Duyệt nhanh 1 dòng
  const handleQuickApproveOne = async (ppo) => {
    if (!window.confirm(`Xác nhận duyệt đề xuất mua [${ppo.product?.sku}] với số lượng ${ppo.finalQty} ${ppo.product?.unit || 'Thùng'}?`)) return;
    try {
      const res = await approvePpoBatch({
        distributorId: 1,
        ppoIds: [ppo.id],
        userId: 1
      });
      alert(res.message);
      refetch();
    } catch (err) {
      alert(err.message || 'Lỗi khi duyệt đề xuất');
    }
  };

  // Sửa số lượng chốt (finalQty)
  // Quy tắc: Kế toán chỉ có thể giảm số lượng (finalQty <= suggestedQty)
  const handleFinalQtyBlur = async (id, currentVal, origVal, suggestedQty) => {
    const qty = parseFloat(currentVal);
    if (isNaN(qty) || qty <= 0 || qty === origVal) return;

    if (qty > suggestedQty) {
      alert(`Số lượng đặt (${qty}) không được lớn hơn số lượng AI đề xuất (${suggestedQty}).\nKế toán chỉ có thể giảm số lượng!`);
      refetch();
      return;
    }

    try {
      await updatePpoQuantity(id, { distributorId: 1, finalQty: qty });
      refetch();
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật số lượng');
      refetch();
    }
  };

  // Kích hoạt Chốt đơn 11:00 (Mô phỏng)
  const handleExecute11AmClosing = async () => {
    if (!window.confirm('Xác nhận kích hoạt quy trình CHỐT ĐƠN 11:00?\n\nHệ thống sẽ:\n1. Tự động duyệt toàn bộ đề xuất PPO đang chờ.\n2. Phân nhóm theo NCC, sinh đồng thời Đơn mua (PO) và Đơn bán (SO).\n3. Gán vào Chuyến xe giao hàng INBOUND (D+3).\n4. Chuyển thông tin tới phân hệ Nhập kho đặt hàng.')) return;

    setClosing(true);
    try {
      const res = await execute11AmClosing(1);
      setClosingResult(res);
      refetch();
    } catch (err) {
      alert(err.message || 'Lỗi khi chốt đơn 11:00');
    } finally {
      setClosing(false);
    }
  };

  // Toggle status filter
  const handleStatusToggle = (stCode) => {
    let current = filters.status ? filters.status.split(',').filter(Boolean) : [];
    if (current.includes(stCode)) {
      current = current.filter(c => c !== stCode);
    } else {
      current.push(stCode);
    }
    setFilters(prev => ({ ...prev, status: current.join(','), page: 1 }));
  };

  const totalPages = Math.ceil(total / (filters.limit || 15)) || 1;

  return (
    <div className="ppo-page-container">
      {/* 1. Header & Actions */}
      <div className="po-page-header">
        <div className="po-header-left">
          <h1>
            <Sparkles size={26} color="#7c3aed" />
            <span>PPO — Đề xuất Đơn đặt hàng mua bằng AI (Purchase Proposal)</span>
          </h1>
          <p>Hệ thống tự động phân tích tốc độ bán, thời gian giao hàng và tồn kho an toàn (ROP) để đề xuất nhập hàng kịp thời</p>
        </div>

        <div className="po-header-actions">
          <button 
            type="button" 
            className="btn-closing-11am"
            onClick={handleExecute11AmClosing}
            disabled={closing}
            title="Đúng 11:00 hệ thống tự động chốt PPO, sinh PO & SO và gán Chuyến xe D+3"
          >
            <Clock size={16} />
            <span>{closing ? 'Đang chốt đơn & tạo chuyến xe...' : '⏰ Chốt đơn 11:00 (Mô phỏng)'}</span>
          </button>

          <button 
            type="button" 
            className="btn-ai-generate"
            onClick={handleRunAiAnalysis}
            disabled={generating}
          >
            <Sparkles size={16} />
            <span>{generating ? 'Đang phân tích ROP...' : '🤖 Chạy Đề xuất AI'}</span>
          </button>

          {selectedIds.length > 0 && (
            <button 
              type="button" 
              className="btn-approve-batch"
              onClick={handleApproveSelected}
              disabled={approving}
            >
              <CheckCheck size={18} />
              <span>{approving ? 'Đang tạo PO...' : `Duyệt ${selectedIds.length} dòng đã chọn`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1.1 Khung giờ duyệt Banner */}
      <div className="ppo-window-banner">
        <div className="window-banner-left">
          <div className="window-badge-icon">
            <Clock size={20} />
          </div>
          <div>
            <strong>Khung giờ kế toán duyệt đơn: 09:00 - 11:00 hàng ngày</strong>
            <p>Quy tắc: Kế toán chỉ được phép <u>GIẢM</u> số lượng so với đề xuất AI. Đúng 11:00, hệ thống tự động chốt PPO, sinh đơn PO & SO và gán Chuyến xe giao đến kho NPP (D+3).</p>
          </div>
        </div>
        <div className="window-banner-right">
          <span className="server-time-badge">
            Giờ hệ thống: <strong>{windowStatus?.displayTime || '09:00'}</strong>
          </span>
          <Link to="/purchase/receiving" className="btn-link-receiving">
            <Truck size={15} />
            <span>Nhập kho đặt hàng (D+3)</span>
          </Link>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="po-kpi-grid">
        <div 
          className={`kpi-card ${filters.status === '' && filters.priority === '' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, status: '', priority: '', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Layers size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{summary.total || 0}</span>
            <span className="kpi-label">Tổng đề xuất</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.priority === 'HIGH' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, priority: prev.priority === 'HIGH' ? '' : 'HIGH', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#ef4444' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ color: '#b91c1c' }}>{summary.HIGH_PRIORITY || 0}</span>
            <span className="kpi-label" style={{ color: '#b91c1c' }}>Cần đặt gấp (Báo động)</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'NEW,VIEWED' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, status: 'NEW,VIEWED', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Clock size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{(summary.NEW || 0) + (summary.VIEWED || 0)}</span>
            <span className="kpi-label">Chờ duyệt</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'APPROVED' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, status: 'APPROVED', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ color: '#047857' }}>{summary.APPROVED || 0}</span>
            <span className="kpi-label">Đã duyệt thành PO</span>
          </div>
        </div>

        <div 
          className={`kpi-card ${filters.status === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setFilters(prev => ({ ...prev, status: 'REJECTED', page: 1 }))}
        >
          <div className="kpi-icon-wrap" style={{ background: '#fef2f2', color: '#991b1b' }}>
            <Ban size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-val">{summary.REJECTED || 0}</span>
            <span className="kpi-label">Đã từ chối</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Box */}
      <div className="po-filter-card">
        <div className="po-filter-row-top">
          <div className="filter-heading">
            <Filter size={18} color="#7c3aed" />
            <span>Bộ lọc tra cứu đề xuất PPO</span>
          </div>
          <button 
            type="button" 
            className="action-icon-btn" 
            onClick={() => setFilters({ search: '', supplierId: '', priority: '', status: '', page: 1, limit: 15 })}
          >
            <RotateCcw size={14} />
            <span>Xoá bộ lọc</span>
          </button>
        </div>

        <div className="po-filter-grid" style={{ gridTemplateColumns: '1.5fr 1.5fr 1.2fr auto' }}>
          <div className="filter-field">
            <label>Tìm sản phẩm (SKU / Tên)</label>
            <input 
              type="text" 
              placeholder="VD: 00CF00080, Cà phê..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
            />
          </div>

          <div className="filter-field">
            <label>Nhà cung cấp</label>
            <select 
              value={filters.supplierId}
              onChange={(e) => setFilters(prev => ({ ...prev, supplierId: e.target.value, page: 1 }))}
            >
              <option value="">-- Tất cả Nhà cung cấp --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Mức độ ưu tiên</label>
            <select 
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value, page: 1 }))}
            >
              <option value="">-- Tất cả mức độ --</option>
              <option value="HIGH">Cao (Sắp hết hàng / Dưới an toàn)</option>
              <option value="MEDIUM">Trung bình (Dưới ROP)</option>
              <option value="LOW">Thấp (Tiệm cận ROP)</option>
            </select>
          </div>
        </div>

        {/* Multi-select trạng thái */}
        <div className="status-multi-select-wrap">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Lọc theo trạng thái:</span>
          {STATUS_TAGS.map(st => {
            const isSelected = filters.status ? filters.status.split(',').includes(st.code) : false;
            return (
              <button
                key={st.code}
                type="button"
                className={`status-tag-filter ${isSelected ? 'selected' : ''}`}
                onClick={() => handleStatusToggle(st.code)}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Table */}
      <div className="po-table-card">
        <div className="po-table-responsive">
          <table className="po-data-table">
            <thead>
              <tr>
                <th style={{ width: '35px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === items.filter(i => i.status !== 'APPROVED' && i.status !== 'REJECTED').length}
                  />
                </th>
                <th style={{ width: '220px' }}>Sản phẩm (SKU)</th>
                <th style={{ width: '180px' }}>Nhà cung cấp</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Tồn khả dụng</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Bán TB/ngày</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Điểm ROP</th>
                <th style={{ width: '95px', textAlign: 'right' }}>SL Đề xuất</th>
                <th style={{ width: '105px', textAlign: 'center' }}>SL Chốt đặt</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Ưu tiên</th>
                <th style={{ width: '220px' }}>Diễn giải lý do đề xuất</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Đang nạp danh sách đề xuất PPO...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                    Chưa có đề xuất đặt hàng nào. Nhấn <strong>"🤖 Chạy Đề xuất AI / Phân tích ROP"</strong> để hệ thống tự động quét kho và bán hàng!
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const isChecked = selectedIds.includes(item.id);
                  const isApproved = item.status === 'APPROVED';
                  const isRejected = item.status === 'REJECTED';

                  return (
                    <tr key={item.id} style={{ background: isChecked ? '#f5f3ff' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          disabled={isApproved || isRejected}
                          onChange={() => handleRowSelect(item.id)}
                        />
                      </td>

                      {/* Sản phẩm */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.product?.sku}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.product?.name}</div>
                      </td>

                      {/* NCC */}
                      <td>
                        <div style={{ color: '#334155' }}>{item.supplier?.name || 'Tân Hiệp Phát'}</div>
                      </td>

                      {/* Tồn khả dụng */}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: item.quantityAvailableSnapshot <= item.safetyStock ? '#dc2626' : '#0f172a' }}>
                        {item.quantityAvailableSnapshot} <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b' }}>{item.product?.unit}</span>
                      </td>

                      {/* Bán TB/ngày */}
                      <td style={{ textAlign: 'right', color: '#475569' }}>
                        {item.avgDailyDemand}
                      </td>

                      {/* ROP */}
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>
                        {item.reorderPoint}
                      </td>

                      {/* SL Đề xuất */}
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#7c3aed' }}>
                        {item.suggestedQty}
                      </td>

                      {/* SL Chốt đặt */}
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="number"
                          className="input-final-qty"
                          defaultValue={item.finalQty}
                          min={1}
                          max={item.suggestedQty}
                          disabled={isApproved || isRejected}
                          title={`Kế toán chỉ có thể giảm số lượng (Tối đa: ${item.suggestedQty})`}
                          onBlur={(e) => handleFinalQtyBlur(item.id, e.target.value, item.finalQty, item.suggestedQty)}
                        />
                      </td>

                      {/* Ưu tiên */}
                      <td style={{ textAlign: 'center' }}>
                        {item.priority === 'HIGH' && (
                          <span className="badge-priority-high">
                            <AlertTriangle size={12} /> Cần đặt gấp
                          </span>
                        )}
                        {item.priority === 'MEDIUM' && (
                          <span className="badge-priority-medium">
                            Trung bình
                          </span>
                        )}
                        {item.priority === 'LOW' && (
                          <span className="badge-priority-low">
                            Thấp
                          </span>
                        )}
                      </td>

                      {/* Lý do đề xuất */}
                      <td>
                        <div className="reason-tooltip-cell">
                          {item.reason}
                        </div>
                      </td>

                      {/* Trạng thái & Link PO */}
                      <td style={{ textAlign: 'center' }}>
                        {item.status === 'NEW' && (
                          <span className="badge-status badge-waiting" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                            Mới sinh
                          </span>
                        )}
                        {item.status === 'VIEWED' && (
                          <span className="badge-status badge-draft">
                            Đã xem
                          </span>
                        )}
                        {item.status === 'APPROVED' && (
                          <div>
                            <span className="badge-status badge-completed">
                              Đã duyệt
                            </span>
                            {item.purchaseOrder && (
                              <div style={{ marginTop: 4 }}>
                                <Link to={`/purchase/purchase-orders/${item.purchaseOrder.id}`} className="po-link-badge">
                                  <span>{item.purchaseOrder.poCode}</span>
                                  <ExternalLink size={11} />
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                        {item.status === 'REJECTED' && (
                          <span className="badge-status badge-cancelled" title={item.rejectedReason || ''}>
                            Đã từ chối
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td>
                        <div className="po-row-actions" style={{ justifyContent: 'center' }}>
                          <button 
                            type="button" 
                            className="action-icon-btn"
                            title="Xem chi tiết công thức phân tích"
                            onClick={() => setSelectedPpoDetail(item)}
                          >
                            <Calculator size={15} color="#7c3aed" />
                          </button>

                          {!isApproved && !isRejected && (
                            <>
                              <button 
                                type="button" 
                                className="action-icon-btn success"
                                title="Duyệt nhanh đề xuất này"
                                onClick={() => handleQuickApproveOne(item)}
                              >
                                <CheckCheck size={15} />
                              </button>
                              <button 
                                type="button" 
                                className="action-icon-btn danger"
                                title="Từ chối đề xuất"
                                onClick={() => setSelectedPpoReject(item)}
                              >
                                <Ban size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination */}
        <div className="po-pagination-bar">
          <div>
            Hiển thị <strong>{items.length}</strong> / <strong>{total}</strong> đề xuất PPO
          </div>

          <div className="pagination-controls">
            <button 
              type="button" 
              className="page-nav-btn"
              disabled={filters.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>Trang {filters.page} / {totalPages}</span>
            <button 
              type="button" 
              className="page-nav-btn"
              disabled={filters.page >= totalPages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedPpoDetail && (
        <PpoDetailModal
          isOpen={Boolean(selectedPpoDetail)}
          ppo={selectedPpoDetail}
          onClose={() => setSelectedPpoDetail(null)}
        />
      )}

      {selectedPpoReject && (
        <PpoRejectModal
          isOpen={Boolean(selectedPpoReject)}
          ppo={selectedPpoReject}
          onClose={() => setSelectedPpoReject(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {closingResult && (
        <PpoClosingResultModal
          result={closingResult}
          onClose={() => setClosingResult(null)}
        />
      )}
    </div>
  );
};

export default PpoList;
