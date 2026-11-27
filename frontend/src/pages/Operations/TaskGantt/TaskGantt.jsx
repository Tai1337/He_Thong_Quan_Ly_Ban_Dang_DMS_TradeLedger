import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  PackageCheck,
  Plus,
  RotateCw,
  Search,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import { createInventoryCount, getOperationsGantt } from '../../../services/api';
import { useNotification } from '../../../components/Common/NotificationProvider';
import DmsSectionPanel from '../../../components/DmsUi/DmsSectionPanel';
import './TaskGantt.css';

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonthKey = (monthKey, delta) => {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr || !dateStr.includes('-')) return dateStr || '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const formatShortDate = (dateStr) => {
  if (!dateStr || !dateStr.includes('-')) return dateStr || '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
};

const computeBarPlacement = (task, monthStartDate, monthEndDate, daysInMonth) => {
  const [sy, sm, sd] = task.startDate.split('-').map(Number);
  const [ey, em, ed] = task.endDate.split('-').map(Number);
  const [msy, msm] = monthStartDate.split('-').map(Number);

  const monthIdx = msy * 12 + (msm - 1);
  const startMonthIdx = sy * 12 + (sm - 1);
  const endMonthIdx = ey * 12 + (em - 1);

  const clampedStartDay = startMonthIdx < monthIdx ? 1 : sd;
  const clampedEndDay = endMonthIdx > monthIdx ? daysInMonth : ed;

  const startDay = Math.max(1, Math.min(daysInMonth, clampedStartDay));
  const endDay = Math.max(startDay, Math.min(daysInMonth, clampedEndDay));

  const leftPct = ((startDay - 1) / daysInMonth) * 100;
  const spanDays = endDay - startDay + 1;
  const widthPct = (spanDays / daysInMonth) * 100;

  return {
    leftPct,
    widthPct,
    startsBefore: startMonthIdx < monthIdx,
    endsAfter: endMonthIdx > monthIdx,
  };
};

const TYPE_OPTIONS = [
  { key: 'ALL', label: 'Tất cả kế hoạch' },
  { key: 'PO_INBOUND', label: 'Nhập hàng NCC (PO)' },
  { key: 'DELIVERY_OUTBOUND', label: 'Giao hàng bán (D+1)' },
  { key: 'SALES_UNASSIGNED', label: 'Đơn chờ xếp chuyến' },
  { key: 'INVENTORY_COUNT', label: 'Kiểm kê đầu tháng' },
];

