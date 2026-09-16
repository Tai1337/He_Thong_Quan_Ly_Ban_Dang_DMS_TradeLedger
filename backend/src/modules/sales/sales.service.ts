import { Injectable, NotFoundException } from '@nestjs/common';
import { SalesOrderService as SalesOrderBusinessService } from './sales-order.service';

@Injectable()
export class SalesService {
  constructor(private readonly salesOrderBusinessService: SalesOrderBusinessService) {}

  async getSalesOrdersWithKPIs(distributorId: any, query: any) {
    return this.salesOrderBusinessService.getSalesOrdersWithKPIs(distributorId, query);
  }

  async getOrderDetail(id: string, distributorId: any) {
    const order = await this.salesOrderBusinessService.getOrderDetail(id, distributorId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }

  async createNewSalesOrder(body: any, distributorId: any, createdById: any) {
    return this.salesOrderBusinessService.createNewSalesOrder(body, distributorId, createdById);
  }

  async confirmOrder(id: string, distributorId: any, changedById: any) {
    return this.salesOrderBusinessService.confirmOrder(id, distributorId, changedById);
  }

  async bulkConfirmOrders(orderIds: any[], distributorId: any, userId: any) {
    return this.salesOrderBusinessService.bulkConfirmOrders(orderIds, distributorId, userId);
  }

  async cancelOrder(id: string, distributorId: any, userId: any, reason: string) {
    return this.salesOrderBusinessService.cancelOrder(id, distributorId, userId, reason);
  }

  async submitOrder(id: string, distributorId: any, userId: any) {
    return this.salesOrderBusinessService.submitOrder(id, distributorId, userId);
  }

  async assignDeliveryTrip(id: string, distributorId: any, tripId: any, userId: any) {
    return this.salesOrderBusinessService.assignDeliveryTrip(id, distributorId, tripId, userId);
  }

  async unassignDeliveryTrip(id: string, distributorId: any, userId: any, reason: string) {
    return this.salesOrderBusinessService.unassignDeliveryTrip(id, distributorId, userId, reason);
  }

  async confirmDelivery(id: string, distributorId: any, userId: any, isSuccess: boolean, note: string) {
    return this.salesOrderBusinessService.confirmDelivery(id, distributorId, userId, isSuccess, note);
  }

  async closeOrder(id: string, distributorId: any, userId: any) {
    return this.salesOrderBusinessService.closeOrder(id, distributorId, userId);
  }

  async updateOrderItemQuantity(
    id: string,
    itemId: string,
    finalQty: any,
    distributorId: any,
    userId: any,
    reason: string,
  ) {
    return this.salesOrderBusinessService.updateOrderItemQuantity(
      id,
      itemId,
      finalQty,
      distributorId,
      userId,
      reason,
    );
  }

  async addOrderItem(id: string, distributorId: any, userId: any, body: any) {
    return this.salesOrderBusinessService.addOrderItem(id, distributorId, userId, body);
  }

  async removeOrderItem(id: string, itemId: string, distributorId: any, userId: any) {
    return this.salesOrderBusinessService.removeOrderItem(id, itemId, distributorId, userId);
  }

  async getAvailableDeliveryTrips(distributorId: any, warehouseId: any) {
    return this.salesOrderBusinessService.getAvailableDeliveryTrips(distributorId, warehouseId);
  }

  async getSalesOrderMetadata(distributorId: any) {
    return this.salesOrderBusinessService.getSalesOrderMetadata(distributorId);
  }

  async getSalesAnalytics(distributorId: any, query: any) {
    return this.salesOrderBusinessService.getSalesAnalytics(distributorId, query);
  }
}

// Alias for backward compatibility if imported elsewhere
export { SalesService as SalesOrderService };
