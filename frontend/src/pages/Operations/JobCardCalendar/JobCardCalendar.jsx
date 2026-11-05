import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Plus,
  X,
  Trash2,
  Pencil,
} from 'lucide-react';
import {
  getSalesRoutesWeekly,
  getSalesRoutes,
  getSalesReps,
  getRetailers,
  createSalesRoute,
  updateSalesRoute,
  deleteSalesRoute,
} from '../../../services/api';
import './JobCardCalendar.css';

const WEEKDAY_LABELS = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};

// Màu pill theo sale (chỉ số theo thứ tự sale trong danh sách)
const SALE_COLORS = [
  { bg: '#d9f99d', text: '#1a2e05', border: '#bef264' },
  { bg: '#bfdbfe', text: '#1e3a8a', border: '#93c5fd' },
  { bg: '#fde68a', text: '#78350f', border: '#fcd34d' },
  { bg: '#e9d5ff', text: '#581c87', border: '#d8b4fe' },
  { bg: '#fecaca', text: '#7f1d1d', border: '#fca5a5' },
  { bg: '#a7f3d0', text: '#064e3b', border: '#6ee7b7' },
];

const getSaleColor = (salesRepId, saleColorMap) =>
  saleColorMap.get(salesRepId) || SALE_COLORS[0];

