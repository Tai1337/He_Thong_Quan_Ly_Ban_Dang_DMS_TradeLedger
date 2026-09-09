import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { 
  getRetailers, 
  getWarehouses, 
  getProducts, 
  createSalesOrder 
} from '../../../services/api';
import './CreateSalesOrderModal.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const CreateSalesOrderModal = ({ isOpen, onClose, onOrderCreated }) => {
  const [retailers, setRetailers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Form State
  const [retailerId, setRetailerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [orderType, setOrderType] = useState('LATER');
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  // Line Items
  const [items, setItems] = useState([
    { productId: '', sku: '', name: '', unit: '', quantity: 1, unitPrice: 0, isPromotion: false }
  ]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError('');
      Promise.all([
        getRetailers({ distributorId: 1 }),
        getWarehouses(1),
        getProducts()
      ]).then(([retRes, whRes, prodRes]) => {
        setRetailers(retRes || []);
        setWarehouses(whRes || []);
        setProducts(prodRes || []);
        if (whRes && whRes.length > 0) setWarehouseId(whRes[0].id);
        if (retRes && retRes.length > 0) setRetailerId(retRes[0].id);
      }).catch(err => {
        setError(err.message || 'Lỗi tải danh mục');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  // Thêm dòng sản phẩm
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { productId: '', sku: '', name: '', unit: '', quantity: 1, unitPrice: 0, isPromotion: false }
    ]);
  };

  // Xoá dòng sản phẩm
  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert('Đơn hàng phải có ít nhất 1 sản phẩm');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Thay đổi sản phẩm trong dòng
  const handleProductChange = (index, prodId) => {
    const p = products.find(prod => prod.id === prodId);
    setItems(prev => {
      const copy = [...prev];
      if (p) {
        copy[index] = {
          ...copy[index],
          productId: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit || 'THÙNG',
          unitPrice: p.basePrice || 0
        };
      } else {
        copy[index] = {
          ...copy[index],
          productId: '',
          sku: '',
          name: '',
          unit: '',
          unitPrice: 0
        };
      }
      return copy;
    });
  };

  // Thay đổi số lượng hoặc giá
  const handleItemFieldChange = (index, field, val) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Tính tổng tiền
  const totalAmount = items.reduce((sum, it) => {
    if (!it.productId || it.isPromotion) return sum;
    return sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
  }, 0);

  // Submit đơn hàng
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!retailerId) {
      setError('Vui lòng chọn khách hàng / đại lý');
      return;
    }
    if (!warehouseId) {
      setError('Vui lòng chọn kho xuất hàng');
      return;
    }

    const validItems = items.filter(it => it.productId && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      setError('Vui lòng chọn ít nhất 1 sản phẩm và nhập số lượng hợp lệ');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        distributorId: 1,
        retailerId,
        warehouseId,
        orderType,
        expectedDate,
        notes,
        items: validItems.map(it => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          isPromotion: it.isPromotion
        }))
      };

      const res = await createSalesOrder(payload);
      if (onOrderCreated) {
        onOrderCreated(res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="create-order-modal-container">
        {/* Header */}
        <div className="create-order-header">
          <div>
            <h3>Tạo Đơn Đặt Hàng Bán (Biểu mẫu BH_BM1)</h3>
            <p className="create-order-sub">Đơn hàng mới sẽ ở trạng thái "Chờ xác nhận" (PENDING)</p>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="create-order-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-order-form">
          {/* General Information Grid */}
          <div className="create-order-grid">
            <div className="form-group">
              <label>Khách hàng / Đại lý <span style={{ color: 'red' }}>*</span></label>
              <select 
                className="modal-select"
                value={retailerId}
                onChange={(e) => setRetailerId(e.target.value)}
                required
              >
                <option value="">-- Chọn khách hàng / đại lý --</option>
                {retailers.map(r => (
                  <option key={r.id} value={r.id}>
                    [{r.code}] {r.name} - {r.address}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Kho xuất hàng <span style={{ color: 'red' }}>*</span></label>
              <select 
                className="modal-select"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">-- Chọn kho xuất --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    [{w.code}] {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Loại đơn hàng</label>
              <select 
                className="modal-select"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="LATER">Giao sau (LATER)</option>
                <option value="IMMEDIATE">Giao ngay (IMMEDIATE)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Ngày giao dự kiến</label>
              <input 
                type="date"
                className="modal-input"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '10px' }}>
            <label>Ghi chú đơn hàng</label>
            <input 
              type="text"
              className="modal-input"
              placeholder="Ghi chú giao hàng, yêu cầu đóng gói..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Line items table */}
          <div className="create-items-section">
            <div className="items-header-bar">
              <h4>Danh mục sản phẩm đặt hàng</h4>
              <button 
                type="button" 
                className="btn-add-item" 
                onClick={handleAddItem}
              >
                <Plus size={14} /> Thêm sản phẩm
              </button>
            </div>

            <div className="create-table-wrap">
              <table className="create-order-table">
                <thead>
                  <tr>
                    <th style={{ width: '38%' }}>Sản phẩm <span style={{ color: 'red' }}>*</span></th>
                    <th style={{ width: '12%' }}>ĐVT</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Số lượng <span style={{ color: 'red' }}>*</span></th>
                    <th style={{ width: '18%', textAlign: 'right' }}>Đơn giá (VNĐ)</th>
                    <th style={{ width: '17%', textAlign: 'right' }}>Thành tiền (VNĐ)</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>KM</th>
                    <th style={{ width: '5%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => {
                    const lineTotal = row.isPromotion ? 0 : (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
                    return (
                      <tr key={idx}>
                        <td>
                          <select 
                            className="item-select"
                            value={row.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            required
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="item-readonly-input" 
                            value={row.unit} 
                            readOnly 
                            placeholder="ĐVT"
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="item-qty-input" 
                            min="1" 
                            value={row.quantity}
                            onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input 
                            type="number" 
                            className="item-qty-input" 
                            value={row.unitPrice}
                            onChange={(e) => handleItemFieldChange(idx, 'unitPrice', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(lineTotal)} đ
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={row.isPromotion}
                            onChange={(e) => handleItemFieldChange(idx, 'isPromotion', e.target.checked)}
                            title="Hàng khuyến mãi"
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn-del-item" 
                            onClick={() => handleRemoveItem(idx)}
                            title="Xoá dòng"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer & Total */}
          <div className="create-order-footer">
            <div className="create-order-summary">
              <span className="summary-label">Tổng tiền đơn hàng:</span>
              <span className="summary-val">{formatCurrency(totalAmount)} đ</span>
            </div>

            <div className="create-order-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                Huỷ bỏ
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || loading}>
                <CheckCircle2 size={16} /> {submitting ? 'Đang lưu...' : 'Lưu Đơn Hàng (BH_BM1)'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSalesOrderModal;
