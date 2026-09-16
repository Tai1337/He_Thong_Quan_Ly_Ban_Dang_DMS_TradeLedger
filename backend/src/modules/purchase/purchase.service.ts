import { Injectable, NotFoundException } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseReceivingService } from './purchase-receiving.service';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly purchaseReceivingService: PurchaseReceivingService,
  ) {}

  // --- Purchase Orders (PO) ---
  async getPurchaseOrders(distributorId: any, filters: any) {
    return this.purchaseOrderService.getPurchaseOrders(distributorId, filters);
  }

  async getPurchaseOrderById(id: string, distributorId: any) {
    const order = await this.purchaseOrderService.getPurchaseOrderById(id, distributorId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn đặt hàng mua');
    }
    return order;
  }

  async createPurchaseOrder(payload: any) {
    return this.purchaseOrderService.createPurchaseOrder(payload);
  }

  async updatePurchaseOrder(id: string, payload: any) {
    return this.purchaseOrderService.updatePurchaseOrder(id, payload);
  }

  async sendPurchaseOrder(id: string, payload: any) {
    return this.purchaseOrderService.sendPurchaseOrderToSupplier(id, payload);
  }

  async cancelPurchaseOrder(id: string, payload: any) {
    return this.purchaseOrderService.cancelPurchaseOrder(id, payload);
  }

  async receiveGoods(id: string, payload: any) {
    return this.purchaseOrderService.receiveGoods(id, payload);
  }

  async closePartialPurchaseOrder(id: string, payload: any) {
    return this.purchaseOrderService.closePartialPurchaseOrder(id, payload);
  }

  async getDiscrepancies(distributorId: any, filters: any) {
    return this.purchaseOrderService.getPurchaseOrderDiscrepancies(distributorId, filters);
  }

  async exportExcel(distributorId: any, filters: any) {
    return this.purchaseOrderService.exportPurchaseOrdersExcel(distributorId, filters);
  }

  // --- Purchase Receiving (Nhập hàng về) ---
  async getInboundDeliveryTrips(distributorId: any, filters: any) {
    return this.purchaseReceivingService.getInboundDeliveryTrips(distributorId, filters);
  }

  async getInboundTripDetail(tripId: string, distributorId: any) {
    const trip = await this.purchaseReceivingService.getInboundTripDetail(tripId, distributorId);
    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe hàng về');
    }
    return trip;
  }

  async receiveTripGoods(payload: any) {
    return this.purchaseReceivingService.receiveTripGoods(payload);
  }
}