// Thứ 2 của tuần chứa một ngày bất kỳ
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = CN
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (d) =>
  `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

const JobCardCalendar = () => {
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'sales'
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [weeklyData, setWeeklyData] = useState({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSalesRep, setFilterSalesRep] = useState('');
  const [salesReps, setSalesReps] = useState([]);
  const [detailPanel, setDetailPanel] = useState(null); // { weekday, entry }
  const [routeForm, setRouteForm] = useState(null); // { id?, name?, salesRepId?, stops? } | null
  const [routes, setRoutes] = useState([]); // danh sách tuyến để chỉnh sửa
  const [retailers, setRetailers] = useState([]);

  const saleColorMap = useMemo(() => {
    const map = new Map();
    salesReps.forEach((s, i) => map.set(s.id, SALE_COLORS[i % SALE_COLORS.length]));
    return map;
  }, [salesReps]);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = filterSalesRep ? { salesRepId: filterSalesRep } : {};
      const data = await getSalesRoutesWeekly(filters);
      setWeeklyData({ 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], ...data });
    } catch (err) {
      setError(err.message || 'Không thể tải lịch phân luồng');
    } finally {
      setLoading(false);
    }
  }, [filterSalesRep]);

  const fetchMasterData = useCallback(async () => {
    try {
      const [reps, rts] = await Promise.all([getSalesReps(), getRetailers()]);
      setSalesReps(reps);
      setRetailers(rts);
    } catch {
      /* sidebar vẫn dùng được khi thiếu master data */
    }
  }, []);

  const fetchRoutes = useCallback(async () => {
    try {
      const data = await getSalesRoutes({ includeInactive: 'true' });
      setRoutes(data);
    } catch {
      /* form tự hiện lỗi khi submit */
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  const openForm = () => {
    setRouteForm({}); // form trống: tạo mới. Sửa tuyến sẽ đi qua editFromList
  };

  const openEditForm = async () => {
    await fetchRoutes();
    setRouteForm({ __pick: true }); // bước chọn tuyến cần sửa
  };

  // Chuyển từ bước chọn tuyến sang form sửa với dữ liệu đã nạp
  const pickRouteToEdit = (route) => {
    setRouteForm({
      id: route.id,
      name: route.name,
      salesRepId: route.salesRep?.id || '',
      stops: route.stops.map((s) => ({
        retailerId: s.retailer?.id || '',
        weekday: s.weekday,
        visitOrder: s.visitOrder,
      })),
    });
  };

  // Danh sách 7 ngày của tuần đang xem
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  // weekday (1..7) ứng với cột trong tuần đang xem
  const weekdayOfColumn = (colIdx) => (colIdx === 6 ? 7 : colIdx + 1);

  const todayStr = new Date().toDateString();

  const shiftWeek = (delta) => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  };

  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Xóa tuyến này? Tất cả điểm ghé cũng sẽ bị xóa.')) return;
    try {
      await deleteSalesRoute(routeId);
      setDetailPanel(null);
      fetchCalendar();
      fetchRoutes();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="calendar-page-layout">
      {/* CỘT TRÁI: BỘ LỌC */}
      <aside className="calendar-left-filters">
        <div className="filter-group-block">
          <label className="filter-block-title">Nhân viên bán hàng</label>
          <select
            className="filter-block-select"
            value={filterSalesRep}
            onChange={(e) => setFilterSalesRep(e.target.value)}
          >
            <option value="">Tất cả NVBH</option>
            {salesReps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.username})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group-block">
          <label className="filter-block-title">Chế độ xem</label>
          <select
            className="filter-block-select"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="week">Lịch tuần</option>
            <option value="sales">Theo nhân sự</option>
          </select>
        </div>

        <div className="filter-group-block">
          <button type="button" className="filter-block-add-btn" onClick={openForm}>
            <Plus size={14} />
            <span>Thêm tuyến bán hàng</span>
          </button>
          <button type="button" className="filter-block-add-btn secondary" onClick={openEditForm}>
            <Pencil size={14} />
            <span>Sửa tuyến hiện có</span>
          </button>
        </div>

        <div className="filter-group-block">
          <label className="filter-block-title">Ghi chú phân luồng</label>
          <p className="filter-hint-text">
            Mỗi màu tương ứng một NVBH. Click vào thẻ tuyến để xem danh sách cửa
            hàng cần ghé theo thứ tự.
          </p>
        </div>
      </aside>

      {/* VÙNG CHÍNH */}
      <main className="calendar-main-canvas">
        <div className="calendar-top-toolbar">
          <div className="calendar-title-wrap">
            <h1 className="calendar-title">Phân Luồng Bán Hàng</h1>
          </div>

          <div className="calendar-actions-wrap">
            <button type="button" className="calendar-icon-btn" title="Làm mới" onClick={fetchCalendar}>
              <RotateCw size={15} className={loading ? 'cal-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="calendar-nav-bar">
          <div className="calendar-nav-controls">
            <button type="button" className="calendar-nav-arrow-btn" onClick={() => shiftWeek(-1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="calendar-current-period">
              Tuần {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
            </span>
            <button type="button" className="calendar-nav-arrow-btn" onClick={() => shiftWeek(1)}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-view-switcher">
            <button
              type="button"
              className="calendar-today-btn"
              onClick={() => setWeekStart(getMonday(new Date()))}
            >
              Hôm nay
            </button>
            <div className="calendar-mode-pill-group">
              <button
                type="button"
                className={`calendar-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
                onClick={() => setViewMode('week')}
              >
                Lịch tuần
              </button>
              <button
                type="button"
                className={`calendar-mode-btn ${viewMode === 'sales' ? 'active' : ''}`}
                onClick={() => setViewMode('sales')}
              >
                Theo nhân sự
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="cal-empty-state">{error}</div>
        ) : viewMode === 'week' ? (
          <WeekView
            weekDays={weekDays}
            weeklyData={weeklyData}
            loading={loading}
            todayStr={todayStr}
            saleColorMap={saleColorMap}
            onSelect={(weekday, entry) => setDetailPanel({ weekday, entry })}
          />
        ) : (
          <SalesMatrixView
            weeklyData={weeklyData}
            salesReps={salesReps}
            loading={loading}
            saleColorMap={saleColorMap}
            onSelect={(weekday, entry) => setDetailPanel({ weekday, entry })}
          />
        )}
      </main>

      {/* PANEL CHI TIẾT */}
      {detailPanel && (
        <DetailPanel
          detail={detailPanel}
          saleColorMap={saleColorMap}
          onClose={() => setDetailPanel(null)}
          onDelete={() => handleDeleteRoute(detailPanel.entry.routeId)}
        />
      )}

      {/* FORM TẠO / SỬA TUYẾN */}
      {routeForm !== null && (
        <RouteForm
          form={routeForm}
          routes={routes}
          salesReps={salesReps}
          retailers={retailers}
          onPickRoute={pickRouteToEdit}
          onClose={() => setRouteForm(null)}
          onSaved={() => {
            setRouteForm(null);
            fetchCalendar();
            fetchRoutes();
          }}
        />
      )}
    </div>
  );
};

