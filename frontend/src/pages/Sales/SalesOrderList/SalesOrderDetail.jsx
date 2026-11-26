import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building2, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  Printer, 
  Check, 
  X, 
  PackageCheck,
  Phone,
  MapPin,
  FileText,
  Edit3,
  Save,
  AlertCircle,
  Plus,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { 
  getSalesOrderById, 
  confirmSalesOrder, 
  cancelSalesOrder, 
  assignTripSalesOrder, 
  confirmDeliverySalesOrder, 
  closeSalesOrder,
  getDeliveryTrips,
  updateSalesOrderItemQty,
  addSalesOrderItem,
  removeSalesOrderItem,
  getProducts
} from '../../../services/api';
import { MiniDeliveryMap } from '../../../components/Map/DeliveryMap';
import TripDispatchConsoleModal from '../../Logistics/TripDispatchConsoleModal';
import CreateTripModal from '../../Logistics/CreateTripModal';
import TripReportPrintModal from '../../Logistics/TripReportPrintModal';
import { useNotification } from '../../../components/Common/NotificationProvider';
import DmsDocumentShell from '../../../components/DmsUi/DmsDocumentShell';
import DmsSectionPanel from '../../../components/DmsUi/DmsSectionPanel';
import { numberToVietnameseWords } from '../../../utils/chartFormatters';
import './SalesOrderDetail.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const STATUS_LABELS = {
  PENDING: 'Đã gửi đơn',
  ALLOCATED: 'Chờ giao',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  PAID: 'Đã đóng',
  CANCELLED: 'Đã huỷ'
};

const SalesOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useNotification();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [trips, setTrips] = useState([]);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(true);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isDispatchConsoleOpen, setIsDispatchConsoleOpen] = useState(false);
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [isRpt004PrintOpen, setIsRpt004PrintOpen] = useState(false);

  // Sửa số lượng sản phẩm trong đơn
  const [editingItemId, setEditingItemId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // Chế độ chỉnh sửa đơn hàng toàn diện (PENDING / SUBMITTED)
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [addProductQty, setAddProductQty] = useState(1);

  const loadOrderDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSalesOrderById(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
    getDeliveryTrips({ distributorId: 1 }).then(setTrips).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // Lifecycle Actions
  const handleConfirmAction = async () => {
    setActionLoading(true);
    try {
      const res = await confirmSalesOrder(id);
      setSuccessMsg(res.message || 'Xác nhận đơn hàng và phân bổ lô FEFO thành công');
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi xác nhận đơn hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason || !cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do huỷ đơn hàng trước khi bấm Xác nhận!');
      return;
    }
    setCancelError('');
    setActionLoading(true);
    try {
      const res = await cancelSalesOrder(id, { reason: cancelReason.trim() });
      setSuccessMsg(res.message || 'Huỷ đơn hàng thành công');
      setCancelModalOpen(false);
      setCancelReason('');
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi huỷ đơn');
    } finally {
      setActionLoading(false);
    }
  };

  // Logic Sửa số lượng sản phẩm
  const handleStartEditItem = (item) => {
    setEditingItemId(item.id);
    setEditQty(item.quantity);
    setEditReason('Kế toán/NPP điều chỉnh số lượng đơn hàng');
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditQty('');
    setEditReason('');
  };

  const handleSaveEditItem = async (item) => {
    const num = Number(editQty);
    if (isNaN(num) || num < 0) {
      alert('Số lượng không hợp lệ (phải từ 0 trở lên)');
      return;
    }
    if (num === 0) {
      const confirmZero = await confirm({
        title: 'Cắt giảm sản phẩm về 0',
        message: `Bạn có chắc chắn muốn cắt giảm số lượng sản phẩm "${item.productName}" về 0 (do hết hàng)?`,
        confirmText: 'Xác nhận cắt giảm',
        variant: 'warning'
      });
      if (!confirmZero) return;
    }
    setSavingItem(true);
    try {
      await updateSalesOrderItemQty(id, item.id, {
        newQuantity: num,
        reason: editReason || (num === 0 ? 'Cắt giảm về 0 do hết hàng' : 'Điều chỉnh số lượng đơn hàng')
      });
      setSuccessMsg(`Đã cập nhật số lượng sản phẩm [${item.productSku}] thành ${num}`);
      setEditingItemId(null);
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật số lượng');
    } finally {
      setSavingItem(false);
    }
  };

  // --- Chế độ chỉnh sửa đơn hàng (cho PENDING, SUBMITTED hoặc ALLOCATED chưa gán chuyến xe) ---
  const canEditOrder = order && 
    (order.status === 'PENDING' || order.status === 'SUBMITTED' || order.status === 'ALLOCATED') &&
    !order.deliveryTrip &&
    !order.deliveryTripId;

  const handleStartEditOrder = async () => {
    setIsEditingOrder(true);
    setEditItems(
      (order.items || []).map((it) => ({
        id: it.id,
        productId: it.productId,
        productSku: it.productSku,
        productName: it.productName,
        unit: it.unit,
        quantity: Number(it.quantity),
        originalQuantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        totalAmount: Number(it.totalAmount),
        allocations: it.allocations || [],
        isShortage: it.isShortage,
        availableStock: it.availableStock,
        isNew: false,
        isDeleted: false
      }))
    );

    if (availableProducts.length === 0) {
      try {
        const prodRes = await getProducts();
        setAvailableProducts(prodRes.data || prodRes || []);
      } catch (err) {
        console.error('Lỗi tải danh mục sản phẩm:', err);
      }
    }
  };

  const handleCancelEditOrder = () => {
    setIsEditingOrder(false);
    setEditItems([]);
    setShowAddProductModal(false);
  };

  const handleItemQtyChange = (idx, newQtyStr) => {
    const val = Number(newQtyStr);
    setEditItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      const safeQty = isNaN(val) || val < 0 ? 0 : val;
      item.quantity = safeQty;
      item.totalAmount = safeQty * item.unitPrice;
      item.isDeleted = safeQty === 0;
      updated[idx] = item;
      return updated;
    });
  };

  const handleItemRemove = (idx) => {
    setEditItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      if (item.isNew) {
        return updated.filter((_, i) => i !== idx);
      } else {
        item.quantity = 0;
        item.isDeleted = true;
        item.totalAmount = 0;
        updated[idx] = item;
        return updated;
      }
    });
  };

  const handleAddProduct = () => {
    if (!selectedProductToAdd) {
      alert('Vui lòng chọn sản phẩm cần thêm');
      return;
    }
    const qty = Number(addProductQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Số lượng sản phẩm phải lớn hơn 0');
      return;
    }

    const prod = availableProducts.find(p => p.id?.toString() === selectedProductToAdd.toString());
    if (!prod) {
      alert('Không tìm thấy thông tin sản phẩm đã chọn');
      return;
    }

    const existingIdx = editItems.findIndex(it => 
      !it.isDeleted && (it.productId?.toString() === prod.id?.toString() || it.productSku === prod.sku)
    );

    if (existingIdx !== -1) {
      setEditItems(prev => {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        updated[existingIdx].totalAmount = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
        updated[existingIdx].isDeleted = false;
        return updated;
      });
    } else {
      const price = Number(prod.basePrice || prod.price || 0);
      setEditItems(prev => [
        ...prev,
        {
          id: `temp_${Date.now()}`,
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          unit: prod.unit || 'Thùng',
          quantity: qty,
          originalQuantity: 0,
          unitPrice: price,
          totalAmount: qty * price,
          allocations: [],
          isShortage: false,
          availableStock: 0,
          isNew: true,
          isDeleted: false
        }
      ]);
    }

    setShowAddProductModal(false);
    setSelectedProductToAdd('');
    setAddProductQty(1);
  };

  const handleSaveOrderChanges = async () => {
    const activeItems = editItems.filter(it => !it.isDeleted && it.quantity > 0);
    if (activeItems.length === 0) {
      alert('Đơn hàng phải có ít nhất 1 sản phẩm. Không thể xoá tất cả sản phẩm khỏi đơn!');
      return;
    }

    setSavingOrder(true);
    try {
      // 1. Thêm các sản phẩm mới trước
      for (const it of editItems) {
        if (it.isNew && !it.isDeleted && it.quantity > 0) {
          await addSalesOrderItem(id, {
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice
          });
        }
      }

      // 2. Cập nhật số lượng các sản phẩm cũ có thay đổi
      for (const it of editItems) {
        if (!it.isNew && !it.isDeleted && it.quantity !== it.originalQuantity) {
          await updateSalesOrderItemQty(id, it.id, {
            newQuantity: it.quantity,
            reason: 'Chỉnh sửa đơn hàng từ giao diện chi tiết'
          });
        }
      }

      // 3. Xoá các sản phẩm bị đánh dấu xoá hoặc SL về 0
      for (const it of editItems) {
        if (!it.isNew && it.isDeleted) {
          await removeSalesOrderItem(id, it.id);
        }
      }

      setSuccessMsg('Đã lưu tất cả thay đổi đơn hàng thành công!');
      setIsEditingOrder(false);
      setEditItems([]);
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu thay đổi đơn hàng');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleTripSubmit = async () => {
    if (!selectedTripId) {
      alert('Vui lòng chọn chuyến xe');
      return;
    }
    setActionLoading(true);
    try {
      const res = await assignTripSalesOrder(id, { tripId: selectedTripId });
      setSuccessMsg(res.message || 'Gán chuyến xe thành công');
      setTripModalOpen(false);
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi gán xe');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverySubmit = async () => {
    setActionLoading(true);
    try {
      const res = await confirmDeliverySalesOrder(id, { isSuccess: deliverySuccess, note: deliveryNote });
      setSuccessMsg(res.message || 'Xác nhận giao hàng thành công');
      setDeliveryModalOpen(false);
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi xác nhận giao hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseAction = async () => {
    setActionLoading(true);
    try {
      const res = await closeSalesOrder(id);
      setSuccessMsg(res.message || 'Đóng đơn hàng thành công');
      await loadOrderDetail();
    } catch (err) {
      alert(err.message || 'Lỗi khi đóng đơn');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="detail-loading">Đang tải thông tin đơn hàng...</div>;
  }

  if (error || !order) {
    return (
      <div className="detail-error-container">
        <AlertTriangle size={32} color="#dc2626" />
        <p>{error || 'Không tìm thấy đơn hàng'}</p>
        <Link to="/sales/sales-orders" className="btn-secondary">
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  const finalPayableAmount =
    order.finalAmount != null
      ? Number(order.finalAmount)
      : Math.max(0, Number(order.totalAmount || 0) - Number(order.totalDiscountAmount || 0));

  const promoBenefits = (isEditingOrder ? editItems : order.items).filter(
    (it) => !it.isDeleted && (it.isPromotion || Number(it.discountAmount) > 0),
  );

  return (
    <div className="sales-order-detail-page">
      {successMsg && (
        <div className="detail-toast-success">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      <div className="so-detail-top-nav">
        <Link to="/sales/sales-orders" className="dms-btn dms-btn-outline">
          <ArrowLeft size={14} /> Quay lại danh sách đơn hàng
        </Link>
        <div className="so-detail-top-badges">
          <span className={`status-badge-lg ${order.status.toLowerCase()}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
      </div>

      {/* Main Document Shell (Image 3 Style: CHI TIẾT ĐƠN ĐẶT HÀNG) */}
      <DmsDocumentShell
        title={`Chi tiết đơn bán hàng • ${order.orderCode}`}
        icon={FileText}
        metaFields={[
          { label: 'Số phiếu', value: order.orderCode, highlight: true },
          {
            label: 'Ngày giao DK',
            value: new Date(order.expectedDate).toLocaleDateString('vi-VN'),
          },
          {
            label: 'Ngày tạo',
            value: new Date(order.createdAt).toLocaleString('vi-VN'),
          },
          {
            label: 'Khách hàng',
            value: `[${order.retailerCode}] ${order.retailerName}`,
            highlight: true,
          },
          { label: 'Điện thoại', value: order.retailerPhone || 'Chưa cập nhật' },
          {
            label: 'Nhân viên QL',
            value: `${order.vnbhName || '—'} ${order.vnbhCode ? `(${order.vnbhCode})` : ''}`,
          },
          { label: 'Địa chỉ', value: order.retailerAddress, fullWidth: true },
          {
            label: 'Kho xuất / Loại',
            value: `${order.warehouseName} (${order.orderType === 'IMMEDIATE' ? 'Giao ngay' : 'Giao sau'})`,
          },
          {
            label: 'Chuyến xe',
            value: order.deliveryTrip ? (
              <Link to={`/logistics/delivery-trips/${order.deliveryTrip.id}`} className="order-trip-link">
                {order.deliveryTrip.tripCode} ({order.deliveryTrip.driverName || 'Chưa gán tài xế'})
              </Link>
            ) : (
              'Chưa điều phối'
            ),
          },
          {
            label: 'Tình trạng',
            value: STATUS_LABELS[order.status] || order.status,
            highlight: true,
          },
        ]}
        footerActions={
          <>
            <button type="button" className="dms-btn dms-btn-outline" onClick={() => window.print()}>
              <Printer size={14} /> In phiếu đơn
            </button>

            {order.deliveryTrip && (
              <>
                <button
                  type="button"
                  className="dms-btn dms-btn-outline"
                  onClick={() => setIsRpt004PrintOpen(true)}
                >
                  <Printer size={14} /> In RPT004
                </button>
                <button
                  type="button"
                  className="dms-btn dms-btn-outline"
                  onClick={() => setIsDispatchConsoleOpen(true)}
                >
                  <SlidersHorizontal size={14} /> Điều phối xe
                </button>
              </>
            )}

            {!isEditingOrder && canEditOrder && (
              <button
                type="button"
                className="dms-btn dms-btn-blue"
                onClick={handleStartEditOrder}
              >
                <Edit3 size={14} /> Sửa đơn hàng
              </button>
            )}

            {isEditingOrder && (
              <>
                <button
                  type="button"
                  className="dms-btn dms-btn-outline"
                  onClick={() => setShowAddProductModal(true)}
                >
                  <Plus size={14} /> Thêm sản phẩm
                </button>
                <button
                  type="button"
                  className="dms-btn dms-btn-green"
                  onClick={handleSaveOrderChanges}
                  disabled={savingOrder}
                >
                  <Save size={14} /> {savingOrder ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  type="button"
                  className="dms-btn dms-btn-outline"
                  onClick={handleCancelEditOrder}
                  disabled={savingOrder}
                >
                  <X size={14} /> Huỷ sửa
                </button>
              </>
            )}

            {order.status === 'PENDING' && !isEditingOrder && (
              <>
                <button
                  type="button"
                  className="dms-btn dms-btn-navy"
                  onClick={handleConfirmAction}
                  disabled={actionLoading}
                >
                  <Check size={14} /> Duyệt & Xác nhận (FEFO)
                </button>
                <button
                  type="button"
                  className="dms-btn dms-btn-danger"
                  onClick={() => setCancelModalOpen(true)}
                  disabled={actionLoading}
                >
                  <Ban size={14} /> Huỷ đơn
                </button>
              </>
            )}

            {order.status === 'ALLOCATED' && (
              <>
                <button
                  type="button"
                  className="dms-btn dms-btn-navy"
                  onClick={() => setTripModalOpen(true)}
                  disabled={actionLoading}
                >
                  <Truck size={14} /> Gán chuyến xe
                </button>
                <button
                  type="button"
                  className="dms-btn dms-btn-danger"
                  onClick={() => setCancelModalOpen(true)}
                  disabled={actionLoading}
                >
                  <Ban size={14} /> Huỷ đơn
                </button>
              </>
            )}

            {order.status === 'SHIPPED' && (
              <button
                type="button"
                className="dms-btn dms-btn-green"
                onClick={() => setDeliveryModalOpen(true)}
                disabled={actionLoading}
              >
                <PackageCheck size={14} /> Xác nhận giao hàng
              </button>
            )}

            {order.status === 'DELIVERED' && (
              <button
                type="button"
                className="dms-btn dms-btn-green"
                onClick={handleCloseAction}
                disabled={actionLoading}
              >
                <CheckCircle2 size={14} /> Đối soát & Đóng đơn
              </button>
            )}

            <button
              type="button"
              className="dms-btn dms-btn-danger"
              onClick={() => navigate('/sales/sales-orders')}
            >
              Đóng
            </button>
          </>
        }
      >
        <div className="dms-doc-split-grid">
          {/* Left: Product Line Items & Summary (with Bằng chữ) */}
          <div className="so-doc-left-pane">
            <h4 className="dms-doc-subhead">
              Danh sách sản phẩm đặt hàng ({order.items.length} dòng)
            </h4>
            <div className="dms-ledger-table-wrap">
              <table className="dms-ledger-table">
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: '40px' }}>TT</th>
                    <th>Mã SP</th>
                    <th>Tên SP</th>
                    <th className="text-center">Đvt</th>
                    <th className="text-right">SL</th>
                    <th className="text-right">Đơn giá</th>
                    <th className="text-right">Thành tiền</th>
                    <th className="text-right">Chiết khấu</th>
                    <th>Lô FEFO & Tồn</th>
                    {isEditingOrder && <th className="text-center">Xoá</th>}
                  </tr>
                </thead>
                <tbody>
                  {(isEditingOrder ? editItems : order.items).map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className={`${item.isDeleted ? 'row-will-delete' : ''} ${item.isPromotion ? 'promo-row-highlight' : ''}`}
                    >
                      <td className="text-center">{idx + 1}</td>
                      <td>
                        <code>{item.productSku}</code>
                        {item.isNew && (
                          <span className="so-badge-new">Mới</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          <span style={item.isDeleted ? { textDecoration: 'line-through', color: '#dc2626' } : {}}>
                            {item.productName}
                          </span>
                        </div>
                        {item.isPromotion && (
                          <div className="so-inline-promo">
                            🎁 Hàng tặng 0đ{item.promotionName ? `: ${item.promotionName}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="text-center">{item.unit}</td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        {isEditingOrder ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min="0"
                              className={`edit-order-qty-input ${item.isDeleted ? 'deleted' : ''}`}
                              value={item.quantity}
                              onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                            />
                            {item.isDeleted && <span className="badge-will-delete">Xoá</span>}
                          </div>
                        ) : editingItemId === item.id ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min="0"
                              className="dms-input"
                              style={{ width: '64px', textAlign: 'right' }}
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="dms-btn dms-btn-green"
                              style={{ padding: '4px 6px' }}
                              onClick={() => handleSaveEditItem(item)}
                              disabled={savingItem}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              type="button"
                              className="dms-btn dms-btn-outline"
                              style={{ padding: '4px 6px' }}
                              onClick={handleCancelEditItem}
                              disabled={savingItem}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <span style={Number(item.quantity) === 0 ? { color: '#dc2626', textDecoration: 'line-through' } : {}}>
                            {item.quantity}
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        {item.isPromotion ? '0' : formatCurrency(item.unitPrice)}
                      </td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        {item.isPromotion ? '0' : formatCurrency(item.totalAmount)}
                      </td>
                      <td className="text-right" style={{ color: Number(item.discountAmount) > 0 ? '#7c3aed' : undefined }}>
                        {Number(item.discountAmount) > 0 ? formatCurrency(item.discountAmount) : '0'}
                      </td>
                      <td>
                        {isEditingOrder ? (
                          <span className="so-muted-italic">Tự phân bổ lại khi lưu</span>
                        ) : (
                          <div className="so-lot-stack">
                            {item.allocations && item.allocations.length > 0 ? (
                              item.allocations.map((a) => (
                                <span key={a.id} className="lot-badge">
                                  {a.lotNumber} ({a.quantity})
                                  {a.expiryDate && ` · ${new Date(a.expiryDate).toLocaleDateString('vi-VN')}`}
                                </span>
                              ))
                            ) : (
                              <span className="so-muted-italic">
                                {order.status === 'PENDING' ? 'FEFO khi duyệt' : 'Chưa phân bổ'}
                              </span>
                            )}
                            <span className={`item-stock-tag ${item.isShortage ? 'shortage' : 'enough'}`}>
                              {item.isShortage ? `Thiếu (${item.availableStock})` : `Đủ (${item.availableStock})`}
                            </span>
                          </div>
                        )}
                      </td>
                      {isEditingOrder && (
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-remove-row-item"
                            onClick={() => handleItemRemove(idx)}
                            title={item.isDeleted ? 'Đã đánh dấu xoá' : 'Xoá sản phẩm'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="text-right" style={{ color: '#0f172a' }}>
                      Tổng cộng (1):
                    </td>
                    <td className="text-right" style={{ color: '#0f172a' }}>
                      {formatCurrency(order.totalAmount)} đ
                    </td>
                    <td className="text-right" style={{ color: '#7c3aed' }}>
                      {formatCurrency(order.totalDiscountAmount || 0)} đ
                    </td>
                    <td colSpan={isEditingOrder ? 2 : 1} />
                  </tr>
                  <tr>
                    <td colSpan={6} className="text-right" style={{ color: '#152b44' }}>
                      Phải thanh toán = (1) - Chiết khấu:
                    </td>
                    <td colSpan={2} className="text-right" style={{ fontSize: '14px', color: '#b91c1c' }}>
                      {formatCurrency(finalPayableAmount)} đ
                    </td>
                    <td colSpan={isEditingOrder ? 2 : 1} />
                  </tr>
                  <tr>
                    <td colSpan={isEditingOrder ? 10 : 9} className="so-words-row">
                      <span>Bằng chữ:</span>{' '}
                      <em>{numberToVietnameseWords(finalPayableAmount)}</em>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Right: Promotions & Delivery Map */}
          <div className="so-doc-right-pane">
            <h4 className="dms-doc-subhead">
              Danh sách chương trình KM nhận được ({promoBenefits.length})
            </h4>
            <div className="dms-ledger-table-wrap" style={{ marginBottom: 14 }}>
              <table className="dms-ledger-table">
                <thead>
                  <tr>
                    <th>Tên chương trình / Cơ chế</th>
                    <th>Sản phẩm KM</th>
                    <th className="text-right">SL / Giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  {promoBenefits.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center" style={{ color: '#64748b', padding: '16px' }}>
                        Đơn hàng không áp dụng chương trình khuyến mãi
                      </td>
                    </tr>
                  ) : (
                    promoBenefits.map((pb, pIdx) => (
                      <tr key={pb.id || pIdx}>
                        <td>{pb.promotionName || (pb.isPromotion ? 'Tặng hàng FOC (0đ)' : 'Chiết khấu dòng hàng')}</td>
                        <td>{pb.productName}</td>
                        <td className="text-right" style={{ fontWeight: 600 }}>
                          {pb.isPromotion
                            ? `${pb.quantity} ${pb.unit || ''}`
                            : `-${formatCurrency(pb.discountAmount)} đ`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h4 className="dms-doc-subhead">Vị trí giao hàng & Điều phối</h4>
            <div className="so-map-card">
              <MiniDeliveryMap
                lat={order.retailerLatitude}
                lng={order.retailerLongitude}
                retailerName={order.retailerName}
                address={order.retailerAddress}
                phone={order.retailerPhone}
              />
              <div className="so-map-actions">
                {order.deliveryTrip ? (
                  <button
                    type="button"
                    className="dms-btn dms-btn-steel"
                    style={{ width: '100%' }}
                    onClick={() => setIsDispatchConsoleOpen(true)}
                  >
                    <SlidersHorizontal size={14} /> Mở bàn điều phối & bốc xếp xe
                  </button>
                ) : (
                  order.status === 'ALLOCATED' && (
                    <button
                      type="button"
                      className="dms-btn dms-btn-steel"
                      style={{ width: '100%' }}
                      onClick={() => setTripModalOpen(true)}
                    >
                      <Truck size={14} /> Điều phối / Gán chuyến xe
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </DmsDocumentShell>

      {/* Modal Thêm sản phẩm khi chỉnh sửa */}
      {showAddProductModal && (
        <div className="modal-backdrop-trip" onClick={() => setShowAddProductModal(false)}>
          <div className="modal-trip-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-trip-header">
              <div className="modal-trip-header-title">
                <Plus size={20} color="#2563eb" />
                <h3>Thêm sản phẩm vào đơn hàng</h3>
              </div>
              <button type="button" className="btn-close-trip-modal" onClick={() => setShowAddProductModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-trip-body" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Chọn sản phẩm <span style={{ color: 'red' }}>*</span>
                </label>
                <select 
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} - {formatCurrency(p.basePrice || p.price)} đ ({p.unit || 'Thu'})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Số lượng đặt <span style={{ color: 'red' }}>*</span>
                </label>
                <input 
                  type="number"
                  min="1"
                  value={addProductQty}
                  onChange={(e) => setAddProductQty(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button 
                type="button" 
                onClick={() => setShowAddProductModal(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                Huỷ
              </button>
              <button 
                type="button" 
                onClick={handleAddProduct}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Thêm vào đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status History Timeline (Audit Trail) */}
      <div id="order-history" className="detail-table-card">
        <div className="card-title-bar">
          <h3>Lịch sử chuyển trạng thái (Audit Trail)</h3>
        </div>
        <div className="timeline-container">
          {order.statusHistory.map((h, i) => (
            <div key={h.id} className="timeline-step">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-status">
                    {STATUS_LABELS[h.toStatus] || h.toStatus}
                  </span>
                  <span className="timeline-time">
                    <Clock size={12} /> {new Date(h.changedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="timeline-user">
                  Thực hiện bởi: <strong>{h.changedBy}</strong>
                </div>
                {h.reason && (
                  <div className="timeline-reason">
                    <strong>Lý do:</strong> {h.reason}
                  </div>
                )}
                {h.notes && (
                  <div className="timeline-notes">
                    {h.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Huỷ đơn */}
      {cancelModalOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Huỷ đơn hàng {order.orderCode}</h3>
              <button className="btn-close" onClick={() => { setCancelModalOpen(false); setCancelError(''); }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {cancelError && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <AlertCircle size={16} />
                  <span>{cancelError}</span>
                </div>
              )}
              <p className="modal-desc">
                {order.status === 'ALLOCATED' 
                  ? 'Đơn hàng đang ở trạng thái Chờ giao (đã giữ chỗ lô). Khi huỷ đơn, tồn kho giữ chỗ sẽ tự động được hoàn trả về kho.' 
                  : 'Vui lòng nhập lý do huỷ đơn hàng:'}
              </p>
              <div className="form-group">
                <label>Lý do huỷ <span style={{ color: 'red' }}>*</span></label>
                <textarea 
                  rows="3"
                  className="modal-textarea"
                  style={cancelError ? { borderColor: '#ef4444', background: '#fff5f5' } : {}}
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelError) setCancelError('');
                  }}
                  placeholder="Nhập lý do huỷ đơn..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setCancelModalOpen(false); setCancelError(''); }}>
                Đóng
              </button>
              <button className="btn-danger" onClick={handleCancelSubmit} disabled={actionLoading}>
                <Ban size={15} /> Xác nhận Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gán xe */}
      {tripModalOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Gán chuyến xe giao hàng</h3>
              <button className="btn-close" onClick={() => setTripModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Chọn chuyến xe có sẵn <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="modal-select"
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                >
                  <option value="">-- Chọn chuyến xe --</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.tripCode}] - Tài xế: {t.driverName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="trip-create-inline-box">
                <span>Hoặc khởi tạo chuyến xe mới và xếp đơn này lên xe ngay:</span>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setTripModalOpen(false);
                    setIsCreateTripModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Tạo chuyến xe mới cho đơn này
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setTripModalOpen(false)}>
                Đóng
              </button>
              <button className="btn-primary" onClick={handleTripSubmit} disabled={actionLoading}>
                <Truck size={15} /> Xác nhận Gán xe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Giao hàng */}
      {deliveryModalOpen && (
        <div className="modal-overlay">
          <div className="action-modal-container">
            <div className="modal-header">
              <h3>Xác nhận giao hàng</h3>
              <button className="btn-close" onClick={() => setDeliveryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group radio-group">
                <label>
                  <input 
                    type="radio" 
                    name="deliv" 
                    checked={deliverySuccess} 
                    onChange={() => setDeliverySuccess(true)}
                  /> Giao thành công (Xuất kho vật lý)
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="deliv" 
                    checked={!deliverySuccess} 
                    onChange={() => setDeliverySuccess(false)}
                  /> Giao thất bại (Quay về Chờ giao)
                </label>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input 
                  type="text"
                  className="modal-input"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Ghi chú người nhận hoặc nguyên nhân giao thất bại..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeliveryModalOpen(false)}>
                Đóng
              </button>
              <button className="btn-primary" onClick={handleDeliverySubmit} disabled={actionLoading}>
                <CheckCircle2 size={15} /> Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* KHUNG IN PHIẾU BÁN HÀNG CHUẨN A4 (CHỈ HIỂN THỊ KHI IN) */}
      {/* ============================================================ */}
      <div className="printable-order-sheet">
        <div className="print-header">
          <div className="print-company-info">
            <h2 className="company-name">HỆ THỐNG PHÂN PHỐI DMS - TRADE LEDGER</h2>
            <p>Địa chỉ kho: {order.warehouseName || 'Kho chính'}</p>
            <p>Hotline: 1900-0000 | Email: support@tradeledger.dms</p>
          </div>
          <div className="print-order-badge">
            <h1 className="print-title">PHIẾU BÁN HÀNG & GIAO HÀNG</h1>
            <p className="print-code">Mã đơn: <strong>{order.orderCode}</strong></p>
            <p className="print-date">Ngày tạo: {new Date(order.createdAt).toLocaleDateString('vi-VN')} {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="print-divider"></div>

        <div className="print-meta-grid">
          <div className="print-meta-col">
            <p><strong>Khách hàng / Đại lý:</strong> {order.retailerName} ({order.retailerCode})</p>
            <p><strong>Người liên hệ:</strong> {order.retailerPhone || 'N/A'}</p>
            <p><strong>Địa chỉ giao:</strong> {order.retailerAddress || 'Tại kho'}</p>
          </div>
          <div className="print-meta-col">
            <p><strong>Hình thức đơn:</strong> {order.orderType === 'IMMEDIATE' ? 'Giao ngay' : 'Giao sau'}</p>
            <p><strong>Chuyến xe:</strong> {order.deliveryTrip?.tripCode || 'Chưa gán xe'}</p>
            <p><strong>Tài xế/NVGH:</strong> {order.deliveryTrip?.driverName || 'N/A'}</p>
            <p><strong>Trạng thái đơn:</strong> {STATUS_LABELS[order.status] || order.status}</p>
          </div>
        </div>

        <table className="print-items-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
              <th style={{ width: '100px' }}>Mã SKU</th>
              <th>Tên sản phẩm</th>
              <th style={{ width: '60px', textAlign: 'center' }}>ĐVT</th>
              <th style={{ width: '80px', textAlign: 'right' }}>Số lượng</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Đơn giá</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).filter(item => !item.isDeleted && Number(item.quantity) > 0).map((item, idx) => (
              <tr key={item.id || idx} style={item.isPromotion ? { backgroundColor: '#f0fdf4' } : {}}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td><code>{item.productSku}</code></td>
                <td>
                  <strong>{item.productName}</strong>
                  {item.isPromotion && (
                    <span style={{ color: '#15803d', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>
                      [🎁 Hàng tặng 0đ{item.promotionName ? ` - ${item.promotionName}` : ''}]
                    </span>
                  )}
                  {Number(item.discountAmount) > 0 && (
                    <span style={{ color: '#7c3aed', fontSize: '11px', marginLeft: '6px', fontWeight: 600 }}>
                      [🏷️ Giảm: -{formatCurrency(item.discountAmount)} đ]
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>{item.unit}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>
                  {item.isPromotion ? '0 đ' : `${formatCurrency(item.unitPrice)} đ`}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {item.isPromotion ? '0 đ' : `${formatCurrency(Number(item.quantity) * Number(item.unitPrice))} đ`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>Tổng số lượng:</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                {(order.items || []).filter(i => !i.isDeleted).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>Tiền hàng:</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: '#000' }}>
                {formatCurrency(order.totalAmount)} đ
              </td>
            </tr>
            {Number(order.totalDiscountAmount) > 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>
                  Chiết khấu bậc thang:
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: '#7c3aed' }}>
                  -{formatCurrency(order.totalDiscountAmount)} đ
                </td>
              </tr>
            )}
            <tr>
              <td colSpan="6" style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                Tổng thanh toán:
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px', color: '#000' }}>
                {formatCurrency(order.finalAmount != null ? order.finalAmount : (order.totalAmount - (order.totalDiscountAmount || 0)))} đ
              </td>
            </tr>
          </tfoot>
        </table>

        {order.notes && (
          <div className="print-notes">
            <strong>Ghi chú đơn hàng:</strong> {order.notes}
          </div>
        )}

        <div className="print-signatures">
          <div className="sig-block">
            <p className="sig-title">Người lập phiếu</p>
            <p className="sig-sub">(Ký, ghi rõ họ tên)</p>
            <div className="sig-space"></div>
          </div>
          <div className="sig-block">
            <p className="sig-title">Thủ kho xuất</p>
            <p className="sig-sub">(Ký, ghi rõ họ tên)</p>
            <div className="sig-space"></div>
          </div>
          <div className="sig-block">
            <p className="sig-title">Nhân viên giao nhận</p>
            <p className="sig-sub">(Ký, ghi rõ họ tên)</p>
            <div className="sig-space"></div>
          </div>
          <div className="sig-block">
            <p className="sig-title">Người nhận hàng</p>
            <p className="sig-sub">(Ký, ghi rõ họ tên)</p>
            <div className="sig-space"></div>
          </div>
        </div>

        <div className="print-footer">
          <p>Chứng từ in tự động từ Hệ thống DMS-TradeLedger - Ngày in: {new Date().toLocaleString('vi-VN')}</p>
        </div>
      </div>

      {/* Modal Bàn Điều Phối Chuyến Xe trực tiếp trong Chi tiết đơn */}
      {isDispatchConsoleOpen && order.deliveryTrip?.id && (
        <TripDispatchConsoleModal
          tripId={order.deliveryTrip.id}
          isOpen={isDispatchConsoleOpen}
          onClose={() => {
            setIsDispatchConsoleOpen(false);
            loadOrderDetail();
          }}
          onRefreshList={loadOrderDetail}
        />
      )}

      {/* Modal Tạo Chuyến Xe Mới trực tiếp từ Chi tiết đơn */}
      {isCreateTripModalOpen && (
        <CreateTripModal
          isOpen={isCreateTripModalOpen}
          onClose={() => setIsCreateTripModalOpen(false)}
          onSuccess={loadOrderDetail}
          initialOrderIds={[order.id]}
        />
      )}

      {/* Modal In Phiếu Giao Nhận RPT004 từ Chi tiết đơn */}
      {isRpt004PrintOpen && order.deliveryTrip?.id && (
        <TripReportPrintModal
          isOpen={isRpt004PrintOpen}
          onClose={() => setIsRpt004PrintOpen(false)}
          reportType="rpt004"
          tripId={order.deliveryTrip.id}
          initialOrder={{ id: order.id }}
        />
      )}
    </div>
  );
};

export default SalesOrderDetail;
