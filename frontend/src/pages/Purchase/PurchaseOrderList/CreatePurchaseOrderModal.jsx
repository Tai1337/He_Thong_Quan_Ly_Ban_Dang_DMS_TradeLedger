import { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  FileText, 
  Send, 
  AlertCircle,
  Package
} from 'lucide-react';
import { 
  getWarehouses, 
  getSuppliers, 
  getProducts, 
  createPurchaseOrder, 
  updatePurchaseOrder,
  sendPurchaseOrderToSupplier 
} from '../../../services/api';
import './CreatePurchaseOrderModal.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const CreatePurchaseOrderModal = ({ isOpen, onClose, onSuccess, initialOrder = null }) => {
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [productList, setProductList] = useState([]);

  // Form states
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load master data khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    const loadData = async () => {
      try {
        const [whRes, supRes, prdRes] = await Promise.all([
          getWarehouses(1),
          getSuppliers(),
          getProducts()
        ]);
        setWarehouses(whRes || []);
        setSuppliers(supRes || []);
        setProductList(prdRes || []);

        if (initialOrder) {
          // Chế độ chỉnh sửa
          setWarehouseId(initialOrder.warehouseId || '');
          setSupplierId(initialOrder.supplierId || '');
          setExpectedDate(initialOrder.expectedDate || '');
          setNotes(initialOrder.notes || '');
          setItems((initialOrder.items || []).map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            product: i.product
          })));
        } else {
          // Tạo mới mặc định
          if (whRes && whRes.length > 0) setWarehouseId(whRes[0].id);
          if (supRes && supRes.length > 0) setSupplierId(supRes[0].id);
          
          // Mặc định ngày mai
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setExpectedDate(tomorrow.toISOString().slice(0, 10));
          
          setNotes('');
          setItems([]);
        }
      } catch (err) {
        setError(err.message || 'Lỗi khi nạp dữ liệu danh mục');
      }
    };

    loadData();
  }, [isOpen, initialOrder]);

  if (!isOpen) return null;

  // Thêm một dòng sản phẩm mới
  const handleAddLine = () => {
    if (productList.length === 0) return;
    const defaultProduct = productList[0];
    setItems(prev => [
      ...prev,
      {
        productId: defaultProduct.id,
        quantity: 10,
        unitPrice: defaultProduct.basePrice || 0,
        product: defaultProduct
      }
    ]);
  };

  // Cập nhật sản phẩm được chọn trên dòng
  const handleProductChange = (index, selectedProductId) => {
    const prd = productList.find(p => p.id === selectedProductId);
    setItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId: selectedProductId,
        unitPrice: prd ? prd.basePrice : next[index].unitPrice,
        product: prd || null
      };
      return next;
    });
  };

  // Cập nhật số lượng
  const handleQuantityChange = (index, val) => {
    const qty = parseFloat(val) || 0;
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: qty };
      return next;
    });
  };

  // Cập nhật đơn giá
  const handleUnitPriceChange = (index, val) => {
    const price = parseFloat(val) || 0;
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], unitPrice: price };
      return next;
    });
  };

  // Xoá một dòng
  const handleRemoveLine = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Tính tổng
  const totalQuantity = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const totalAmount = items.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0);

  // Submit xử lý (Lưu nháp hoặc Lưu & Gửi)
  const handleSubmit = async (actionType = 'SAVE_DRAFT') => {
    setError('');
    if (!warehouseId) {
      setError('Vui lòng chọn Kho nhận hàng');
      return;
    }
    if (items.length === 0) {
      setError('Đơn hàng phải có ít nhất 1 sản phẩm');
      return;
    }

    // Validate từng dòng
    for (let i = 0; i < items.length; i++) {
      if (!items[i].productId) {
        setError(`Dòng ${i + 1}: Vui lòng chọn sản phẩm`);
        return;
      }
      if (items[i].quantity <= 0) {
        setError(`Dòng ${i + 1}: Số lượng đặt mua phải lớn hơn 0`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        distributorId: 1,
        warehouseId,
        supplierId: supplierId || null,
        expectedDate: expectedDate || null,
        notes: notes.trim(),
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      };

      let savedOrder;
      if (initialOrder) {
        savedOrder = await updatePurchaseOrder(initialOrder.id, payload);
      } else {
        savedOrder = await createPurchaseOrder(payload);
      }

      // Nếu chọn "Lưu & Gửi NCC"
      if (actionType === 'SEND') {
        await sendPurchaseOrderToSupplier(savedOrder.id, {
          distributorId: 1,
          notes: 'Gửi đơn hàng trực tiếp từ màn hình lập PO'
        });
      }

      onSuccess(savedOrder);
      onClose();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi lưu đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="po-create-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2>{initialOrder ? `Chỉnh sửa Đơn đặt hàng mua: ${initialOrder.poCode}` : 'Lập Đơn đặt hàng mua mới (PO)'}</h2>
              <p className="modal-subtitle">Nhập thông tin nhà cung cấp, kho nhận và danh sách mặt hàng đặt mua</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Form thông tin chung */}
          <div className="form-grid-3">
            <div className="form-field">
              <label>Nhà cung cấp (NCC)</label>
              <select 
                value={supplierId} 
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">-- Chọn Nhà cung cấp --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Kho nhận hàng <span className="req">*</span></label>
              <select 
                value={warehouseId} 
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Ngày giao dự kiến</label>
              <input 
                type="date" 
                value={expectedDate} 
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Ghi chú đơn hàng</label>
            <textarea 
              rows={2}
              placeholder="Nhập ghi chú hoặc điều kiện giao hàng..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Section Sản phẩm */}
          <div>
            <div className="items-section-header">
              <div className="items-section-title">
                <Package size={18} color="#2563eb" />
                <span>Danh sách sản phẩm đặt mua ({items.length} mặt hàng)</span>
              </div>
              <button type="button" className="add-sku-btn" onClick={handleAddLine}>
                <Plus size={16} />
                <span>+ Thêm mặt hàng</span>
              </button>
            </div>

            <div className="po-items-table-wrapper" style={{ marginTop: '12px' }}>
              <table className="po-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>STT</th>
                    <th style={{ width: '300px' }}>Sản phẩm (SKU)</th>
                    <th style={{ width: '80px' }}>ĐVT</th>
                    <th style={{ width: '120px' }}>Số lượng đặt</th>
                    <th style={{ width: '150px' }}>Đơn giá (VNĐ)</th>
                    <th style={{ width: '150px' }}>Thành tiền (VNĐ)</th>
                    <th style={{ width: '50px', textAlign: 'center' }}>Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        Chưa có sản phẩm nào được chọn. Nhấn <strong>"+ Thêm mặt hàng"</strong> để bắt đầu.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                      return (
                        <tr key={idx}>
                          <td style={{ color: '#64748b', fontWeight: 500 }}>{idx + 1}</td>
                          <td>
                            <select 
                              value={item.productId} 
                              onChange={(e) => handleProductChange(idx, e.target.value)}
                            >
                              {productList.map(p => (
                                <option key={p.id} value={p.id}>
                                  [{p.sku}] {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ color: '#475569' }}>
                            {item.product?.unit || 'Thùng'}
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min="1" 
                              step="1"
                              value={item.quantity} 
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              min="0" 
                              step="1000"
                              value={item.unitPrice} 
                              onChange={(e) => handleUnitPriceChange(idx, e.target.value)}
                            />
                          </td>
                          <td style={{ fontWeight: 600, color: '#1e293b' }}>
                            {formatCurrency(lineTotal)} đ
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              className="btn-remove-line" 
                              onClick={() => handleRemoveLine(idx)}
                              title="Xoá dòng"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tổng kết số lượng & tiền */}
          {items.length > 0 && (
            <div className="po-total-summary-card">
              <div className="po-summary-left">
                Tổng cộng: <strong>{items.length}</strong> mặt hàng | Tổng số lượng: <strong>{totalQuantity}</strong>
              </div>
              <div className="po-summary-right">
                <span className="po-summary-label">Tổng giá trị đơn đặt:</span>
                <span className="po-summary-value">{formatCurrency(totalAmount)} VNĐ</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
            Huỷ bỏ
          </button>
          <button 
            type="button" 
            className="btn-save-draft" 
            onClick={() => handleSubmit('SAVE_DRAFT')}
            disabled={loading}
          >
            <FileText size={16} />
            <span>{loading ? 'Đang lưu...' : 'Lưu Nháp'}</span>
          </button>
          <button 
            type="button" 
            className="btn-save-send" 
            onClick={() => handleSubmit('SEND')}
            disabled={loading}
          >
            <Send size={16} />
            <span>{loading ? 'Đang xử lý...' : 'Lưu & Gửi NCC'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchaseOrderModal;