/* ============ LƯỚI LỊCH TUẦN ============ */
const WeekView = ({ weekDays, weeklyData, loading, todayStr, saleColorMap, onSelect }) => (
  <div className="calendar-grid-card">
    <div className="calendar-day-headers">
      {weekDays.map((d, i) => {
        const wd = i === 6 ? 7 : i + 1;
        return (
          <div key={i} className={`day-header-cell ${d.toDateString() === todayStr ? 'is-today' : ''}`}>
            {WEEKDAY_LABELS[wd]}
            <span className="day-header-date">{d.getDate()}/{d.getMonth() + 1}</span>
          </div>
        );
      })}
    </div>

    <div className="cal-week-grid">
      {weekDays.map((d, colIdx) => {
        const weekday = colIdx === 6 ? 7 : colIdx + 1;
        const entries = weeklyData[weekday] || [];
        return (
          <div
            key={colIdx}
            className={`cal-day-column ${d.toDateString() === todayStr ? 'is-today' : ''}`}
          >
            {loading ? (
              <div className="cal-loading-cell">Đang tải...</div>
            ) : entries.length === 0 ? (
              <div className="cal-empty-cell">Không có tuyến</div>
            ) : (
              entries.map((entry) => {
                const color = getSaleColor(entry.salesRep.id, saleColorMap);
                return (
                  <button
                    type="button"
                    key={`${entry.routeId}-${weekday}`}
                    className="cal-route-pill"
                    style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                    onClick={() => onSelect(weekday, entry)}
                  >
                    <strong>{entry.salesRep.fullName}</strong>
                    <span>{entry.routeName} · {entry.stops.length} cửa hàng</span>
                  </button>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  </div>
);

/* ============ CHẾ ĐỘ THEO NHÂN SỰ ============ */
const SalesMatrixView = ({ weeklyData, salesReps, loading, saleColorMap, onSelect }) => {
  // Tập các sale xuất hiện trong lịch (đã lọc) — fallback là danh sách master
  const activeRepIds = new Set();
  Object.values(weeklyData).forEach((entries) =>
    entries.forEach((e) => activeRepIds.add(e.salesRep.id))
  );
  const displayReps = salesReps.filter((s) => activeRepIds.has(s.id));

  if (loading) return <div className="cal-empty-state">Đang tải...</div>;
  if (displayReps.length === 0)
    return <div className="cal-empty-state">Không có phân luồng nào trong tuần</div>;

  return (
    <div className="calendar-grid-card">
      <div className="cal-matrix-table-wrap">
        <table className="cal-matrix-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              {[1, 2, 3, 4, 5, 6, 7].map((wd) => (
                <th key={wd}>{WEEKDAY_LABELS[wd]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayReps.map((rep) => (
              <tr key={rep.id}>
                <td className="cal-matrix-rep-cell">
                  <span
                    className="cal-rep-dot"
                    style={{ backgroundColor: getSaleColor(rep.id, saleColorMap).border }}
                  />
                  {rep.fullName}
                </td>
                {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
                  const entries = (weeklyData[wd] || []).filter((e) => e.salesRep.id === rep.id);
                  return (
                    <td key={wd}>
                      {entries.map((entry) => {
                        const color = getSaleColor(rep.id, saleColorMap);
                        return (
                          <button
                            type="button"
                            key={`${entry.routeId}-${wd}`}
                            className="cal-route-pill compact"
                            style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                            onClick={() => onSelect(wd, entry)}
                          >
                            {entry.routeName} · {entry.stops.length} CH
                          </button>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============ PANEL CHI TIẾT TUYẾN ============ */
const DetailPanel = ({ detail, saleColorMap, onClose, onDelete }) => {
  const { weekday, entry } = detail;
  const color = getSaleColor(entry.salesRep.id, saleColorMap);
  return (
    <>
      <div className="cal-panel-backdrop" onClick={onClose} />
      <div className="cal-detail-panel">
        <div className="cal-detail-header" style={{ backgroundColor: color.bg, color: color.text }}>
          <div>
            <h3>{entry.routeName}</h3>
            <span>
              {entry.salesRep.fullName} · {WEEKDAY_LABELS[weekday]}
            </span>
          </div>
          <button type="button" onClick={onClose} className="cal-panel-close">
            <X size={16} />
          </button>
        </div>

        <div className="cal-detail-body">
          <p className="cal-detail-count">{entry.stops.length} cửa hàng cần ghé (theo thứ tự)</p>
          <ol className="cal-stop-list">
            {entry.stops.map((s) => (
              <li key={s.id}>
                <strong>{s.retailer.name}</strong>
                <span className="cal-stop-code">{s.retailer.code}</span>
                <span className="cal-stop-address">{s.retailer.address}</span>
                {s.retailer.phone && <span className="cal-stop-phone">☎ {s.retailer.phone}</span>}
              </li>
            ))}
          </ol>
          <button type="button" className="cal-delete-btn" onClick={onDelete}>
            <Trash2 size={14} />
            Xóa tuyến
          </button>
        </div>
      </div>
    </>
  );
};

/* ============ FORM TẠO / SỬA TUYẾN ============ */
const RouteForm = ({ form, routes, salesReps, retailers, onPickRoute, onClose, onSaved }) => {
  // Bước chọn tuyến cần sửa
  if (form.__pick) {
    return (
      <>
        <div className="cal-panel-backdrop" onClick={onClose} />
        <div className="cal-detail-panel cal-form-panel">
          <div className="cal-detail-header cal-form-header">
            <div>
              <h3>Chọn tuyến cần sửa</h3>
              <span>{routes.length} tuyến hiện có</span>
            </div>
            <button type="button" onClick={onClose} className="cal-panel-close">
              <X size={16} />
            </button>
          </div>
          <div className="cal-detail-body">
            <ul className="cal-pick-list">
              {routes.map((r) => (
                <li key={r.id}>
                  <button type="button" className="cal-pick-item" onClick={() => onPickRoute(r)}>
                    <strong>{r.name}</strong>
                    <span>{r.salesRep?.fullName} · {r.stops.length} điểm ghé</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>
    );
  }

  const isEdit = Boolean(form.id);
  const [name, setName] = useState(form.name || '');
  const [salesRepId, setSalesRepId] = useState(form.salesRepId || '');
  const [stops, setStops] = useState(form.stops || []);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const addStop = () => {
    if (retailers.length === 0) return;
    setStops((prev) => [
      ...prev,
      { retailerId: retailers[0].id, weekday: 1, visitOrder: prev.length + 1 },
    ]);
  };

  const updateStop = (idx, field, value) => {
    setStops((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const removeStop = (idx) => {
    setStops((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, visitOrder: i + 1 })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !salesRepId) {
      setFormError('Cần nhập tên tuyến và chọn nhân viên bán hàng');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        salesRepId,
        stops: stops.map((s, i) => ({
          retailerId: s.retailerId,
          weekday: Number(s.weekday),
          visitOrder: i + 1,
        })),
      };
      if (isEdit) {
        await updateSalesRoute(form.id, payload);
      } else {
        await createSalesRoute(payload);
      }
      onSaved();
    } catch (err) {
      setFormError(err.message || 'Không thể lưu tuyến');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="cal-panel-backdrop" onClick={onClose} />
      <form className="cal-detail-panel cal-form-panel" onSubmit={handleSubmit}>
        <div className="cal-detail-header cal-form-header">
          <div>
            <h3>{isEdit ? 'Sửa tuyến bán hàng' : 'Thêm tuyến bán hàng'}</h3>
            <span>Chọn NVBH và các cửa hàng cần ghé theo thứ trong tuần</span>
          </div>
          <button type="button" onClick={onClose} className="cal-panel-close">
            <X size={16} />
          </button>
        </div>

        <div className="cal-detail-body">
          {formError && <div className="cal-form-error">{formError}</div>}

          <label className="cal-form-label">Tên tuyến *</label>
          <input
            type="text"
            className="cal-form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Tuyến Quận 1 - Thứ 2, 5"
          />

          <label className="cal-form-label">Nhân viên bán hàng *</label>
          <select
            className="cal-form-input"
            value={salesRepId}
            onChange={(e) => setSalesRepId(e.target.value)}
          >
            <option value="">— Chọn NVBH —</option>
            {salesReps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.username})
              </option>
            ))}
          </select>

          <div className="cal-form-stops-header">
            <label className="cal-form-label">Điểm ghé ({stops.length})</label>
            <button type="button" className="cal-add-stop-btn" onClick={addStop}>
              <Plus size={13} /> Thêm điểm ghé
            </button>
          </div>

          {stops.length === 0 && (
            <p className="cal-hint-text">Chưa có điểm ghé nào. Thêm cửa hàng vào tuyến.</p>
          )}

          {stops.map((stop, idx) => (
            <div className="cal-stop-row" key={idx}>
              <span className="cal-stop-order">{idx + 1}</span>
              <select
                className="cal-form-input cal-stop-retailer"
                value={stop.retailerId}
                onChange={(e) => updateStop(idx, 'retailerId', e.target.value)}
              >
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
              <select
                className="cal-form-input cal-stop-weekday"
                value={stop.weekday}
                onChange={(e) => updateStop(idx, 'weekday', Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((wd) => (
                  <option key={wd} value={wd}>
                    {WEEKDAY_LABELS[wd]}
                  </option>
                ))}
              </select>
              <button type="button" className="cal-remove-stop-btn" onClick={() => removeStop(idx)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <div className="cal-form-actions">
            <button type="button" className="cal-cancel-btn" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="cal-save-btn" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu tuyến'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default JobCardCalendar;
