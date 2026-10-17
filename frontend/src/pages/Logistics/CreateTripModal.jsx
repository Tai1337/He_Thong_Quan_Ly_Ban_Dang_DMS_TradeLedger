import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Truck, 
  Calendar, 
  MapPin, 
  User, 
  Scale, 
  FileText, 
  Search, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Phone,
  ChevronDown
} from 'lucide-react';
import { 
  getWarehouses, 
  getDriverAvailability, 
  createDeliveryTrip, 
  dispatchOrdersToTrip 
} from '../../services/api';
import './CreateTripModal.css';

export default function CreateTripModal({ isOpen, onClose, onSuccess, initialOrderIds = [] }) {
  const [warehouses, setWarehouses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown state cho Driver Selector
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverFilterTab, setDriverFilterTab] = useState('ALL'); // 'ALL' | 'AVAILABLE' | 'BUSY'
  const driverDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    warehouseId: '',
    driverId: '',
    licensePlate: '',
    maxWeightKg: 1500,
    expectedDeliveryDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Load kho hàng và trạng thái tài xế
  const loadData = async (date) => {
    setLoadingDrivers(true);
    try {
      const [whs, driverList] = await Promise.all([
        getWarehouses(1),
        getDriverAvailability(1, date || formData.expectedDeliveryDate)
      ]);
      setWarehouses(whs || []);
      setDrivers(driverList || []);
      if (whs && whs.length > 0 && !formData.warehouseId) {
        setFormData(prev => ({ ...prev, warehouseId: whs[0].id }));
      }
    } catch (err) {
      console.error('Lỗi nạp dữ liệu điều phối:', err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData(formData.expectedDeliveryDate);
    }
  }, [isOpen]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (driverDropdownRef.current && !driverDropdownRef.current.contains(e.target)) {
        setIsDriverDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Tìm tài xế đang được chọn
  const selectedDriver = drivers.find(d => d.id === formData.driverId);

  // Xử lý khi chọn một tài xế
  const handleSelectDriver = (driver) => {
    setFormData(prev => ({
      ...prev,
      driverId: driver.id,
      // Tự động điền biển số xe nếu có
      licensePlate: driver.defaultVehicle?.licensePlate || prev.licensePlate,
      // Tự động điền tải trọng xe nếu có
      maxWeightKg: driver.defaultVehicle?.maxWeightKg || prev.maxWeightKg || 1500,
    }));
    setIsDriverDropdownOpen(false);
    setDriverSearch('');
  };

  // Lọc tài xế theo tab và từ khóa
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = 
      d.fullName?.toLowerCase().includes(driverSearch.toLowerCase()) ||
      d.phone?.includes(driverSearch) ||
      d.defaultVehicle?.licensePlate?.toLowerCase().includes(driverSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (driverFilterTab === 'AVAILABLE') {
      return d.availabilityStatus === 'AVAILABLE';
    }
    if (driverFilterTab === 'BUSY') {
      return d.availabilityStatus !== 'AVAILABLE';
    }
    return true;
  });

  const availableCount = drivers.filter(d => d.availabilityStatus === 'AVAILABLE').length;
  const busyCount = drivers.length - availableCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.warehouseId) {
      setError('Vui lòng chọn Kho xuất hàng');
      return;
    }

    if (!formData.licensePlate || !formData.licensePlate.trim()) {
      setError('Vui lòng nhập Biển số xe tải');
      return;
    }

    if (!formData.maxWeightKg || Number(formData.maxWeightKg) <= 0) {
      setError('Tải trọng xe phải lớn hơn 0 kg');
      return;
    }

    setLoading(true);
    try {
      const res = await createDeliveryTrip({
        distributorId: 1,
        warehouseId: formData.warehouseId,
        driverId: formData.driverId || null,
        licensePlate: formData.licensePlate.trim(),
        maxWeightKg: Number(formData.maxWeightKg),
        expectedDeliveryDate: formData.expectedDeliveryDate,
        notes: formData.notes
      });

      if (initialOrderIds && initialOrderIds.length > 0 && res?.id) {
        try {
          await dispatchOrdersToTrip(res.id, initialOrderIds);
        } catch (dispatchErr) {
          console.error('Lỗi khi xếp đơn vào chuyến xe mới:', dispatchErr);
        }
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo chuyến xe mới');
    } finally {
      setLoading(false);
    }
  };

  const presetWeights = [1000, 1500, 2000, 2500, 3500, 5000];

  const renderDriverBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="driver-status-pill available">
            <span className="status-dot green"></span>
            <span>Rảnh</span>
          </span>
        );
      case 'WAITING_SHIP':
        return (
          <span className="driver-status-pill waiting">
            <span className="status-dot amber"></span>
            <span>Chờ xuất bến</span>
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="driver-status-pill shipping">
            <span className="status-dot red"></span>
            <span>Đang giao hàng</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-backdrop-trip" onClick={onClose}>
      <div className="modal-trip-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-trip-header">
          <div className="modal-trip-header-title">
            <div className="modal-trip-icon-wrap">
              <Truck size={20} color="#2563eb" />
            </div>
            <div>
              <h3>Khởi Tạo Chuyến Xe Giao Hàng</h3>
              <p className="modal-trip-header-sub">
                Điều phối đội xe, kiểm soát tải trọng và theo dõi tài xế khả dụng
              </p>
            </div>
          </div>
          <button type="button" className="btn-close-trip-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-trip-body">
            {error && <div className="trip-error-alert">{error}</div>}

            {/* Hàng 1: Kho xuất hàng & Ngày hẹn giao */}
            <div className="trip-form-row">
              <div className="trip-form-group">
                <label>
                  Kho Xuất Hàng <span className="required">*</span>
                </label>
                <select
                  className="trip-form-select"
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn kho xuất --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>[{w.code}] {w.name}</option>
                  ))}
                </select>
              </div>

              <div className="trip-form-group">
                <label>
                  Ngày Hẹn Giao Hàng <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className="trip-form-input"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => {
                    setFormData({ ...formData, expectedDeliveryDate: e.target.value });
                    loadData(e.target.value);
                  }}
                  required
                />
              </div>
            </div>

            {/* Hàng 2: Selector Tài Xế Thông Minh (UI-UX Pro Max) */}
            <div className="trip-form-group driver-selector-container" ref={driverDropdownRef}>
              <div className="driver-label-row">
                <label>
                  Tài Xế Phụ Trách & Trạng Thái Sẵn Sàng
                </label>
                <span className="driver-quick-summary">
                  <span className="dot-inline green"></span> {availableCount} rảnh
                  <span className="dot-inline red" style={{ marginLeft: 8 }}></span> {busyCount} bận
                </span>
              </div>

              {/* Rich Selector Box */}
              <div 
                className={`driver-custom-picker ${isDriverDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDriverDropdownOpen(!isDriverDropdownOpen)}
              >
                {selectedDriver ? (
                  <div className="picker-selected-content">
                    <div className="picker-driver-avatar">
                      <User size={16} />
                    </div>
                    <div className="picker-driver-info">
                      <div className="picker-name-row">
                        <span className="picker-driver-name">{selectedDriver.fullName}</span>
                        {renderDriverBadge(selectedDriver.availabilityStatus)}
                      </div>
                      <div className="picker-meta-row">
                        {selectedDriver.phone && (
                          <span className="picker-phone">
                            <Phone size={11} /> {selectedDriver.phone}
                          </span>
                        )}
                        {selectedDriver.defaultVehicle?.licensePlate && (
                          <span className="picker-vehicle">
                            <Truck size={11} /> {selectedDriver.defaultVehicle.licensePlate} ({selectedDriver.defaultVehicle.maxWeightKg} kg)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="picker-placeholder">
                    <User size={16} color="#94a3b8" />
                    <span>-- Chọn tài xế phụ trách (Hoặc để trống gán sau) --</span>
                  </div>
                )}
                <ChevronDown size={18} className={`picker-chevron ${isDriverDropdownOpen ? 'rotated' : ''}`} />
              </div>

              {/* Dropdown Menu */}
              {isDriverDropdownOpen && (
                <div className="driver-dropdown-panel">
                  {/* Search bar & Filters */}
                  <div className="driver-dropdown-header">
                    <div className="driver-search-wrap">
                      <Search size={14} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Tìm tên, SĐT, biển số xe..."
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        autoFocus
                      />
                      {driverSearch && (
                        <button type="button" className="btn-clear-search" onClick={() => setDriverSearch('')}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="driver-tabs-bar">
                      <button
                        type="button"
                        className={`driver-tab-btn ${driverFilterTab === 'ALL' ? 'active' : ''}`}
                        onClick={() => setDriverFilterTab('ALL')}
                      >
                        Tất cả ({drivers.length})
                      </button>
                      <button
                        type="button"
                        className={`driver-tab-btn available ${driverFilterTab === 'AVAILABLE' ? 'active' : ''}`}
                        onClick={() => setDriverFilterTab('AVAILABLE')}
                      >
                        🟢 Rảnh ({availableCount})
                      </button>
                      <button
                        type="button"
                        className={`driver-tab-btn busy ${driverFilterTab === 'BUSY' ? 'active' : ''}`}
                        onClick={() => setDriverFilterTab('BUSY')}
                      >
                        🔴 Đang bận ({busyCount})
                      </button>
                    </div>
                  </div>

                  {/* List of Drivers */}
                  <div className="driver-dropdown-list">
                    {/* Tùy chọn bỏ chọn */}
                    <div 
                      className={`driver-dropdown-item ${!formData.driverId ? 'selected' : ''}`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, driverId: '' }));
                        setIsDriverDropdownOpen(false);
                      }}
                    >
                      <div className="driver-item-main">
                        <span className="driver-item-unassigned">-- Chưa chỉ định tài xế (Điều phối sau) --</span>
                      </div>
                      {!formData.driverId && <Check size={16} color="#2563eb" />}
                    </div>

                    {loadingDrivers ? (
                      <div className="driver-dropdown-loading">Đang kiểm tra trạng thái đội xe...</div>
                    ) : filteredDrivers.length === 0 ? (
                      <div className="driver-dropdown-empty">Không tìm thấy tài xế phù hợp</div>
                    ) : (
                      filteredDrivers.map(d => {
                        const isSelected = formData.driverId === d.id;
                        return (
                          <div
                            key={d.id}
                            className={`driver-dropdown-item ${isSelected ? 'selected' : ''} ${d.availabilityStatus !== 'AVAILABLE' ? 'item-busy' : ''}`}
                            onClick={() => handleSelectDriver(d)}
                          >
                            <div className="driver-item-avatar-wrap">
                              <User size={15} />
                            </div>
                            <div className="driver-item-main">
                              <div className="driver-item-top">
                                <span className="driver-item-name">{d.fullName}</span>
                                {renderDriverBadge(d.availabilityStatus)}
                              </div>
                              <div className="driver-item-sub">
                                {d.phone && <span>{d.phone}</span>}
                                {d.defaultVehicle?.licensePlate && (
                                  <span>• Xe: {d.defaultVehicle.licensePlate} ({d.defaultVehicle.maxWeightKg} kg)</span>
                                )}
                              </div>
                              {/* Thông tin chuyến xe nếu đang bận */}
                              {d.activeTrip && (
                                <div className="driver-item-trip-alert">
                                  <span>
                                    Chuyến <strong>{d.activeTrip.tripCode}</strong>: {d.activeTrip.orderCount} đơn hàng ({d.activeTrip.currentWeightKg} / {d.activeTrip.maxWeightKg} kg)
                                  </span>
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <div className="driver-item-check">
                                <Check size={16} color="#2563eb" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Alert thông báo nếu chọn tài xế đang bận */}
              {selectedDriver && selectedDriver.availabilityStatus !== 'AVAILABLE' && (
                <div className="driver-collision-warning">
                  <AlertCircle size={15} />
                  <div className="collision-text">
                    <strong>Tài xế đang bận chuyến [{selectedDriver.activeTrip?.tripCode}]:</strong> Hiện đang phụ trách {selectedDriver.activeTrip?.orderCount} đơn hàng ({selectedDriver.activeTrip?.currentWeightKg} kg). Bạn vẫn có thể khởi tạo chuyến để lên lịch cho ca sau của tài xế này.
                  </div>
                </div>
              )}
            </div>

            {/* Hàng 3: Biển số xe & Tải trọng tối đa */}
            <div className="trip-form-row">
              <div className="trip-form-group">
                <label>
                  Biển Số Xe Tải <span className="required">*</span>
                  {selectedDriver?.defaultVehicle?.licensePlate && (
                    <span className="auto-fill-hint">(Tự động theo tài xế)</span>
                  )}
                </label>
                <div className="input-with-icon">
                  <Truck size={15} className="input-icon" />
                  <input
                    type="text"
                    className="trip-form-input with-icon"
                    placeholder="VD: 59C-912.34"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="trip-form-group">
                <label>
                  Tải Trọng Tối Đa Của Xe (kg) <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <Scale size={15} className="input-icon" />
                  <input
                    type="number"
                    min="100"
                    step="50"
                    className="trip-form-input with-icon"
                    value={formData.maxWeightKg}
                    onChange={(e) => setFormData({ ...formData, maxWeightKg: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Thanh Presets Tải trọng xe nhanh */}
            <div className="weight-presets-bar">
              <span className="presets-label">Gợi ý tải trọng:</span>
              <div className="presets-buttons">
                {presetWeights.map(w => (
                  <button
                    key={w}
                    type="button"
                    className={`weight-preset-btn ${Number(formData.maxWeightKg) === w ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, maxWeightKg: w })}
                  >
                    {w >= 1000 ? `${(w / 1000).toFixed(1).replace('.0', '')} Tấn` : `${w} kg`}
                  </button>
                ))}
              </div>
            </div>

            {/* Hàng 4: Ghi chú / Tuyến đường */}
            <div className="trip-form-group">
              <label>Tuyến Đường / Ghi Chú Chuyến Xe</label>
              <textarea
                rows="2"
                className="trip-form-textarea"
                placeholder="VD: Tuyến Bình Thạnh - Gò Vấp (Giao tạp hóa buổi sáng)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-trip-footer">
            <button type="button" className="btn-trip-cancel" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn-trip-submit" disabled={loading}>
              <Truck size={16} />
              <span>{loading ? 'Đang tạo...' : 'Khởi Tạo Chuyến Xe'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