export default function TaskGantt() {
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [month, setMonth] = useState(getCurrentMonthKey);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingCount, setCreatingCount] = useState(false);
  const [error, setError] = useState('');
  const [ganttData, setGanttData] = useState({
    month: getCurrentMonthKey(),
    monthLabel: '',
    daysInMonth: 30,
    monthStartDate: '',
    monthEndDate: '',
    todayStr: '',
    summary: { total: 0, poCount: 0, tripCount: 0, unassignedSoCount: 0, countTaskCount: 0 },
    tasks: [],
  });
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchGantt = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getOperationsGantt({ month, type: typeFilter }, signal);
      setGanttData(res);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Không thể tải dữ liệu biểu đồ tiến độ');
      }
    } finally {
      setLoading(false);
    }
  }, [month, typeFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchGantt(controller.signal);
    return () => controller.abort();
  }, [fetchGantt]);

  useEffect(() => {
    const handleFocus = () => {
      fetchGantt();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchGantt]);

  const dayColumns = useMemo(() => {
    const [y, m] = (ganttData.month || month).split('-').map(Number);
    const totalDays = ganttData.daysInMonth || 30;
    const cols = [];
    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(y, m - 1, d);
      const dayOfWeek = dt.getDay();
      const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cols.push({
        day: d,
        label: String(d).padStart(2, '0'),
        weekday: WEEKDAY_SHORT[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateKey === ganttData.todayStr,
        dateKey,
      });
    }
    return cols;
  }, [ganttData.month, ganttData.daysInMonth, ganttData.todayStr, month]);

  const todayLeftPct = useMemo(() => {
    const idx = dayColumns.findIndex((c) => c.isToday);
    if (idx < 0) return null;
    return ((idx + 0.5) / dayColumns.length) * 100;
  }, [dayColumns]);

  const filteredTasks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return ganttData.tasks || [];
    return (ganttData.tasks || []).filter((t) =>
      [t.code, t.title, t.subtitle, t.assignee, t.statusLabel, t.typeLabel]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q)),
    );
  }, [ganttData.tasks, searchTerm]);

  const handleQuickCreateMonthlyCount = async (task) => {
    if (!task?.meta?.warehouseId) return;
    try {
      setCreatingCount(true);
      await createInventoryCount(
        {
          warehouseId: Number(task.meta.warehouseId),
          countType: 'MONTHLY',
          notes: task.meta.notes || `Kiểm kê kho định kỳ đầu tháng (${ganttData.monthLabel})`,
        },
        1,
      );
      notify?.('Đã khởi tạo phiếu kiểm kê kho đầu tháng!', 'success');
      setSelectedTask(null);
      await fetchGantt();
    } catch (err) {
      notify?.(err.message || 'Không thể khởi tạo phiếu kiểm kê', 'error');
    } finally {
      setCreatingCount(false);
    }
  };

  const summary = ganttData.summary || {};

  return (
    <div className="gantt-dms-page">
      {/* Page Title & Quick Actions */}
      <div className="dms-page-title-bar">
        <div>
          <h1>Biểu đồ Tiến độ Vận hành (Gantt)</h1>
          <p className="dms-page-subtitle">
            Đồng bộ thời gian thực lịch nhận hàng PO, chuyến xe giao hàng bán (mặc định D+1), đơn chờ xếp chuyến và lịch kiểm kê kho đầu tháng.
          </p>
        </div>

        <div className="gantt-head-actions">
          <button
            type="button"
            className="dms-btn dms-btn-outline"
            onClick={() => navigate('/purchase/purchase-orders')}
          >
            <Plus size={14} />
            <span>Đặt hàng PO</span>
          </button>
          <button
            type="button"
            className="dms-btn dms-btn-blue"
            onClick={() => navigate('/logistics/delivery-trips')}
          >
            <Truck size={14} />
            <span>Điều phối chuyến xe</span>
          </button>
          <button
            type="button"
            className="dms-btn dms-btn-outline"
            onClick={() => fetchGantt()}
            disabled={loading}
            title="Tải lại tiến độ mới nhất"
          >
            <RotateCw size={14} className={loading ? 'gantt-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* KPI Filter Strip */}
      <div className="gantt-kpi-grid">
        <button
          type="button"
          className={`gantt-kpi-card ${typeFilter === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('ALL')}
        >
          <div className="gantt-kpi-icon all">
            <Calendar size={18} />
          </div>
          <div>
            <div className="gantt-kpi-label">Tổng hạng mục tháng</div>
            <div className="gantt-kpi-value">{summary.total || 0}</div>
          </div>
        </button>

        <button
          type="button"
          className={`gantt-kpi-card ${typeFilter === 'PO_INBOUND' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('PO_INBOUND')}
        >
          <div className="gantt-kpi-icon po">
            <PackageCheck size={18} />
          </div>
          <div>
            <div className="gantt-kpi-label">Nhập hàng NCC (PO)</div>
            <div className="gantt-kpi-value">{summary.poCount || 0}</div>
          </div>
        </button>

        <button
          type="button"
          className={`gantt-kpi-card ${typeFilter === 'DELIVERY_OUTBOUND' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('DELIVERY_OUTBOUND')}
        >
          <div className="gantt-kpi-icon trip">
            <Truck size={18} />
          </div>
          <div>
            <div className="gantt-kpi-label">Chuyến xe giao (D+1)</div>
            <div className="gantt-kpi-value">{summary.tripCount || 0}</div>
          </div>
        </button>

        <button
          type="button"
          className={`gantt-kpi-card ${typeFilter === 'SALES_UNASSIGNED' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('SALES_UNASSIGNED')}
        >
          <div className="gantt-kpi-icon so">
            <ShoppingBag size={18} />
          </div>
          <div>
            <div className="gantt-kpi-label">Đơn chờ xếp chuyến</div>
            <div className="gantt-kpi-value">{summary.unassignedSoCount || 0}</div>
          </div>
        </button>

        <button
          type="button"
          className={`gantt-kpi-card ${typeFilter === 'INVENTORY_COUNT' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('INVENTORY_COUNT')}
        >
          <div className="gantt-kpi-icon count">
            <ClipboardCheck size={18} />
          </div>
          <div>
            <div className="gantt-kpi-label">Kiểm kê đầu tháng</div>
            <div className="gantt-kpi-value">{summary.countTaskCount || 0}</div>
          </div>
        </button>
      </div>

      {/* Main Gantt Panel */}
      <DmsSectionPanel
        title={`Lịch trình vận hành · ${ganttData.monthLabel || month} (${filteredTasks.length} hạng mục)`}
        noPadding
        actions={
          <div className="gantt-panel-legend">
            <span className="legend-dot-item"><i style={{ background: '#059669' }} /> Nhập PO</span>
            <span className="legend-dot-item"><i style={{ background: '#0066da' }} /> Chuyến giao hàng</span>
            <span className="legend-dot-item"><i style={{ background: '#d97706' }} /> Chờ xếp xe</span>
            <span className="legend-dot-item"><i style={{ background: '#7c3aed' }} /> Kiểm kê đầu tháng</span>
          </div>
        }
      >
        {/* Filter & Month Navigation Bar */}
        <div className="gantt-toolbar-row">
          <div className="gantt-month-nav">
            <button
              type="button"
              className="gantt-nav-btn"
              onClick={() => setMonth((m) => shiftMonthKey(m, -1))}
              title="Tháng trước"
            >
              <ChevronLeft size={15} />
            </button>
            <input
              type="month"
              className="dms-input gantt-month-input"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
            <button
              type="button"
              className="gantt-nav-btn"
              onClick={() => setMonth((m) => shiftMonthKey(m, 1))}
              title="Tháng sau"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              className="dms-btn dms-btn-outline gantt-today-btn"
              onClick={() => setMonth(getCurrentMonthKey())}
            >
              Tháng hiện tại
            </button>
          </div>

          <div className="gantt-search-filters">
            <select
              className="dms-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>

            <div className="gantt-search-box">
              <Search size={14} className="gantt-search-ico" />
              <input
                type="text"
                className="dms-input gantt-search-input"
                placeholder="Tìm mã PO, TRIP, SO, tài xế, kho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="gantt-clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="gantt-error-banner">
            {error}
          </div>
        )}

        {/* Split Gantt Table + Timeline */}
        <div className="gantt-split-wrapper">
          {/* Left Fixed Task Column */}
          <div className="gantt-left-pane">
            <div className="gantt-left-head">
              <span>Chứng từ &amp; Công việc</span>
              <span>Tiến độ</span>
            </div>

            {loading ? (
              <div className="gantt-left-empty">Đang tải lịch trình vận hành...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="gantt-left-empty">Không có lịch trình phù hợp trong tháng này.</div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`gantt-left-row ${selectedTask?.id === task.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="gantt-row-main">
                    <div className="gantt-row-top">
                      <span className="gantt-code-tag" style={{ borderColor: task.color, color: task.color }}>
                        {task.code}
                      </span>
                      <span className="gantt-date-range">
                        {formatShortDate(task.startDate)} → {formatShortDate(task.endDate)}
                      </span>
                    </div>
                    <div className="gantt-row-title" title={task.title}>
                      {task.title}
                    </div>
                  </div>
                  <div className="gantt-row-status-col">
                    <span className={`gantt-status-pill type-${task.type.toLowerCase()} ${task.status === 'OVERDUE' ? 'is-overdue' : ''}`}>
                      {task.statusLabel}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Day-by-Day Timeline Grid */}
          <div className="gantt-right-pane">
            <div
              className="gantt-timeline-canvas"
              style={{ minWidth: `${dayColumns.length * 36}px` }}
            >
              {/* Day Headers */}
              <div
                className="gantt-days-header"
                style={{ gridTemplateColumns: `repeat(${dayColumns.length}, minmax(36px, 1fr))` }}
              >
                {dayColumns.map((col) => (
                  <div
                    key={col.dateKey}
                    className={`gantt-day-cell ${col.isWeekend ? 'is-weekend' : ''} ${col.isToday ? 'is-today' : ''}`}
                  >
                    <span className="gantt-day-num">{col.label}</span>
                    <span className="gantt-day-wd">{col.weekday}</span>
                  </div>
                ))}
              </div>

              {/* Rows + Background Grid + Today Marker */}
              <div className="gantt-rows-area">
                <div
                  className="gantt-bg-grid"
                  style={{ gridTemplateColumns: `repeat(${dayColumns.length}, minmax(36px, 1fr))` }}
                >
                  {dayColumns.map((col) => (
                    <div
                      key={col.dateKey}
                      className={`gantt-bg-col ${col.isWeekend ? 'is-weekend' : ''} ${col.isToday ? 'is-today' : ''}`}
                    />
                  ))}
                </div>

                {todayLeftPct !== null && (
                  <div className="gantt-today-line" style={{ left: `${todayLeftPct}%` }}>
                    <span className="gantt-today-badge">Hôm nay</span>
                  </div>
                )}

                {!loading && filteredTasks.length === 0 ? (
                  <div className="gantt-right-empty" />
                ) : (
                  filteredTasks.map((task) => {
                    const { leftPct, widthPct, startsBefore, endsAfter } = computeBarPlacement(
                      task,
                      ganttData.monthStartDate,
                      ganttData.monthEndDate,
                      dayColumns.length,
                    );

                    return (
                      <div
                        key={task.id}
                        className={`gantt-timeline-row ${selectedTask?.id === task.id ? 'is-selected' : ''}`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div
                          className={`gantt-bar-item ${task.isAutoMonthly ? 'is-dashed' : ''} ${task.status === 'OVERDUE' ? 'is-overdue' : ''}`}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: task.isAutoMonthly ? '#f3e8ff' : task.color,
                            borderColor: task.color,
                            color: task.isAutoMonthly ? '#6d28d9' : '#ffffff',
                          }}
                          title={`${task.code}: ${task.title} (${formatDisplayDate(task.startDate)} → ${formatDisplayDate(task.endDate)})`}
                        >
                          {!task.isAutoMonthly && (
                            <div
                              className="gantt-bar-progress"
                              style={{ width: `${task.progress}%` }}
                            />
                          )}
                          <span className="gantt-bar-text">
                            {startsBefore ? '◄ ' : ''}
                            {task.code}
                            {task.progress > 0 ? ` (${task.progress}%)` : ''}
                            {endsAfter ? ' ►' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </DmsSectionPanel>

      {/* Detail Modal for Selected Schedule Item */}
      {selectedTask && (
        <div className="gantt-modal-backdrop" onClick={() => setSelectedTask(null)}>
          <div className="gantt-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gantt-detail-head" style={{ borderTopColor: selectedTask.color }}>
              <div>
                <span className="gantt-detail-type" style={{ color: selectedTask.color }}>
                  {selectedTask.typeLabel}
                </span>
                <h3>{selectedTask.code} · {selectedTask.title}</h3>
              </div>
              <button type="button" className="gantt-close-btn" onClick={() => setSelectedTask(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="gantt-detail-body">
              <div className="gantt-detail-grid">
                <div className="gantt-detail-item">
                  <span className="lbl">Ngày bắt đầu</span>
                  <span className="val">{formatDisplayDate(selectedTask.startDate)}</span>
                </div>
                <div className="gantt-detail-item">
                  <span className="lbl">Ngày dự kiến hoàn tất</span>
                  <span className="val">{formatDisplayDate(selectedTask.endDate)}</span>
                </div>
                <div className="gantt-detail-item">
                  <span className="lbl">Trạng thái</span>
                  <span className="val">{selectedTask.statusLabel}</span>
                </div>
                <div className="gantt-detail-item">
                  <span className="lbl">Phụ trách / Kho</span>
                  <span className="val">{selectedTask.assignee || '—'}</span>
                </div>
                <div className="gantt-detail-item">
                  <span className="lbl">Tiến độ</span>
                  <span className="val">{selectedTask.progress}%</span>
                </div>
                <div className="gantt-detail-item">
                  <span className="lbl">Thông tin thêm</span>
                  <span className="val">{selectedTask.subtitle || '—'}</span>
                </div>
              </div>

              {selectedTask.meta?.orderCodes?.length > 0 && (
                <div className="gantt-detail-orders">
                  <span className="lbl">Đơn hàng trên chuyến:</span>
                  <div className="gantt-order-chips">
                    {selectedTask.meta.orderCodes.map((oc) => (
                      <span key={oc} className="gantt-order-chip">{oc}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.meta?.notes && (
                <div className="gantt-detail-notes">
                  <span className="lbl">Ghi chú:</span>
                  <p>{selectedTask.meta.notes}</p>
                </div>
              )}
            </div>

            <div className="gantt-detail-foot">
              {selectedTask.isAutoMonthly && (
                <button
                  type="button"
                  className="dms-btn dms-btn-blue"
                  disabled={creatingCount}
                  onClick={() => handleQuickCreateMonthlyCount(selectedTask)}
                >
                  <ClipboardCheck size={14} />
                  <span>{creatingCount ? 'Đang tạo phiếu...' : 'Khởi tạo phiếu kiểm kê đầu tháng'}</span>
                </button>
              )}
              <button
                type="button"
                className="dms-btn dms-btn-outline"
                onClick={() => navigate(selectedTask.linkPath)}
              >
                <ExternalLink size={14} />
                <span>Mở trang chứng từ</span>
              </button>
              <button
                type="button"
                className="dms-btn dms-btn-outline"
                onClick={() => setSelectedTask(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
