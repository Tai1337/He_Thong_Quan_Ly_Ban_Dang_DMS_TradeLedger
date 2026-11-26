import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getWarehouses,
  getSuppliers,
  getReplenishmentSuggestions,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
} from '../services/api';

const getDefaultExpectedDate = (offsetDays = 3) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const usePurchaseOrderForm = ({ orderId = null, duplicateFromId = null }) => {
  const isEditMode = Boolean(orderId);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);

  const [editingOrder, setEditingOrder] = useState(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState(() => getDefaultExpectedDate(3));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [highlightedProductId, setHighlightedProductId] = useState(null);

  // Nap danh muc kho, NCC va don PO (neu edit hoac nhan ban)
  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      setLoadingMaster(true);
      setError('');
      try {
        const [whRes, supRes] = await Promise.all([
          getWarehouses(1),
          getSuppliers(),
        ]);

        if (!isMounted) return;
        const activeWarehouses = whRes || [];
        const activeSuppliers = supRes || [];
        setWarehouses(activeWarehouses);
        setSuppliers(activeSuppliers);

        const sourcePoId = orderId || duplicateFromId;
        if (sourcePoId) {
          const po = await getPurchaseOrderById(sourcePoId, 1);
          if (!isMounted) return;

          if (orderId) {
            setEditingOrder(po);
            if (po.status !== 'DRAFT') {
              setError(`Đơn hàng ${po.poCode} đang ở trạng thái "${po.status}", chỉ cho phép chỉnh sửa khi còn Nháp (DRAFT).`);
            }
          }

          setWarehouseId(po.warehouseId ? String(po.warehouseId) : (activeWarehouses[0]?.id ? String(activeWarehouses[0].id) : ''));
          setSupplierId(po.supplierId ? String(po.supplierId) : '');
          setExpectedDate(
            orderId && po.expectedDate
              ? po.expectedDate.slice(0, 10)
              : getDefaultExpectedDate(3),
          );
          setNotes(
            orderId
              ? (po.notes || '')
              : `Nhân bản từ đơn ${po.poCode}${po.notes ? ` — ${po.notes}` : ''}`,
          );
          setItems(
            (po.items || []).map((it) => ({
              productId: String(it.productId),
              sku: it.product?.sku || '',
              name: it.product?.name || '',
              unit: it.product?.unit || 'THÙNG',
              retailUnit: it.product?.retailUnit || '',
              conversionRate: Number(it.product?.conversionRate || 1),
              weightKg: Number(it.product?.weightKg || 10),
              basePrice: Number(it.product?.basePrice || it.unitPrice || 0),
              quantity: Number(it.quantity || 1),
              unitPrice: Number(it.unitPrice || 0),
            })),
          );
        } else {
          const defaultWh = activeWarehouses.find((w) => w.type === 'SALES') || activeWarehouses[0];
          setWarehouseId(defaultWh?.id ? String(defaultWh.id) : '');
          setSupplierId(activeSuppliers[0]?.id ? String(activeSuppliers[0].id) : '');
          setExpectedDate(getDefaultExpectedDate(3));
          setNotes('');
          setItems([]);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Lỗi khi tải dữ liệu lập đơn đặt hàng');
      } finally {
        if (isMounted) setLoadingMaster(false);
      }
    };

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [orderId, duplicateFromId]);

  // Nap ton kho thuc te theo Kho nhan hang đang chon
  useEffect(() => {
    if (!warehouseId) return;
    let isMounted = true;

    const loadStock = async () => {
      setLoadingStock(true);
      try {
        const res = await getReplenishmentSuggestions(warehouseId, 1);
        if (!isMounted) return;
        setCatalogProducts(res?.products || []);
      } catch (err) {
        console.error('Lỗi tải tồn kho gợi ý:', err);
      } finally {
        if (isMounted) setLoadingStock(false);
      }
    };

    loadStock();
    return () => {
      isMounted = false;
    };
  }, [warehouseId]);

  // Map tra cuu nhanh thong tin + ton kho moi nhat theo productId
  const productMap = useMemo(() => {
    const map = new Map();
    catalogProducts.forEach((p) => {
      map.set(String(p.id), p);
    });
    return map;
  }, [catalogProducts]);

  // Ghep du lieu ton kho thuc te vao tung dong items dang chon
  const enrichedItems = useMemo(() => {
    return items.map((line) => {
      const cat = productMap.get(String(line.productId));
      return {
        ...line,
        sku: cat?.sku || line.sku,
        name: cat?.name || line.name,
        unit: cat?.unit || line.unit,
        retailUnit: cat?.retailUnit ?? line.retailUnit,
        conversionRate: cat?.conversionRate ?? line.conversionRate ?? 1,
        weightKg: cat?.weightKg ?? line.weightKg ?? 10,
        basePrice: cat?.basePrice ?? line.basePrice ?? 0,
        imageUrl: cat?.imageUrl || null,
        onHand: cat?.onHand ?? 0,
        reserved: cat?.reserved ?? 0,
        available: cat?.available ?? 0,
      };
    });
  }, [items, productMap]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => String(s.id) === String(supplierId)) || null,
    [suppliers, supplierId],
  );

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => String(w.id) === String(warehouseId)) || null,
    [warehouses, warehouseId],
  );

  // Them 1 san pham vao bang (neu trung SKU thi tu dong cong don so luong)
  const addProductLine = useCallback((product, addQty = 10) => {
    if (!product) return { merged: false };
    const pid = String(product.id);
    const qtyToAdd = Math.max(1, Number(addQty) || 1);
    let wasMerged = false;

    setItems((prev) => {
      const idx = prev.findIndex((i) => String(i.productId) === pid);
      if (idx >= 0) {
        wasMerged = true;
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          quantity: Number(copy[idx].quantity || 0) + qtyToAdd,
        };
        return copy;
      }
      return [
        ...prev,
        {
          productId: pid,
          sku: product.sku || '',
          name: product.name || '',
          unit: product.unit || 'THÙNG',
          retailUnit: product.retailUnit || '',
          conversionRate: Number(product.conversionRate || 1),
          weightKg: Number(product.weightKg || 10),
          basePrice: Number(product.basePrice || 0),
          quantity: qtyToAdd,
          unitPrice: Number(product.basePrice || 0),
        },
      ];
    });

    setHighlightedProductId(pid);
    setTimeout(() => setHighlightedProductId((curr) => (curr === pid ? null : curr)), 1400);
    return { merged: wasMerged };
  }, []);

  // Them hang loat tu goi y nhap bu ton kho
  const addBulkReplenishment = useCallback((selectedLines) => {
    if (!Array.isArray(selectedLines) || selectedLines.length === 0) return;

    setItems((prev) => {
      const next = [...prev];
      selectedLines.forEach(({ product, quantity }) => {
        const pid = String(product.id);
        const qty = Math.max(1, Number(quantity) || 1);
        const existingIdx = next.findIndex((i) => String(i.productId) === pid);
        if (existingIdx >= 0) {
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: Number(next[existingIdx].quantity || 0) + qty,
          };
        } else {
          next.push({
            productId: pid,
            sku: product.sku || '',
            name: product.name || '',
            unit: product.unit || 'THÙNG',
            retailUnit: product.retailUnit || '',
            conversionRate: Number(product.conversionRate || 1),
            weightKg: Number(product.weightKg || 10),
            basePrice: Number(product.basePrice || 0),
            quantity: qty,
            unitPrice: Number(product.basePrice || 0),
          });
        }
      });
      return next;
    });
  }, []);

  const updateLineField = useCallback((productId, field, value) => {
    const pid = String(productId);
    setItems((prev) =>
      prev.map((row) => (String(row.productId) === pid ? { ...row, [field]: value } : row)),
    );
  }, []);

  const removeLine = useCallback((productId) => {
    const pid = String(productId);
    setItems((prev) => prev.filter((row) => String(row.productId) !== pid));
  }, []);

  const setExpectedDateOffset = useCallback((days) => {
    setExpectedDate(getDefaultExpectedDate(days));
  }, []);

  // Tong hop chi so don hang
  const totals = useMemo(() => {
    const totalSku = enrichedItems.length;
    const totalQty = enrichedItems.reduce((sum, i) => sum + Math.max(0, Number(i.quantity) || 0), 0);
    const totalRetailQty = enrichedItems.reduce(
      (sum, i) => sum + Math.max(0, Number(i.quantity) || 0) * (Number(i.conversionRate) || 1),
      0,
    );
    const totalWeightKg = enrichedItems.reduce(
      (sum, i) => sum + Math.max(0, Number(i.quantity) || 0) * (Number(i.weightKg) || 10),
      0,
    );
    const totalAmount = enrichedItems.reduce(
      (sum, i) => sum + Math.max(0, Number(i.quantity) || 0) * Math.max(0, Number(i.unitPrice) || 0),
      0,
    );

    return {
      totalSku,
      totalQty,
      totalRetailQty,
      totalWeightKg: Math.round(totalWeightKg * 10) / 10,
      totalAmount,
    };
  }, [enrichedItems]);

  // Goi API luu hoac luu & gui NCC (atomic)
  const submitOrder = useCallback(
    async ({ submitImmediately = false }) => {
      setError('');

      if (isEditMode && editingOrder && editingOrder.status !== 'DRAFT') {
        const msg = 'Đơn hàng không còn ở trạng thái Nháp nên không thể chỉnh sửa.';
        setError(msg);
        throw new Error(msg);
      }

      if (!warehouseId) {
        const msg = 'Vui lòng chọn Kho nhận hàng.';
        setError(msg);
        throw new Error(msg);
      }

      if (submitImmediately && !supplierId) {
        const msg = 'Vui lòng chọn Nhà cung cấp trước khi gửi đơn đặt hàng.';
        setError(msg);
        throw new Error(msg);
      }

      if (items.length === 0) {
        const msg = 'Đơn hàng phải có ít nhất 1 mặt hàng.';
        setError(msg);
        throw new Error(msg);
      }

      for (const row of items) {
        if (!row.quantity || Number(row.quantity) <= 0) {
          const msg = `Sản phẩm [${row.sku}] phải có số lượng đặt > 0.`;
          setError(msg);
          throw new Error(msg);
        }
        if (Number(row.unitPrice) < 0) {
          const msg = `Sản phẩm [${row.sku}] có đơn giá không hợp lệ.`;
          setError(msg);
          throw new Error(msg);
        }
      }

      setSubmitting(true);
      try {
        const payload = {
          distributorId: 1,
          warehouseId: Number(warehouseId),
          supplierId: supplierId ? Number(supplierId) : null,
          expectedDate: expectedDate || null,
          notes: notes.trim() || null,
          submitImmediately,
          items: items.map((i) => ({
            productId: Number(i.productId),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice || 0),
          })),
        };

        const result = isEditMode
          ? await updatePurchaseOrder(orderId, payload)
          : await createPurchaseOrder(payload);

        return result;
      } catch (err) {
        setError(err.message || 'Lỗi khi lưu đơn đặt hàng mua');
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [isEditMode, editingOrder, warehouseId, supplierId, expectedDate, notes, items, orderId],
  );

  return {
    isEditMode,
    editingOrder,
    loadingMaster,
    loadingStock,
    submitting,
    error,
    setError,
    warehouses,
    suppliers,
    catalogProducts,
    warehouseId,
    setWarehouseId,
    supplierId,
    setSupplierId,
    expectedDate,
    setExpectedDate,
    setExpectedDateOffset,
    notes,
    setNotes,
    items: enrichedItems,
    highlightedProductId,
    selectedSupplier,
    selectedWarehouse,
    totals,
    addProductLine,
    addBulkReplenishment,
    updateLineField,
    removeLine,
    submitOrder,
  };
};
