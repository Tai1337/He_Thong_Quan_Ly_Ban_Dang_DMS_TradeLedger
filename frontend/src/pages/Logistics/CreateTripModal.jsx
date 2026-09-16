import { useState, useEffect } from 'react';
import { X, Truck, Calendar, MapPin, User, Scale, FileText } from 'lucide-react';
import { getWarehouses, getSalesReps, createDeliveryTrip, dispatchOrdersToTrip } from '../../services/api';
import './CreateTripModal.css';

export default function CreateTripModal({ isOpen, onClose, onSuccess, initialOrderIds = [] }) {
  const [warehouses, setWarehouses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    warehouseId: '',
    driverId: '',
    licensePlate: '',
    maxWeightKg: 1500,
    expectedDeliveryDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        getWarehouses(1),
        getSalesReps(1)
      ]).then(([whs, reps]) => {
        setWarehouses(whs || []);
        setDrivers(reps || []);
        if (whs && whs.length > 0 && !formData.warehouseId) {
          setFormData(prev => ({ ...prev, warehouseId: whs[0].id }));
        }
      }).catch(err => {
        console.error('Lỗi nạp danh mục:', err);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const presetWeights = [1000, 1500, 2000, 2500, 5000];

  return (
    <div className="modal-backdrop-trip" onClick={onClose}>
      <div className="modal-trip-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-trip-header">
          <div className="modal-trip-header-title">
            <Truck size={20} color="#2563eb" />
            <h3>Khởi Tạo Chuyến Xe Giao Hàng</h3>
          </div>
          <button type="button" className="btn-close-trip-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-trip-body">
            {error && <div className="trip-error-alert">{error}</div>}

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
                  Tài Xế Phụ Trách
                </label>
                <select
                  className="trip-form-select"
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                >
                  <option value="">-- Chưa chỉ định tài xế --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.fullName || d.username}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="trip-form-row">
              <div className="trip-form-group">
                <label>
                  Biển Số Xe Tải <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="trip-form-input"
                  placeholder="VD: 59C-912.34"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  required
                />
              </div>

              <div className="trip-form-group">
                <label>
                  Ngày Hẹn Giao
                </label>
                <input
                  type="date"
                  className="trip-form-input"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="trip-form-group">
              <label>
                Tải Trọng Tối Đa Của Xe (kg) <span className="required">*</span>
              </label>
              <input
                type="number"
                min="100"
                step="50"
                className="trip-form-input"
                value={formData.maxWeightKg}
                onChange={(e) => setFormData({ ...formData, maxWeightKg: e.target.value })}
                required
              />
              <div className="weight-presets-bar">
                <span style={{ fontSize: '11px', color: '#64748b' }}>Chọn nhanh:</span>
                {presetWeights.map(w => (
                  <button
                    key={w}
                    type="button"
                    className={`weight-preset-btn ${Number(formData.maxWeightKg) === w ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, maxWeightKg: w })}
                  >
                    {w >= 1000 ? `${w / 1000} Tấn` : `${w} kg`}
                  </button>
                ))}
              </div>
            </div>

            <div className="trip-form-group">
              <label>Tuyến Đường / Ghi Chú</label>
              <textarea
                rows="2"
                className="trip-form-textarea"
                placeholder="VD: Tuyến giao Quận 7 - Nhà Bè (Khách lẻ & Tạp hóa)"
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
